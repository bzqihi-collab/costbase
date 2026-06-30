/**
 * Generic file-based adapter for government statistics published as structured JSON extracts.
 *
 * Many national statistics offices publish PDF reports, not APIs.
 * This adapter reads from pre-extracted JSON files containing the latest data.
 * In production, these files are updated after each new publication.
 */

export interface AdapterItem {
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

interface RawItem {
  material?: string;
  spec: string;
  unit: string;
  price: number;
  min?: number;
  max?: number;
  category?: string;
  ytd_change_pct?: number;
  yoy_pct?: number;
  qoq_change_pct?: number;
  month_change_pct?: number;
  notes?: string;
}

interface RawRegion {
  region: string;
  notes?: string;
  items: RawItem[];
}

interface RawDataFile {
  source: string;
  source_url: string;
  report_date: string;
  report_title?: string;
  notes?: string;
  data: RawRegion[];
}

export async function parseFileAdapter(
  url: string,
  regionMap: Record<string, number>,
  sourceId: number,
  label: string
): Promise<AdapterItem[]> {
  console.log(`[${label}] Fetching from:`, url);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${label} data file not found (${resp.status})`);

  const json: RawDataFile = await resp.json();
  console.log(`[${label}] Report:`, json.report_title || json.source, '| Regions:', json.data.length);

  const items: AdapterItem[] = [];
  const reportDate = new Date(json.report_date);
  const year = reportDate.getFullYear();
  const quarter = Math.ceil((reportDate.getMonth() + 1) / 3);

  for (const regionData of json.data) {
    const regionId = regionMap[regionData.region];
    if (!regionId) {
      console.warn(`[${label}] Unknown region: ${regionData.region}, skipping`);
      continue;
    }

    for (const item of regionData.items) {
      const subcategory = item.material || item.spec;

      // Determine category: explicit field first, then auto-detect
      let category = item.category || 'material';
      if (!item.category) {
        if (subcategory.toLowerCase().includes('labor') || subcategory.includes('工')) category = 'labor';
        else if (subcategory.toLowerCase().includes('equipment') || subcategory.toLowerCase().includes('crane') || subcategory.toLowerCase().includes('excavator') || subcategory.toLowerCase().includes('mixer')) category = 'equipment';
        else if (subcategory.toLowerCase().includes('transport') || subcategory.toLowerCase().includes('truck') || subcategory.toLowerCase().includes('delivery')) category = 'transport';
      }

      const changePct = item.yoy_pct ?? item.ytd_change_pct ?? item.qoq_change_pct ?? item.month_change_pct;
      const changeLabel = item.ytd_change_pct != null ? 'YoY' : item.qoq_change_pct != null ? 'QoQ' : item.month_change_pct != null ? 'MoM' : '';

      const notesParts: string[] = [];
      if (json.source) notesParts.push(`Source: ${json.source}`);
      if (json.source_url) notesParts.push(`URL: ${json.source_url}`);
      if (regionData.notes) notesParts.push(regionData.notes);
      if (changePct != null) notesParts.push(`${changeLabel}: ${changePct}%`);
      if (item.notes) notesParts.push(item.notes);

      items.push({
        region_id: regionId,
        category,
        subcategory,
        spec_code: item.spec,
        spec_detail: null,
        unit: item.unit,
        unit_price: item.price,
        price_min: item.min ?? null,
        price_max: item.max ?? null,
        data_year: year,
        data_quarter: quarter,
        source_id: sourceId,
        building_type: 'all',
        notes: notesParts.join('. ') || null,
      });
    }
  }

  console.log(`[${label}] Parsed ${items.length} items`);
  return items;
}
