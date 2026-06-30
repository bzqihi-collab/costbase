/** Nigeria Market Adapter */
import { parseFileAdapter, type AdapterItem } from './generic-file';

const REGION_MAP: Record<string, number> = { '拉各斯': 17 };
const SOURCE_ID = 7;
const DATA_URL = '/nigeria_market_data.json';

export async function fetchNigeriaData(): Promise<AdapterItem[]> {
  return parseFileAdapter(DATA_URL, REGION_MAP, SOURCE_ID, 'Nigeria Market');
}
