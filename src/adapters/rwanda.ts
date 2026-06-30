/** Rwanda NISR PPI + Market Survey Adapter */
import { parseFileAdapter, type AdapterItem } from './generic-file';

const REGION_MAP: Record<string, number> = { '基加利': 21 };
const SOURCE_ID = 10;
const DATA_URL = '/rwanda_nisr_data.json';

export async function fetchRwandaData(): Promise<AdapterItem[]> {
  return parseFileAdapter(DATA_URL, REGION_MAP, SOURCE_ID, 'Rwanda NISR');
}
