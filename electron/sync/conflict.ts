import { getDB } from '../db/connection';
import type { CostItem } from '../../shared/types';

type CostItemInput = Omit<CostItem, 'id' | 'created_at' | 'updated_at'>;

interface ConflictInfo {
  incoming: CostItemInput;
  existingId: number;
  isManualFix: boolean;
}

export function detectConflicts(
  sourceId: number,
  items: CostItemInput[]
): Map<string, ConflictInfo> {
  const db = getDB();
  const conflicts = new Map<string, ConflictInfo>();

  for (const item of items) {
    const existing = db.prepare(
      `SELECT * FROM cost_items
       WHERE source_id = ? AND region_id = ? AND category = ? AND subcategory = ?
       AND (spec_code = ? OR (spec_code IS NULL AND ? IS NULL))
       AND building_type = ? AND data_year = ? AND data_quarter = ?
       AND status = 'active'`
    ).get(
      sourceId, item.region_id, item.category, item.subcategory,
      item.spec_code, item.spec_code,
      item.building_type, item.data_year, item.data_quarter
    ) as CostItem | undefined;

    if (existing) {
      const key = `${item.region_id}|${item.category}|${item.subcategory}|${item.spec_code}|${item.data_year}Q${item.data_quarter}`;
      conflicts.set(key, {
        incoming: item,
        existingId: existing.id,
        isManualFix: existing.is_manual_fix === 1,
      });
    }
  }

  return conflicts;
}

export function resolveConflicts(
  _sourceId: number,
  items: CostItemInput[],
  conflicts: Map<string, ConflictInfo>
): { inserted: number; updated: number; skipped: number } {
  const db = getDB();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  const insertStmt = db.prepare(
    `INSERT INTO cost_items (region_id, category, subcategory, spec_code, spec_detail, unit, unit_price, price_min, price_max, building_type, data_year, data_quarter, source_id, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );

  const updateStmt = db.prepare(
    `UPDATE cost_items SET unit_price = ?, price_min = ?, price_max = ?, spec_detail = ?, unit = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`
  );

  for (const item of items) {
    const key = `${item.region_id}|${item.category}|${item.subcategory}|${item.spec_code}|${item.data_year}Q${item.data_quarter}`;
    const conflict = conflicts.get(key);

    if (conflict) {
      if (conflict.isManualFix) {
        skipped++;
        continue;
      } else {
        updateStmt.run(item.unit_price, item.price_min, item.price_max, item.spec_detail, item.unit, item.notes, conflict.existingId);
        updated++;
      }
    } else {
      insertStmt.run(item.region_id, item.category, item.subcategory, item.spec_code, item.spec_detail, item.unit, item.unit_price, item.price_min, item.price_max, item.building_type, item.data_year, item.data_quarter, item.source_id, item.notes);
      inserted++;
    }
  }

  return { inserted, updated, skipped };
}
