import { getDB } from '../connection';
import type { Region } from '../../../shared/types';

export function getRegionTree(): Region[] {
  return getDB().prepare(
    'SELECT * FROM regions ORDER BY level, name'
  ).all() as Region[];
}

export function getRegionById(id: number): Region | undefined {
  return getDB().prepare('SELECT * FROM regions WHERE id = ?').get(id) as Region | undefined;
}

export function getChildren(parentId: number): Region[] {
  return getDB().prepare('SELECT * FROM regions WHERE parent_id = ? ORDER BY name').all(parentId) as Region[];
}

export function searchRegions(keyword: string): Region[] {
  return getDB().prepare(
    'SELECT * FROM regions WHERE name LIKE ? ORDER BY level, name'
  ).all(`%${keyword}%`) as Region[];
}

export function getRegionPath(regionId: number): Region[] {
  const path: Region[] = [];
  let current: Region | undefined = getRegionById(regionId);
  while (current) {
    path.unshift(current);
    current = current.parent_id ? getRegionById(current.parent_id) : undefined;
  }
  return path;
}

export function createRegion(region: Omit<Region, 'id'>): Region {
  const result = getDB().prepare(
    'INSERT INTO regions (name, level, parent_id, currency, unit_system, iso_code) VALUES (?,?,?,?,?,?)'
  ).run(region.name, region.level, region.parent_id, region.currency, region.unit_system, region.iso_code);
  return getRegionById(result.lastInsertRowid as number)!;
}
