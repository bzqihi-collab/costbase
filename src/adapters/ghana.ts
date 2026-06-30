/** Ghana GSS Adapter — Prime Building Cost Index */
import { parseFileAdapter, type AdapterItem } from './generic-file';

const REGION_MAP: Record<string, number> = { '阿克拉': 15 };
const SOURCE_ID = 6;
const DATA_URL = '/ghana_gss_data.json';

export async function fetchGhanaData(): Promise<AdapterItem[]> {
  return parseFileAdapter(DATA_URL, REGION_MAP, SOURCE_ID, 'Ghana GSS');
}
