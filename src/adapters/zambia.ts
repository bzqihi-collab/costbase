/** Zambia ZamStats + Market Survey Adapter */
import { parseFileAdapter, type AdapterItem } from './generic-file';

const REGION_MAP: Record<string, number> = { '卢萨卡': 23 };
const SOURCE_ID = 11;
const DATA_URL = '/zambia_zamstats_data.json';

export async function fetchZambiaData(): Promise<AdapterItem[]> {
  return parseFileAdapter(DATA_URL, REGION_MAP, SOURCE_ID, 'Zambia ZamStats');
}
