/** Uganda UBOS Construction Input Price Index Adapter */
import { parseFileAdapter, type AdapterItem } from './generic-file';

const REGION_MAP: Record<string, number> = { '坎帕拉': 19 };
const SOURCE_ID = 9;
const DATA_URL = '/uganda_ubos_data.json';

export async function fetchUgandaData(): Promise<AdapterItem[]> {
  return parseFileAdapter(DATA_URL, REGION_MAP, SOURCE_ID, 'Uganda UBOS');
}
