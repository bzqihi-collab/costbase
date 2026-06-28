import { getDB } from '../connection';
import type { CostItem, CostItemFilter, QueryResult } from '../../../shared/types';

export function queryCostItems(filter: CostItemFilter): QueryResult<CostItem> {
  const db = getDB();
  const conditions: string[] = ["ci.status = 'active'"];
  const params: unknown[] = [];

  if (filter.region_id) {
    conditions.push('ci.region_id = ?');
    params.push(filter.region_id);
  }
  if (filter.category) {
    conditions.push('ci.category = ?');
    params.push(filter.category);
  }
  if (filter.subcategory) {
    conditions.push('ci.subcategory LIKE ?');
    params.push(`%${filter.subcategory}%`);
  }
  if (filter.building_type) {
    conditions.push('(ci.building_type = ? OR ci.building_type = ?)');
    params.push(filter.building_type, 'all');
  }
  if (filter.data_year) {
    conditions.push('ci.data_year = ?');
    params.push(filter.data_year);
  }
  if (filter.data_quarter) {
    conditions.push('(ci.data_quarter = ? OR ci.data_quarter IS NULL)');
    params.push(filter.data_quarter);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = filter.page || 1;
  const pageSize = filter.page_size || 50;
  const offset = (page - 1) * pageSize;

  const countResult = db.prepare(
    `SELECT COUNT(*) as total FROM cost_items ci ${whereClause}`
  ).get(...params) as { total: number };

  const data = db.prepare(
    `SELECT ci.*, s.name as source_name
     FROM cost_items ci
     LEFT JOIN sources s ON ci.source_id = s.id
     ${whereClause}
     ORDER BY ci.subcategory, ci.spec_code
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset) as CostItem[];

  return { data, total: countResult.total, page, page_size: pageSize };
}

export function searchCostItems(keyword: string, limit = 50): CostItem[] {
  const db = getDB();
  return db.prepare(
    `SELECT ci.*, s.name as source_name
     FROM cost_items_fts fts
     JOIN cost_items ci ON fts.rowid = ci.id
     LEFT JOIN sources s ON ci.source_id = s.id
     WHERE cost_items_fts MATCH ? AND ci.status = 'active'
     ORDER BY rank
     LIMIT ?`
  ).all(keyword, limit) as CostItem[];
}

export function getDistinctYears(): number[] {
  return (getDB().prepare(
    "SELECT DISTINCT data_year FROM cost_items WHERE status = 'active' ORDER BY data_year DESC"
  ).all() as { data_year: number }[]).map((r) => r.data_year);
}

export function getComparisonData(regionIds: number[], category?: string, year?: number): any[] {
  const db = getDB();
  const conditions = [
    `ci.region_id IN (${regionIds.map(() => '?').join(',')})`,
    "ci.status = 'active'"
  ];
  const params: unknown[] = [...regionIds];

  if (category) { conditions.push('ci.category = ?'); params.push(category); }
  if (year) { conditions.push('ci.data_year = ?'); params.push(year); }

  return db.prepare(
    `SELECT ci.subcategory, ci.spec_code, ci.unit, ci.unit_price, ci.price_min, ci.price_max,
            r.currency, r.name as region_name
     FROM cost_items ci
     JOIN regions r ON ci.region_id = r.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ci.subcategory, ci.spec_code, r.name`
  ).all(...params) as any[];
}

export function updateCostItemPrice(id: number, unitPrice: number, priceMin: number, priceMax: number): void {
  getDB().prepare(
    `UPDATE cost_items SET unit_price = ?, price_min = ?, price_max = ?,
     is_manual_fix = 1, updated_at = datetime('now') WHERE id = ?`
  ).run(unitPrice, priceMin, priceMax, id);
}
