import { getDB } from '../connection';
import type { DataSource } from '../../../shared/types';

export function getAllSources(): DataSource[] {
  return getDB().prepare('SELECT * FROM sources ORDER BY country, name').all() as DataSource[];
}

export function getActiveSources(): DataSource[] {
  return getDB().prepare('SELECT * FROM sources WHERE is_active = 1 ORDER BY country, name').all() as DataSource[];
}

export function updateSourceLastSync(sourceId: number, timestamp: string): void {
  getDB().prepare('UPDATE sources SET last_sync_at = ? WHERE id = ?').run(timestamp, sourceId);
}

export function toggleSource(sourceId: number, active: boolean): void {
  getDB().prepare('UPDATE sources SET is_active = ? WHERE id = ?').run(active ? 1 : 0, sourceId);
}
