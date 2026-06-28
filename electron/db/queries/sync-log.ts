import { getDB } from '../connection';
import type { SyncLog } from '../../../shared/types';

export function getSyncLogs(sourceId?: number, limit = 50): SyncLog[] {
  if (sourceId) {
    return getDB().prepare(
      'SELECT * FROM sync_log WHERE source_id = ? ORDER BY started_at DESC LIMIT ?'
    ).all(sourceId, limit) as SyncLog[];
  }
  return getDB().prepare(
    'SELECT * FROM sync_log ORDER BY started_at DESC LIMIT ?'
  ).all(limit) as SyncLog[];
}

export function createSyncLog(sourceId: number): number {
  const result = getDB().prepare(
    "INSERT INTO sync_log (source_id, started_at, status) VALUES (?, datetime('now'), 'success')"
  ).run(sourceId);
  return result.lastInsertRowid as number;
}

export function finalizeSyncLog(
  logId: number, status: string, newRecs: number, updatedRecs: number,
  conflicts: number, errorMsg?: string
): void {
  getDB().prepare(
    `UPDATE sync_log SET finished_at = datetime('now'), status = ?, new_records = ?,
     updated_records = ?, conflicts = ?, error_message = ? WHERE id = ?`
  ).run(status, newRecs, updatedRecs, conflicts, errorMsg || null, logId);
}
