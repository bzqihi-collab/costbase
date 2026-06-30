import { getDB } from './connection';

const ALL_SOURCES: [number, string, string, string, string, string | null, string, string | null, string][] = [
  [1, 'Eurostat Construction Cost Index', 'official_statistics', 'EU', 'https://ec.europa.eu/eurostat', 'https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/sts_copi_a', 'api_free', 'quarterly', ''],
  [2, 'Stats SA P0151.1', 'official_statistics', 'ZA', 'https://www.statssa.gov.za/?page_id=2528', null, 'public', 'monthly', ''],
  [3, 'CAPMAS Building Materials Bulletin', 'official_statistics', 'EG', 'https://www.eip.gov.eg', null, 'public', 'monthly', ''],
  [4, 'KNBS Construction Input Price Indices', 'official_statistics', 'KE', 'https://www.knbs.or.ke', null, 'public', 'quarterly', ''],
  [5, 'SEIFSA Steel & Engineering', 'industry_assoc', 'ZA', 'https://www.seifsa.co.za', null, 'public', 'monthly', ''],
  [6, 'GSS Ghana PBCI', 'official_statistics', 'GH', 'https://statsghana.gov.gh', null, 'public', 'monthly', ''],
  [7, 'Nigeria Construction Market', 'official_statistics', 'NG', 'https://nigerianstat.gov.ng', null, 'public', 'quarterly', ''],
  [8, 'Turner & Townsend Africa', 'industry_assoc', 'AF', 'https://marketintelligence.turnerandtownsend.com/', null, 'public', 'quarterly', ''],
  [9, 'UBOS Uganda CIPI', 'official_statistics', 'UG', 'https://www.ubos.org', null, 'public', 'monthly', ''],
  [10, 'NISR Rwanda PPI', 'official_statistics', 'RW', 'https://www.statistics.gov.rw', null, 'public', 'monthly', ''],
  [11, 'ZamStats Zambia', 'official_statistics', 'ZM', 'https://www.zamstats.gov.zm', null, 'public', 'quarterly', ''],
  [12, 'Africa Building Cost Benchmarks', 'industry_assoc', 'AF', 'https://marketintelligence.turnerandtownsend.com/', null, 'public', 'quarterly', ''],
  [13, 'Africa Road Construction Costs', 'industry_assoc', 'AF', 'https://marketintelligence.turnerandtownsend.com/', null, 'public', 'quarterly', ''],
  [99, 'CSV Manual Import', 'industry_assoc', 'XX', null, null, 'manual_import', null, ''],
];

const ALL_REGIONS: [number, string, string, number | null, string, string, string][] = [
  [1, '德国', 'country', null, 'EUR', 'metric', 'DE'],
  [2, '巴伐利亚', 'state', 1, 'EUR', 'metric', ''],
  [3, '慕尼黑', 'city', 2, 'EUR', 'metric', ''],
  [4, '日本', 'country', null, 'JPY', 'metric', 'JP'],
  [5, '東京', 'city', 4, 'JPY', 'metric', ''],
  [6, '南非', 'country', null, 'ZAR', 'metric', 'ZA'],
  [7, '约翰内斯堡', 'city', 6, 'ZAR', 'metric', ''],
  [8, '埃及', 'country', null, 'EGP', 'metric', 'EG'],
  [9, '开罗', 'city', 8, 'EGP', 'metric', ''],
  [10, '肯尼亚', 'country', null, 'KES', 'metric', 'KE'],
  [11, '内罗毕', 'city', 10, 'KES', 'metric', ''],
  [12, '开普敦', 'city', 6, 'ZAR', 'metric', ''],
  [13, '德班', 'city', 6, 'ZAR', 'metric', ''],
  [14, '加纳', 'country', null, 'GHS', 'metric', 'GH'],
  [15, '阿克拉', 'city', 14, 'GHS', 'metric', ''],
  [16, '尼日利亚', 'country', null, 'NGN', 'metric', 'NG'],
  [17, '拉各斯', 'city', 16, 'NGN', 'metric', ''],
  [18, '乌干达', 'country', null, 'UGX', 'metric', 'UG'],
  [19, '坎帕拉', 'city', 18, 'UGX', 'metric', ''],
  [20, '卢旺达', 'country', null, 'RWF', 'metric', 'RW'],
  [21, '基加利', 'city', 20, 'RWF', 'metric', ''],
  [22, '赞比亚', 'country', null, 'ZMW', 'metric', 'ZM'],
  [23, '卢萨卡', 'city', 22, 'ZMW', 'metric', ''],
];

export function seedInitialData(): void {
  const db = getDB();
  console.log('[Seed] Checking database...');

  // --- Regions (insert one by one, skip if exists) ---
  let regAdded = 0;
  for (const [id, name, level, parentId, currency, unitSystem, isoCode] of ALL_REGIONS) {
    const exists = db.prepare('SELECT 1 FROM regions WHERE id = ?').get(id);
    if (exists) continue;
    try {
      db.prepare(
        'INSERT INTO regions (id, name, level, parent_id, currency, unit_system, iso_code) VALUES (?,?,?,?,?,?,?)'
      ).run(id, name, level, parentId, currency, unitSystem, isoCode);
      regAdded++;
    } catch (e: any) {
      console.error(`[Seed] Region ${id} (${name}) failed:`, e.message);
    }
  }
  if (regAdded > 0) console.log(`[Seed] Added ${regAdded} regions`);

  // --- Sources (insert one by one, skip if exists) ---
  let srcAdded = 0;
  for (const [id, name, type, country, url, apiEndpoint, accessType, syncFreq, notes] of ALL_SOURCES) {
    const exists = db.prepare('SELECT 1 FROM sources WHERE id = ?').get(id);
    if (exists) continue;
    try {
      db.prepare(
        'INSERT INTO sources (id, name, type, country, url, api_endpoint, access_type, sync_frequency, notes) VALUES (?,?,?,?,?,?,?,?,?)'
      ).run(id, name, type, country, url, apiEndpoint, accessType, syncFreq, notes);
      srcAdded++;
    } catch (e: any) {
      console.error(`[Seed] Source ${id} (${name}) failed:`, e.message);
    }
  }
  if (srcAdded > 0) console.log(`[Seed] Added ${srcAdded} sources`);

  // --- Cost items (only if empty) ---
  const ciCount = (db.prepare('SELECT COUNT(*) as c FROM cost_items').get() as { c: number }).c;
  if (ciCount === 0) {
    const ci = db.prepare(
      `INSERT INTO cost_items (region_id, category, subcategory, spec_code, spec_detail, unit, unit_price, price_min, price_max, building_type, data_year, data_quarter, source_id, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    const sampleItems: [number, string, string, string, string, string, number, number, number, string, number, number, number, string][] = [
      [3, 'material', 'Concrete', 'C30/37', 'Pumped', 'm³', 128.50, 118.00, 142.00, 'all', 2025, 2, 1, ''],
      [3, 'material', 'Reinforcing Steel', 'B500B', 'Ø12-16mm', 'ton', 892.00, 845.00, 940.00, 'all', 2025, 2, 1, ''],
      [5, 'material', 'Ready-mix Concrete', 'JIS A 5308', '21-18-20N', 'm³', 18500, 17500, 20000, 'all', 2025, 1, 1, ''],
      [7, 'material', 'Ready-mix Concrete', '25 MPa', '19mm stone', 'm³', 1925, 1820, 2150, 'all', 2025, 3, 2, ''],
      [7, 'material', 'Cement', 'CEM I 42.5N', '50kg bag', 'bag', 85.00, 80.00, 92.00, 'all', 2025, 3, 2, ''],
      [7, 'material', 'Reinforcing Steel', 'Y16', 'High tensile', 'ton', 14500, 13800, 15500, 'all', 2025, 3, 2, ''],
      [9, 'material', 'Reinforcing Steel', '10-16mm', 'High tensile', 'ton', 39350, 38000, 41000, 'all', 2025, 1, 3, ''],
      [9, 'material', 'Portland Cement', '50kg bag', '', 'bag', 169.87, 155, 185, 'all', 2025, 1, 3, ''],
      [11, 'material', 'Ready-mix Concrete', '25 MPa', '', 'm³', 12500, 11800, 13500, 'all', 2025, 2, 4, ''],
      [11, 'material', 'Cement', 'Portland 50kg bag', '', 'bag', 750, 700, 820, 'all', 2025, 2, 4, ''],
      [15, 'material', 'Cement', 'Portland 50kg bag', '', 'bag', 95.00, 88.00, 105.00, 'all', 2025, 4, 6, ''],
      [17, 'material', 'Cement', 'Dangote 50kg bag', '', 'bag', 8500, 7500, 10000, 'all', 2025, 4, 7, ''],
      [19, 'material', 'Cement', 'Portland 50kg bag', '', 'bag', 35000, 32000, 39000, 'all', 2025, 4, 9, ''],
      [21, 'material', 'Cement', 'Cimerwa 50kg bag', '', 'bag', 14500, 12500, 17000, 'all', 2025, 4, 10, ''],
      [23, 'material', 'Cement', 'Portland 50kg bag', '', 'bag', 135, 120, 155, 'all', 2025, 3, 11, ''],
    ];
    for (const it of sampleItems) {
      try { ci.run(...it); } catch (e: any) { console.error('[Seed] Cost item failed:', e.message); }
    }
    console.log(`[Seed] Added ${sampleItems.length} sample cost items`);
  }

  try { db.exec("INSERT INTO cost_items_fts(cost_items_fts) VALUES('rebuild')"); } catch (e) {}

  const r = (db.prepare('SELECT COUNT(*) as c FROM regions').get() as { c: number }).c;
  const s = (db.prepare('SELECT COUNT(*) as c FROM sources').get() as { c: number }).c;
  const c = (db.prepare('SELECT COUNT(*) as c FROM cost_items').get() as { c: number }).c;
  console.log(`[Seed] Complete: ${r} regions, ${s} sources, ${c} cost items`);
}
