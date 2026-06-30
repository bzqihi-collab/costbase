/** Africa Road & Highway Construction Costs */
import { parseFileAdapter, type AdapterItem } from './generic-file';

const REGION_MAP: Record<string, number> = {
  '约翰内斯堡': 7, '内罗毕': 11, '开罗': 9, '阿克拉': 15,
  '拉各斯': 17, '坎帕拉': 19, '基加利': 21, '卢萨卡': 23,
};
const SOURCE_ID = 13;
const DATA_URL = '/road_costs_africa.json';

export async function fetchRoadCosts(): Promise<AdapterItem[]> {
  return parseFileAdapter(DATA_URL, REGION_MAP, SOURCE_ID, 'Road Costs Africa');
}
