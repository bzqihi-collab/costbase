/**
 * Stats SA Adapter — Construction Material Price Indices (P0151.1)
 *
 * Data source: Statistics South Africa P0151.1 — monthly CPAP work group indices
 * Published at: https://www.statssa.gov.za/publications/P01511/
 *
 * Since Stats SA publishes PDF reports (no structured API), this adapter reads
 * from a pre-extracted JSON file containing the latest published index data.
 * In production, this file would be updated monthly after downloading the new report.
 */

interface StatsSaItem {
  work_group: string;
  name: string;
  index: number;
  month_change: number;
  year_change: number;
}

interface StatsSaRegionData {
  region: string;
  notes?: string;
  items: StatsSaItem[];
}

interface StatsSaDataFile {
  source: string;
  source_url: string;
  report_date: string;
  base_period: string;
  notes: string;
  data: StatsSaRegionData[];
}

// Map region names to DB region IDs (must match seed data)
const REGION_NAME_TO_ID: Record<string, number> = {
  '约翰内斯堡': 7,
  '开普敦': 12,
  '德班': 13,
};

// Map CPAP work groups to our category taxonomy
function mapCategory(wg: string, name: string): { category: string; subcategory: string } {
  if (['110'].includes(wg)) return { category: 'material', subcategory: 'Concrete & Cement Products' };
  if (['114'].includes(wg)) return { category: 'material', subcategory: 'Reinforcing Steel' };
  if (['116'].includes(wg)) return { category: 'material', subcategory: 'Brick & Blockwork' };
  if (['124'].includes(wg)) return { category: 'material', subcategory: 'Metal Roofing & Cladding' };
  if (['126'].includes(wg)) return { category: 'material', subcategory: 'Carpentry & Joinery' };
  if (['129'].includes(wg)) return { category: 'material', subcategory: 'Ceilings & Partitions' };
  if (['148'].includes(wg)) return { category: 'material', subcategory: 'Plumbing' };
  if (['160'].includes(wg)) return { category: 'material', subcategory: 'Electrical Installations' };
  if (['180', '181'].includes(wg)) return { category: 'index', subcategory: 'Composite Building Cost Index' };
  return { category: 'index', subcategory: name };
}

export interface StatsSaParsedItem {
  region_id: number;
  category: string;
  subcategory: string;
  spec_code: string;
  spec_detail: string | null;
  unit: string;
  unit_price: number | null;
  price_min: number | null;
  price_max: number | null;
  data_year: number;
  data_quarter: number;
  source_id: number;
  building_type: string;
  notes: string | null;
}

const DATA_URL = '/stats_sa_data.json';

export async function fetchStatsSaData(): Promise<StatsSaParsedItem[]> {
  console.log('[StatsSA] Fetching from:', DATA_URL);
  const resp = await fetch(DATA_URL);
  if (!resp.ok) throw new Error(`Stats SA data file not found (${resp.status}). Please download the latest P0151.1 report.`);

  const json: StatsSaDataFile = await resp.json();
  console.log('[StatsSA] Report date:', json.report_date, '| Regions:', json.data.length);

  const items: StatsSaParsedItem[] = [];
  const reportDate = new Date(json.report_date);
  const year = reportDate.getFullYear();
  const quarter = Math.ceil((reportDate.getMonth() + 1) / 3);

  for (const regionData of json.data) {
    const regionId = REGION_NAME_TO_ID[regionData.region];
    if (!regionId) {
      console.warn(`[StatsSA] Unknown region: ${regionData.region}, skipping`);
      continue;
    }

    for (const item of regionData.items) {
      const { category, subcategory } = mapCategory(item.work_group, item.name);

      items.push({
        region_id: regionId,
        category,
        subcategory,
        spec_code: `CPAP-${item.work_group}`,
        spec_detail: item.name,
        unit: `index (${json.base_period})`,
        unit_price: item.index,
        price_min: null,
        price_max: null,
        data_year: year,
        data_quarter: quarter,
        source_id: 2, // Stats SA
        building_type: item.work_group === '181' ? 'commercial' : item.work_group === '180' ? 'residential' : 'all',
        notes: regionData.notes
          ? `Source: ${json.source}. ${regionData.notes}. MoM: ${item.month_change}%, YoY: ${item.year_change}%.`
          : `Source: ${json.source}. MoM: ${item.month_change}%, YoY: ${item.year_change}%.`,
      });
    }
  }

  console.log(`[StatsSA] Parsed ${items.length} items from ${json.data.length} regions`);
  return items;
}
