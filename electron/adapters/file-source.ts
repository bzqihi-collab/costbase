/**
 * Electron file-based adapter — reads pre-extracted government data from JSON files.
 * These files are bundled in the app at resources/app/public/*.json
 */
import * as fs from 'fs';
import * as path from 'path';
import { BaseAdapter } from './base';
import type { AdapterFetchResult } from './base';
import type { CostItem } from '../../shared/types';

type CostInput = Omit<CostItem, 'id' | 'created_at' | 'updated_at'>;

interface RawItem {
  material?: string;
  spec: string;
  unit: string;
  price: number;
  min?: number;
  max?: number;
  category?: string;
  yoy_pct?: number;
  ytd_change_pct?: number;
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
  notes?: string;
  data: RawRegion[];
}

export class FileSourceAdapter extends BaseAdapter {
  name: string;
  sourceId: number;
  private filename: string;
  private regionMap: Record<string, number>;

  constructor(name: string, sourceId: number, filename: string, regionMap: Record<string, number>) {
    super();
    this.name = name;
    this.sourceId = sourceId;
    this.filename = filename;
    this.regionMap = regionMap;
  }

  async fetch(): Promise<AdapterFetchResult> {
    const items: CostInput[] = [];
    const errors: string[] = [];

    // extraResources puts JSON files at resources/data/ (outside asar)
    // Vite dev server serves them from public/ (copied to dist/)
    const resPath = process.resourcesPath || '';
    const possiblePaths = [
      // Packaged app: extraResources → resources/data/
      path.join(resPath, 'data', this.filename),
      // Dev: vite copies public/ to dist/
      path.join(__dirname, '..', 'dist', this.filename),
      path.join(__dirname, '..', '..', 'dist', this.filename),
      // Dev: project public/
      path.join(__dirname, '..', '..', 'public', this.filename),
      path.join(__dirname, '..', 'public', this.filename),
      // Fallback: inside asar
      path.join(resPath, 'app.asar', 'dist', this.filename),
      path.join(resPath, 'app', 'dist', this.filename),
      path.join(resPath, 'public', this.filename),
    ];

    let raw = '';
    let foundPath = '';
    for (const p of possiblePaths) {
      try {
        raw = fs.readFileSync(p, 'utf-8');
        foundPath = p;
        console.log(`[${this.name}] Found at: ${p}`);
        break;
      } catch (e: any) {
        console.log(`[${this.name}] Not at: ${p} (${e.code || e.message})`);
      }
    }

    if (!raw) {
      const msg = `Data file ${this.filename} not found. resPath=${resPath}`;
      errors.push(msg);
      console.error(`[${this.name}] ${msg}`);
      return { items, errors };
    }

    let json: RawDataFile;
    try {
      json = JSON.parse(raw);
    } catch (e: any) {
      const msg = `JSON parse error in ${this.filename}: ${e.message}`;
      errors.push(msg);
      console.error(`[${this.name}] ${msg}`);
      return { items, errors };
    }

    if (!json.data || !Array.isArray(json.data)) {
      const msg = `Invalid data format in ${this.filename}: missing "data" array`;
      errors.push(msg);
      console.error(`[${this.name}] ${msg}`);
      return { items, errors };
    }

    const reportDate = new Date(json.report_date || Date.now());
    const year = reportDate.getFullYear();
    const quarter = Math.ceil((reportDate.getMonth() + 1) / 3);
    console.log(`[${this.name}] Parsing ${json.data.length} regions, report date: ${json.report_date}`);

    for (const regionData of json.data) {
      const regionId = this.regionMap[regionData.region];
      if (!regionId) continue;

      for (const item of regionData.items) {
        let category = item.category || 'material';
        if (!item.category) {
          const sub = item.material || item.spec;
          if (/labor|bricklayer|carpenter|electrician|plumber|painter|mason|steel fixer|operator|supervisor|foreman/i.test(sub)) category = 'labor';
          else if (/equipment|excavator|crane|mixer|scaffold|compactor|truck|pump|tlb/i.test(sub)) category = 'equipment';
          else if (/transport|delivery|haul/i.test(sub)) category = 'transport';
        }

        const change = item.yoy_pct ?? item.ytd_change_pct ?? item.qoq_change_pct ?? item.month_change_pct;
        const changeLabel = item.yoy_pct != null ? 'YoY' : item.qoq_change_pct != null ? 'QoQ' : item.month_change_pct != null ? 'MoM' : '';

        items.push({
          region_id: regionId,
          category,
          subcategory: item.material || item.spec,
          spec_code: item.spec,
          spec_detail: null,
          unit: item.unit,
          unit_price: item.price,
          price_min: item.min ?? null,
          price_max: item.max ?? null,
          building_type: 'all',
          data_year: year,
          data_quarter: quarter,
          source_id: this.sourceId,
          is_manual_fix: 0,
          status: 'active',
          notes: [
            json.source ? `Source: ${json.source}` : '',
            regionData.notes || '',
            change != null ? `${changeLabel}: ${change}%` : '',
            item.notes || '',
          ].filter(Boolean).join('. ') || null,
        });
      }
    }

    console.log(`[${this.name}] Loaded ${items.length} items from ${foundPath} (${json.data.length} regions, errors: ${errors.length})`);
    if (errors.length > 0) console.warn(`[${this.name}] Errors:`, errors);
    return { items, errors };
  }
}

// [name, sourceId, filename, regionMap]
// [adapterName, sourceId, filename, regionMap]
// CRITICAL: adapterName MUST match the source name in the database (seed.ts ALL_SOURCES)
export const FILE_ADAPTERS: [string, number, string, Record<string, number>][] = [
  ['Stats SA P0151.1', 2, 'stats_sa_data.json', { '约翰内斯堡': 7, '开普敦': 12, '德班': 13 }],
  ['CAPMAS Building Materials Bulletin', 3, 'capmas_data.json', { '开罗': 9 }],
  ['KNBS Construction Input Price Indices', 4, 'knbs_data.json', { '内罗毕': 11 }],
  ['SEIFSA Steel & Engineering', 5, 'seifsa_data.json', { '约翰内斯堡': 7, '开普敦': 12, '德班': 13 }],
  ['GSS Ghana PBCI', 6, 'ghana_gss_data.json', { '阿克拉': 15 }],
  ['Nigeria Construction Market', 7, 'nigeria_market_data.json', { '拉各斯': 17 }],
  ['Turner & Townsend Africa', 8, 'turner_townsend_africa_data.json', { '约翰内斯堡': 7, '开普敦': 12, '拉各斯': 17, '内罗毕': 11 }],
  ['UBOS Uganda CIPI', 9, 'uganda_ubos_data.json', { '坎帕拉': 19 }],
  ['NISR Rwanda PPI', 10, 'rwanda_nisr_data.json', { '基加利': 21 }],
  ['ZamStats Zambia', 11, 'zambia_zamstats_data.json', { '卢萨卡': 23 }],
  ['Africa Building Cost Benchmarks', 12, 'building_costs_africa.json', { '约翰内斯堡': 7, '开普敦': 12, '德班': 13, '内罗毕': 11, '开罗': 9, '阿克拉': 15, '拉各斯': 17, '坎帕拉': 19, '基加利': 21, '卢萨卡': 23 }],
  ['Africa Road Construction Costs', 13, 'road_costs_africa.json', { '约翰内斯堡': 7, '内罗毕': 11, '开罗': 9, '阿克拉': 15, '拉各斯': 17, '坎帕拉': 19, '基加利': 21, '卢萨卡': 23 }],
];
