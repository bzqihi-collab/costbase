/** SEIFSA Adapter — South Africa Steel & Engineering Price Indices */
import { parseFileAdapter, type AdapterItem } from './generic-file';

const REGION_MAP: Record<string, number> = {
  '约翰内斯堡': 7,
  '开普敦': 12,
  '德班': 13,
};
const SOURCE_ID = 5;
const DATA_URL = '/seifsa_data.json';

export async function fetchSeifsaData(): Promise<AdapterItem[]> {
  return parseFileAdapter(DATA_URL, REGION_MAP, SOURCE_ID, 'SEIFSA');
}
