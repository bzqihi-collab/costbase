/** Africa Building & Infrastructure Cost Benchmarks */
import { parseFileAdapter, type AdapterItem } from './generic-file';

const REGION_MAP: Record<string, number> = {
  '约翰内斯堡': 7, '开普敦': 12, '德班': 13,
  '内罗毕': 11, '开罗': 9, '阿克拉': 15, '拉各斯': 17,
  '坎帕拉': 19, '基加利': 21, '卢萨卡': 23,
};
const SOURCE_ID = 12;
const DATA_URL = '/building_costs_africa.json';

export async function fetchBuildingCosts(): Promise<AdapterItem[]> {
  return parseFileAdapter(DATA_URL, REGION_MAP, SOURCE_ID, 'Building Costs Africa');
}
