/** KNBS Adapter — Kenya Construction Input Price Indices */
import { parseFileAdapter, type AdapterItem } from './generic-file';

const REGION_MAP: Record<string, number> = { '内罗毕': 11 };
const SOURCE_ID = 4;
const DATA_URL = '/knbs_data.json';

export async function fetchKnbsData(): Promise<AdapterItem[]> {
  return parseFileAdapter(DATA_URL, REGION_MAP, SOURCE_ID, 'KNBS');
}
