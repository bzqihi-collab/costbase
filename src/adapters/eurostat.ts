/**
 * Eurostat API Adapter — fetches real construction cost index data.
 *
 * Data source: sts_copi_a — Construction producer prices or costs, new residential buildings
 * API: https://ec.europa.eu/eurostat/databrowser/view/sts_copi_a
 *
 * Response format (JSON-stat-like via SDMX 2.1):
 *   dimension.geo.category.index  →  "DE": 16, "FR": 19, ...
 *   dimension.time.category.index →  "2020": 66, "2021": 67, ...
 *   dimension.unit.category.index →  "I21": 0 (index 2021=100)
 *   dimension.indic_bt.category.index → "PRC_PRR": 0, "COST": 1
 *   size = [freq, indic_bt, cpa, s_adj, unit, geo, time]
 *   value = { flat_index: number_value, ... }
 *
 * Flat index → dimension coords:
 *   time_idx   = flat_idx % size[6]
 *   geo_idx    = Math.floor(flat_idx / size[6]) % size[5]
 *   unit_idx   = Math.floor(flat_idx / (size[6]*size[5])) % size[4]
 *   indic_idx  = Math.floor(flat_idx / (size[6]*size[5]*size[4])) % size[1]
 */

const GEO_TO_REGION_ID: Record<string, number> = {
  DE: 1,
  // Add more as needed — for now only Germany is in our DB
};

interface DimCategory {
  label?: Record<string, string>;
  index?: Record<string, number>;
}

interface Dimension {
  label: string;
  category: DimCategory;
}

interface EurostatResponse {
  label: string;
  updated: string;
  value: Record<string, number | null>;
  status?: Record<string, string>;
  dimension: Record<string, Dimension>;
  id: string[];
  size: number[];
}

export interface EurostatItem {
  region_id: number;
  category: string;
  subcategory: string;
  spec_code: string;
  spec_detail: string | null;
  unit: string;
  unit_price: number;
  data_year: number;
  data_quarter: number;
  source_id: number;
  building_type: string;
  price_min: null;
  price_max: null;
  notes: string | null;
}

const API_URL = import.meta.env.DEV
  ? '/api/eurostat/data/sts_copi_a?format=JSON'
  : 'https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/sts_copi_a?format=JSON';

export async function fetchEurostatData(): Promise<EurostatItem[]> {
  console.log('[Eurostat] Fetching from:', API_URL);
  const resp = await fetch(API_URL);
  if (!resp.ok) throw new Error(`Eurostat API returned ${resp.status}`);

  const json: EurostatResponse = await resp.json();
  console.log('[Eurostat] Response received, dataset:', json.label, 'updated:', json.updated);

  const dims = json.dimension;
  const size = json.size;

  // Build reverse maps: dimension name → index → code
  function buildMap(dim: Dimension): Record<number, string> {
    const map: Record<number, string> = {};
    const idx = dim.category?.index;
    if (!idx) return map;
    for (const [code, pos] of Object.entries(idx)) {
      map[pos] = code;
    }
    return map;
  }

  const geoMap = buildMap(dims.geo);
  const timeMap = buildMap(dims.time);
  const unitMap = buildMap(dims.unit);
  const indicMap = buildMap(dims.indic_bt);

  console.log('[Eurostat] Geo codes:', Object.values(geoMap).filter(g => !g.includes('_') && g.length === 2).join(', '));

  const items: EurostatItem[] = [];
  let skipped = 0;

  for (const [flatIdx, value] of Object.entries(json.value)) {
    if (value === null) { skipped++; continue; }

    const idx = parseInt(flatIdx, 10);

    // Decode flat index into dimension positions
    // size = [freq, indic_bt, cpa, s_adj, unit, geo, time]
    const S6 = size[6]; // time
    const S5 = size[5]; // geo
    const S4 = size[4]; // unit
    const S1 = size[1]; // indic_bt

    const timePos = idx % S6;
    const geoPos = Math.floor(idx / S6) % S5;
    const unitPos = Math.floor(idx / (S6 * S5)) % S4;
    const indicPos = Math.floor(idx / (S6 * S5 * S4)) % S1;

    const geoCode = geoMap[geoPos];
    const timeCode = timeMap[timePos];
    const unitCode = unitMap[unitPos];
    const indicCode = indicMap[indicPos];

    if (!geoCode || !timeCode || !unitCode || !indicCode) { skipped++; continue; }

    // Only include country-level data (skip EU aggregates like EU27_2020, EA21)
    if (geoCode.includes('_') || geoCode.length !== 2) { skipped++; continue; }

    // Only map countries we have region IDs for
    const regionId = GEO_TO_REGION_ID[geoCode];
    if (!regionId) { skipped++; continue; }

    // Only use I21 unit (index 2021=100) for consistency
    if (unitCode !== 'I21') { skipped++; continue; }

    // Parse year from time code
    const year = parseInt(timeCode, 10);
    if (isNaN(year) || year < 2018) { skipped++; continue; }

    // Build labels
    const indicLabel = indicCode === 'PRC_PRR' ? 'Construction Producer Price Index'
      : indicCode === 'COST' ? 'Construction Cost Index'
      : indicCode;

    const geoName = geoCode; // Will be looked up from DB region

    items.push({
      region_id: regionId,
      category: 'index',
      subcategory: indicLabel,
      spec_code: indicCode,
      spec_detail: `${geoName} — ${timeCode}`,
      unit: 'index (2021=100)',
      unit_price: value,
      data_year: year,
      data_quarter: 0,
      source_id: 1,
      building_type: 'all',
      price_min: null,
      price_max: null,
      notes: `Source: Eurostat sts_copi_a. Country: ${geoCode}. Time: ${timeCode}. Unit: ${unitCode}.`,
    });
  }

  console.log(`[Eurostat] Parsed ${items.length} items (skipped: ${skipped})`);
  return items;
}
