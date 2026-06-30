/**
 * CAPMAS Adapter — Egypt Building Materials Prices
 * Data from pre-extracted JSON (source: CAPMAS monthly bulletins via eip.gov.eg)
 */
import { parseFileAdapter, type AdapterItem } from './generic-file';

const REGION_MAP: Record<string, number> = { '开罗': 9 };
const SOURCE_ID = 3;
const DATA_URL = '/capmas_data.json';

export async function fetchCapmasData(): Promise<AdapterItem[]> {
  return parseFileAdapter(DATA_URL, REGION_MAP, SOURCE_ID, 'CAPMAS');
}
