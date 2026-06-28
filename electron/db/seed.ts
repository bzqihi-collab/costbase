import { getDB } from './connection';

export function seedInitialData(): void {
  const db = getDB();

  const regionCount = db.prepare('SELECT COUNT(*) as count FROM regions').get() as { count: number };
  if (regionCount.count > 0) return;

  const insert = db.transaction(() => {
    // Register data sources
    const sources = [
      { name: 'Eurostat Construction Cost Index', type: 'official_statistics' as const, country: 'EU', url: 'https://ec.europa.eu/eurostat', api_endpoint: 'https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/sts_copi_a', access_type: 'api_free' as const, sync_frequency: 'quarterly' as const },
      { name: 'Stats SA Construction Material Price Indices', type: 'official_statistics' as const, country: 'ZA', url: 'https://www.statssa.gov.za', access_type: 'public' as const, sync_frequency: 'monthly' as const },
      { name: 'CAPMAS Building Materials Bulletin', type: 'official_statistics' as const, country: 'EG', url: 'https://www.eip.gov.eg', access_type: 'public' as const, sync_frequency: 'monthly' as const },
      { name: 'KNBS Construction Input Price Indices', type: 'official_statistics' as const, country: 'KE', url: 'https://www.knbs.or.ke', access_type: 'public' as const, sync_frequency: 'quarterly' as const },
    ];
    const insertSource = db.prepare(
      "INSERT INTO sources (name, type, country, url, api_endpoint, access_type, sync_frequency) VALUES (?,?,?,?,?,?,?)"
    );
    for (const s of sources) {
      insertSource.run(s.name, s.type, s.country, s.url, s.api_endpoint || null, s.access_type, s.sync_frequency);
    }

    // Register regions (hierarchical — parent_id references)
    const regions = [
      { name: '德国', level: 'country' as const, parent_id: null, currency: 'EUR', unit_system: 'metric' as const, iso_code: 'DE' },
      { name: '巴伐利亚', level: 'state' as const, parent_id: 1, currency: 'EUR', unit_system: 'metric' as const, iso_code: '' },
      { name: '慕尼黑', level: 'city' as const, parent_id: 2, currency: 'EUR', unit_system: 'metric' as const, iso_code: '' },
      { name: '日本', level: 'country' as const, parent_id: null, currency: 'JPY', unit_system: 'metric' as const, iso_code: 'JP' },
      { name: '東京', level: 'city' as const, parent_id: 4, currency: 'JPY', unit_system: 'metric' as const, iso_code: '' },
      { name: '南非', level: 'country' as const, parent_id: null, currency: 'ZAR', unit_system: 'metric' as const, iso_code: 'ZA' },
      { name: '约翰内斯堡', level: 'city' as const, parent_id: 6, currency: 'ZAR', unit_system: 'metric' as const, iso_code: '' },
    ];
    const insertRegion = db.prepare(
      'INSERT INTO regions (name, level, parent_id, currency, unit_system, iso_code) VALUES (?,?,?,?,?,?)'
    );
    for (const r of regions) {
      insertRegion.run(r.name, r.level, r.parent_id, r.currency, r.unit_system, r.iso_code);
    }

    // Insert sample cost items
    const sampleItems = [
      { region_id: 3, category: 'material' as const, subcategory: '混凝土', spec_code: 'C30/37', spec_detail: '泵送', unit: 'm³', unit_price: 128.50, price_min: 118.00, price_max: 142.00, data_year: 2025, data_quarter: 2, source_id: 1, building_type: 'all' },
      { region_id: 3, category: 'material' as const, subcategory: '混凝土', spec_code: 'C30/37', spec_detail: '非泵送', unit: 'm³', unit_price: 115.00, price_min: 105.00, price_max: 128.00, data_year: 2025, data_quarter: 2, source_id: 1, building_type: 'all' },
      { region_id: 3, category: 'material' as const, subcategory: '钢筋', spec_code: 'HRB400', spec_detail: 'Φ12-16mm', unit: '吨', unit_price: 892.00, price_min: 845.00, price_max: 940.00, data_year: 2025, data_quarter: 2, source_id: 1, building_type: 'all' },
      { region_id: 5, category: 'material' as const, subcategory: 'コンクリート', spec_code: 'JIS A 5308', spec_detail: '21-18-20N', unit: 'm³', unit_price: 18500, price_min: 17500, price_max: 20000, data_year: 2025, data_quarter: 1, source_id: 1, building_type: 'all' },
      { region_id: 5, category: 'material' as const, subcategory: '鉄筋', spec_code: 'SD345', spec_detail: 'D16-D25', unit: 'トン', unit_price: 128000, price_min: 122000, price_max: 135000, data_year: 2025, data_quarter: 1, source_id: 1, building_type: 'all' },
      { region_id: 7, category: 'material' as const, subcategory: 'Concrete', spec_code: '25 MPa', spec_detail: 'Ready-mix', unit: 'm³', unit_price: 1850, price_min: 1750, price_max: 2100, data_year: 2025, data_quarter: 1, source_id: 2, building_type: 'all' },
      { region_id: 7, category: 'material' as const, subcategory: 'Reinforcing Steel', spec_code: 'Y12-Y16', spec_detail: 'High tensile', unit: 'ton', unit_price: 14500, price_min: 13800, price_max: 15500, data_year: 2025, data_quarter: 1, source_id: 2, building_type: 'all' },
    ];
    const insertItem = db.prepare(
      `INSERT INTO cost_items (region_id, category, subcategory, spec_code, spec_detail, unit, unit_price, price_min, price_max, data_year, data_quarter, source_id, building_type)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    for (const item of sampleItems) {
      insertItem.run(item.region_id, item.category, item.subcategory, item.spec_code, item.spec_detail, item.unit, item.unit_price, item.price_min, item.price_max, item.data_year, item.data_quarter, item.source_id, item.building_type);
    }

    // Rebuild FTS index
    db.exec("INSERT INTO cost_items_fts(cost_items_fts) VALUES('rebuild')");
  });

  insert();
  console.log('Seed data inserted: 7 regions, 4 sources, 7 sample cost items');
}
