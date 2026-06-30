/** Turner & Townsend Africa Cost Benchmarks */
import { parseFileAdapter, type AdapterItem } from './generic-file';

const REGION_MAP: Record<string, number> = {
  '约翰内斯堡': 7,
  '开普敦': 12,
  '拉各斯': 17,
  '内罗毕': 11,
};
const SOURCE_ID = 8;
const DATA_URL = '/turner_townsend_africa_data.json';

export async function fetchTurnerData(): Promise<AdapterItem[]> {
  return parseFileAdapter(DATA_URL, REGION_MAP, SOURCE_ID, 'Turner & Townsend');
}
