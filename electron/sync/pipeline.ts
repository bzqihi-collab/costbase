import { getDB } from '../db/connection';
import { costItemSchema } from '../../shared/schemas';
import type { BaseAdapter } from '../adapters/base';
import { detectConflicts, resolveConflicts } from './conflict';
import { createSyncLog, finalizeSyncLog } from '../db/queries/sync-log';
import { updateSourceLastSync } from '../db/queries/sources';

const BATCH_ID = () => `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export async function runSync(adapter: BaseAdapter): Promise<{
  newCount: number;
  updatedCount: number;
  conflictCount: number;
}> {
  const db = getDB();
  const batchId = BATCH_ID();
  const logId = createSyncLog(adapter.sourceId);

  try {
    // Step 1: Fetch from external source (via adapter)
    const { items, errors } = await adapter.fetch();
    if (errors.length > 0) {
      console.warn(`[Sync] ${adapter.name} fetch warnings:`, errors);
    }

    // Step 2: Stage raw data into cost_items_staging
    const insertStaging = db.prepare(
      'INSERT INTO cost_items_staging (batch_id, source_id, data_json) VALUES (?,?,?)'
    );
    const stageTx = db.transaction(() => {
      for (const item of items) {
        insertStaging.run(batchId, adapter.sourceId, JSON.stringify(item));
      }
    });
    stageTx();

    // Step 3: Validate each staged row against Zod schema
    const stagingRows = db.prepare(
      "SELECT * FROM cost_items_staging WHERE batch_id = ? AND validation_status = 'pending'"
    ).all(batchId) as any[];

    let validCount = 0;
    let invalidCount = 0;
    const validItems: typeof items = [];

    for (const row of stagingRows) {
      const parsed = JSON.parse(row.data_json);
      const result = costItemSchema.safeParse(parsed);
      if (result.success) {
        db.prepare("UPDATE cost_items_staging SET validation_status = 'valid' WHERE id = ?").run(row.id);
        validItems.push(result.data as typeof items[0]);
        validCount++;
      } else {
        const errStr = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        db.prepare("UPDATE cost_items_staging SET validation_status = 'invalid', validation_errors = ? WHERE id = ?").run(errStr, row.id);
        invalidCount++;
      }
    }

    // Step 4: Detect conflicts with existing data
    const conflicts = detectConflicts(adapter.sourceId, validItems);

    // Step 5: Merge — insert new, update unchanged, skip manual-fix
    const { inserted, updated, skipped } = resolveConflicts(adapter.sourceId, validItems, conflicts);

    // Step 6: Rebuild FTS5 index
    db.exec("INSERT INTO cost_items_fts(cost_items_fts) VALUES('rebuild')");

    // Step 7: Finalize sync log
    finalizeSyncLog(logId, errors.length > 0 ? 'partial' : 'success', inserted, updated, skipped);
    updateSourceLastSync(adapter.sourceId, new Date().toISOString());

    return { newCount: inserted, updatedCount: updated, conflictCount: skipped };
  } catch (e: any) {
    finalizeSyncLog(logId, 'failed', 0, 0, 0, e.message);
    throw e;
  }
}
