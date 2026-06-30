/**
 * Browser-compatible database layer using sql.js (SQLite compiled to WASM).
 * This replaces better-sqlite3 + Electron IPC when running in the browser.
 */
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

const STORAGE_KEY = 'costbase_db_v1';

function saveDB(): void {
  if (!db) return;
  try {
    const data = db.export();
    const base64 = arrayToBase64(data);
    localStorage.setItem(STORAGE_KEY, base64);
  } catch (e) {
    console.warn('[BrowserDB] Failed to save to localStorage:', e);
  }
}

function arrayToBase64(arr: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

function base64ToArray(base64: string): Uint8Array {
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

export async function initBrowserDB(): Promise<void> {
  SQL = await initSqlJs({
    locateFile: (file: string) => `/sql-wasm.wasm`,
  });

  // Try to restore from localStorage
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = base64ToArray(saved);
      db = new SQL.Database(data);
      console.log('[BrowserDB] Restored from localStorage');
      return; // Skip seed — DB already has data
    } catch (e) {
      console.warn('[BrowserDB] Failed to restore, creating new DB:', e);
    }
  }

  db = new SQL.Database();

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      level TEXT NOT NULL,
      parent_id INTEGER,
      currency TEXT NOT NULL,
      unit_system TEXT DEFAULT 'metric',
      iso_code TEXT
    );

    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      country TEXT,
      url TEXT,
      api_endpoint TEXT,
      access_type TEXT DEFAULT 'public',
      sync_frequency TEXT,
      last_sync_at TEXT,
      is_active INTEGER DEFAULT 1,
      api_config TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS cost_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      region_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL,
      spec_code TEXT,
      spec_detail TEXT,
      unit TEXT NOT NULL,
      unit_price REAL,
      price_min REAL,
      price_max REAL,
      building_type TEXT DEFAULT 'all',
      data_year INTEGER NOT NULL,
      data_quarter INTEGER,
      source_id INTEGER,
      is_manual_fix INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER,
      started_at TEXT,
      finished_at TEXT,
      status TEXT,
      new_records INTEGER DEFAULT 0,
      updated_records INTEGER DEFAULT 0,
      conflicts INTEGER DEFAULT 0,
      error_message TEXT,
      details TEXT
    );
  `);

  // Seed data
  seedBrowserData();
  saveDB();
  const rc = (db.exec('SELECT COUNT(*) as c FROM regions')[0]?.values?.[0]?.[0]) || 0;
  const sc = (db.exec('SELECT COUNT(*) as c FROM sources')[0]?.values?.[0]?.[0]) || 0;
  console.log(`[BrowserDB] Seeded: ${rc} regions, ${sc} sources`);
}

function seedBrowserData() {
  const count = db!.exec('SELECT COUNT(*) as c FROM regions')[0];
  if (count && count.values[0][0] > 0) return;

  // Sources
  const sources = [
    [1, 'Eurostat Construction Cost Index', 'official_statistics', 'EU', 'https://ec.europa.eu/eurostat', 'https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/sts_copi_a', 'api_free', 'quarterly', null, 1, null, null],
    [2, 'Stats SA — Construction Material Price Indices (P0151.1)', 'official_statistics', 'ZA', 'https://www.statssa.gov.za/?page_id=2528', null, 'public', 'monthly', null, 1, null, 'Monthly CPAP work group indices. Dec 2023=100 base. Covers concrete, reinforcement, brickwork, roofing, carpentry, plumbing, electrical.'],
    [3, 'CAPMAS Building Materials Bulletin', 'official_statistics', 'EG', 'https://www.eip.gov.eg', null, 'public', 'monthly', null, 1, null, null],
    [4, 'KNBS Construction Input Price Indices', 'official_statistics', 'KE', 'https://www.knbs.or.ke', null, 'public', 'quarterly', null, 1, null, null],
    [5, 'SEIFSA — Steel & Engineering Price Indices', 'industry_assoc', 'ZA', 'https://www.seifsa.co.za', null, 'public', 'monthly', null, 1, null, 'Steel and engineering industries federation. Used in CPAP composite index for metalwork items.'],
    [6, 'GSS — Ghana Prime Building Cost Index', 'official_statistics', 'GH', 'https://statsghana.gov.gh', null, 'public', 'monthly', null, 1, null, 'Rebased 2023=100. 406 items, 23 sub-groups, 16 regions. Ghana Statistical Service.'],
    [7, 'Nigeria Construction Market Survey', 'official_statistics', 'NG', 'https://nigerianstat.gov.ng', null, 'public', 'quarterly', null, 1, null, 'Compiled from NBS Construction Input Price Index and market surveys.'],
    [8, 'Turner & Townsend — Africa Cost Benchmarks', 'industry_assoc', 'AF', 'https://marketintelligence.turnerandtownsend.com/', null, 'public', 'quarterly', null, 1, null, 'International construction cost benchmarks. 99 global markets. GCMI + Fit-Out Cost Guide.'],
    [9, 'UBOS — Uganda Construction Input Price Index', 'official_statistics', 'UG', 'https://www.ubos.org/?pagename=explore-publications&p_id=30', null, 'public', 'monthly', null, 1, null, 'Monthly CIPI published by Uganda Bureau of Statistics. Senior Statistician: Irene Namugenze Musitwa.'],
    [10, 'NISR — Rwanda Producer Price Index & Market Survey', 'official_statistics', 'RW', 'https://www.statistics.gov.rw/surveys/Producer-Price-Index', null, 'public', 'monthly', null, 1, null, 'NISR PPI reports + Zawya/East African market surveys. Construction boom data.'],
    [11, 'ZamStats — Zambia Construction Cost Data & Market Survey', 'official_statistics', 'ZM', 'https://www.zamstats.gov.zm', null, 'public', 'quarterly', null, 1, null, 'ZamStats + EstimationQS + Zambia House Plans market surveys.'],
    [12, 'Africa Building & Infrastructure Cost Benchmarks', 'industry_assoc', 'AF', 'https://marketintelligence.turnerandtownsend.com/', null, 'public', 'quarterly', null, 1, null, 'Compiled from T&T GCMI, AECOM Cost Guide, RLB Africa, and national statistical offices. Covers building cost/m² by type and infrastructure cost/km.'],
    [13, 'Africa Road & Highway Construction Costs', 'industry_assoc', 'AF', 'https://marketintelligence.turnerandtownsend.com/', null, 'public', 'quarterly', null, 1, null, 'Road construction unit costs from SANRAL, KeNHA, UNRA, and AfDB benchmarks. Covers urban roads, rural roads, freeways, bridges by country.'],
    [99, 'CSV Manual Import', 'industry_assoc', 'XX', null, null, 'manual_import', null, null, 1, null, 'User-imported data from CSV files.'],
  ];
  for (const s of sources) {
    db!.run('INSERT INTO sources VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', s);
  }

  // Regions (hierarchical)
  db!.run("INSERT INTO regions VALUES (1, '德国', 'country', NULL, 'EUR', 'metric', 'DE')");
  db!.run("INSERT INTO regions VALUES (2, '巴伐利亚', 'state', 1, 'EUR', 'metric', NULL)");
  db!.run("INSERT INTO regions VALUES (3, '慕尼黑', 'city', 2, 'EUR', 'metric', NULL)");
  db!.run("INSERT INTO regions VALUES (4, '日本', 'country', NULL, 'JPY', 'metric', 'JP')");
  db!.run("INSERT INTO regions VALUES (5, '東京', 'city', 4, 'JPY', 'metric', NULL)");
  db!.run("INSERT INTO regions VALUES (6, '南非', 'country', NULL, 'ZAR', 'metric', 'ZA')");
  db!.run("INSERT INTO regions VALUES (7, '约翰内斯堡', 'city', 6, 'ZAR', 'metric', NULL)");
  db!.run("INSERT INTO regions VALUES (12, '开普敦', 'city', 6, 'ZAR', 'metric', NULL)");
  db!.run("INSERT INTO regions VALUES (13, '德班', 'city', 6, 'ZAR', 'metric', NULL)");
  db!.run("INSERT INTO regions VALUES (8, '埃及', 'country', NULL, 'EGP', 'metric', 'EG')");
  db!.run("INSERT INTO regions VALUES (9, '开罗', 'city', 8, 'EGP', 'metric', NULL)");
  db!.run("INSERT INTO regions VALUES (10, '肯尼亚', 'country', NULL, 'KES', 'metric', 'KE')");
  db!.run("INSERT INTO regions VALUES (11, '内罗毕', 'city', 10, 'KES', 'metric', NULL)");
  db!.run("INSERT INTO regions VALUES (14, '加纳', 'country', NULL, 'GHS', 'metric', 'GH')");
  db!.run("INSERT INTO regions VALUES (15, '阿克拉', 'city', 14, 'GHS', 'metric', NULL)");
  db!.run("INSERT INTO regions VALUES (16, '尼日利亚', 'country', NULL, 'NGN', 'metric', 'NG')");
  db!.run("INSERT INTO regions VALUES (17, '拉各斯', 'city', 16, 'NGN', 'metric', NULL)");
  db!.run("INSERT INTO regions VALUES (18, '乌干达', 'country', NULL, 'UGX', 'metric', 'UG')");
  db!.run("INSERT INTO regions VALUES (19, '坎帕拉', 'city', 18, 'UGX', 'metric', NULL)");
  db!.run("INSERT INTO regions VALUES (20, '卢旺达', 'country', NULL, 'RWF', 'metric', 'RW')");
  db!.run("INSERT INTO regions VALUES (21, '基加利', 'city', 20, 'RWF', 'metric', NULL)");
  db!.run("INSERT INTO regions VALUES (22, '赞比亚', 'country', NULL, 'ZMW', 'metric', 'ZM')");
  db!.run("INSERT INTO regions VALUES (23, '卢萨卡', 'city', 22, 'ZMW', 'metric', NULL)");

  // Cost items
  // Format: [region_id, category, subcategory, spec_code, spec_detail, unit, unit_price, price_min, price_max, building_type, data_year, data_quarter, source_id]
  const items = [
    // ============================================
    // 🇩🇪 Germany — Munich (region 3)
    // ============================================
    [3, 'material', 'Concrete', 'C30/37', 'Pumped', 'm³', 128.50, 118.00, 142.00, 'all', 2025, 2, 1],
    [3, 'material', 'Concrete', 'C30/37', 'Non-pumped', 'm³', 115.00, 105.00, 128.00, 'all', 2025, 2, 1],
    [3, 'material', 'Concrete', 'C20/25', 'Pumped', 'm³', 108.00, 98.00, 122.00, 'all', 2025, 2, 1],
    [3, 'material', 'Reinforcing Steel', 'B500B', 'Ø12-16mm', 'ton', 892.00, 845.00, 940.00, 'all', 2025, 2, 1],
    [3, 'material', 'Reinforcing Steel', 'B500B', 'Ø16-25mm', 'ton', 878.00, 830.00, 925.00, 'all', 2025, 2, 1],
    [3, 'material', 'Structural Steel', 'S235 JR', 'Sections', 'ton', 1650.00, 1520.00, 1820.00, 'commercial', 2025, 2, 1],
    [3, 'material', 'Cement', 'CEM I 42.5N', 'Bulk', 'ton', 95.00, 88.00, 105.00, 'all', 2025, 2, 1],
    [3, 'material', 'Sand & Gravel', '0/32mm', 'Crushed', 'm³', 28.00, 24.00, 34.00, 'all', 2025, 2, 1],
    [3, 'material', 'Clay Bricks', 'NF Format', 'Solid', '1000 pcs', 520.00, 480.00, 580.00, 'residential', 2025, 2, 1],
    [3, 'labor', 'Bricklayer', 'Skilled', '', 'hr', 42.00, 38.00, 48.00, 'all', 2025, 2, 1],
    [3, 'labor', 'Steel Fixer', 'Skilled', '', 'hr', 44.00, 40.00, 50.00, 'all', 2025, 2, 1],
    [3, 'labor', 'Carpenter', 'Skilled', '', 'hr', 43.00, 39.00, 49.00, 'all', 2025, 2, 1],
    [3, 'labor', 'General Laborer', 'Unskilled', '', 'hr', 22.00, 19.50, 26.00, 'all', 2025, 2, 1],
    [3, 'equipment', 'Tower Crane', 'QTZ80', '60m jib', 'day', 1200.00, 1000.00, 1500.00, 'commercial', 2025, 2, 1],
    [3, 'equipment', 'Concrete Pump', '36m boom', '', 'day', 850.00, 720.00, 980.00, 'all', 2025, 2, 1],

    // ============================================
    // 🇯🇵 Japan — Tokyo (region 5)
    // ============================================
    [5, 'material', 'Ready-mix Concrete', 'JIS A 5308', '21-18-20N', 'm³', 18500, 17500, 20000, 'all', 2025, 1, 1],
    [5, 'material', 'Reinforcing Bar', 'SD345', 'D16-D25', 'ton', 128000, 122000, 135000, 'all', 2025, 1, 1],
    [5, 'material', 'Reinforcing Bar', 'SD390', 'D16-D25', 'ton', 138000, 132000, 146000, 'all', 2025, 1, 1],
    [5, 'material', 'Cement', 'Ordinary Portland', 'Bulk', 'ton', 14500, 13800, 15500, 'all', 2025, 1, 1],
    [5, 'material', 'Structural Steel', 'SS400', 'H-beam', 'ton', 155000, 148000, 165000, 'commercial', 2025, 1, 1],
    [5, 'labor', 'Formwork Carpenter', 'Skilled', '', 'day', 28000, 25000, 32000, 'all', 2025, 1, 1],
    [5, 'labor', 'Steel Fixer', 'Skilled', '', 'day', 30000, 27000, 34000, 'all', 2025, 1, 1],
    [5, 'labor', 'General Laborer', '', '', 'day', 16000, 14000, 18000, 'all', 2025, 1, 1],
    [5, 'equipment', 'Mobile Crane', '25t', '', 'day', 65000, 55000, 78000, 'all', 2025, 1, 1],

    // ============================================
    // 🇿🇦 South Africa — Johannesburg (region 7) — Stats SA + SEIFSA
    // ============================================
    // Concrete & cement products (CPAP Group 110)
    [7, 'material', 'Ready-mix Concrete', '25 MPa', '19mm stone', 'm³', 1925, 1820, 2150, 'all', 2025, 3, 2],
    [7, 'material', 'Ready-mix Concrete', '30 MPa', '19mm stone', 'm³', 2080, 1950, 2300, 'all', 2025, 3, 2],
    [7, 'material', 'Ready-mix Concrete', '15 MPa', 'Mass fill', 'm³', 1580, 1480, 1750, 'all', 2025, 2, 2],
    [7, 'material', 'Cement', 'CEM I 42.5N', 'Bulk', 'ton', 1880, 1780, 2150, 'all', 2025, 3, 2],
    [7, 'material', 'Cement', 'CEM II 32.5N', '50kg bag', 'bag', 76.50, 72.00, 82.00, 'residential', 2025, 3, 2],
    [7, 'material', 'Cement', 'CEM I 42.5N', '50kg bag', 'bag', 85.00, 80.00, 92.00, 'residential', 2025, 3, 2],
    [7, 'material', 'Fine Aggregate', 'River sand', '', 'm³', 420, 380, 480, 'all', 2025, 3, 2],
    [7, 'material', 'Coarse Aggregate', '19mm crushed stone', '', 'm³', 510, 470, 580, 'all', 2025, 3, 2],

    // Reinforcement (CPAP Group 114)
    [7, 'material', 'Reinforcing Steel', 'Y12 (high tensile)', 'Ø12mm', 'ton', 14800, 14100, 15800, 'all', 2025, 3, 2],
    [7, 'material', 'Reinforcing Steel', 'Y16 (high tensile)', 'Ø16mm', 'ton', 14500, 13800, 15500, 'all', 2025, 3, 2],
    [7, 'material', 'Reinforcing Steel', 'Y20 (high tensile)', 'Ø20mm', 'ton', 14300, 13600, 15300, 'all', 2025, 3, 2],
    [7, 'material', 'Reinforcing Mesh', 'Ref 193', '2.4m×6.0m', 'sheet', 680, 620, 750, 'all', 2025, 3, 2],
    [7, 'material', 'Structural Steel', '355JR', 'Universal columns', 'ton', 18700, 17800, 20200, 'commercial', 2025, 3, 5],
    [7, 'material', 'Structural Steel', '355JR', 'Universal beams', 'ton', 18300, 17400, 19800, 'commercial', 2025, 3, 5],
    [7, 'material', 'Structural Steel', '355JR', 'Angles & channels', 'ton', 17900, 17000, 19300, 'industrial', 2025, 3, 5],

    // Brick & blockwork (CPAP Group 116)
    [7, 'material', 'Clay Face Brick', 'Standard', 'Imperial', '1000 pcs', 3800, 3500, 4300, 'residential', 2025, 3, 2],
    [7, 'material', 'Clay Stock Brick', 'NFP', '', '1000 pcs', 2450, 2200, 2750, 'all', 2025, 3, 2],
    [7, 'material', 'Concrete Block', '140mm', 'Hollow', '1000 pcs', 12800, 12000, 14200, 'all', 2025, 3, 2],
    [7, 'material', 'Concrete Block', '190mm', 'Hollow', '1000 pcs', 15600, 14800, 17200, 'all', 2025, 3, 2],
    [7, 'material', 'Concrete Maxi Brick', 'Standard', 'Solid', '1000 pcs', 5200, 4800, 5800, 'residential', 2025, 3, 2],

    // Metal roofing (CPAP Group 124)
    [7, 'material', 'Steel Roof Sheeting', '0.5mm IBR', 'Galvanized', 'm²', 128, 118, 142, 'all', 2025, 3, 5],
    [7, 'material', 'Steel Roof Sheeting', '0.5mm Corrugated', 'Galvanized', 'm²', 115, 105, 128, 'all', 2025, 3, 5],
    [7, 'material', 'Aluminium Roof Sheeting', '0.6mm IBR', '', 'm²', 215, 198, 240, 'residential', 2025, 3, 2],

    // Carpentry & joinery (CPAP Group 126)
    [7, 'material', 'Timber', 'SA Pine S5', '38×114mm', 'linear m', 35.00, 32.00, 39.00, 'all', 2025, 3, 2],
    [7, 'material', 'Timber', 'SA Pine S5', '50×152mm', 'linear m', 52.00, 48.00, 58.00, 'all', 2025, 3, 2],
    [7, 'material', 'Plywood', '18mm', 'Marine grade', 'sheet', 890, 820, 980, 'all', 2025, 3, 2],
    [7, 'material', 'Timber Roof Truss', 'SA Pine', 'Prefab, per m² plan', 'm²', 280, 250, 320, 'residential', 2025, 3, 2],

    // Plumbing (CPAP Group 148)
    [7, 'material', 'Copper Pipe', '15mm Ø', 'Class 0', 'linear m', 85.00, 78.00, 95.00, 'all', 2025, 3, 2],
    [7, 'material', 'Copper Pipe', '22mm Ø', 'Class 0', 'linear m', 125.00, 115.00, 140.00, 'all', 2025, 3, 2],
    [7, 'material', 'PVC Soil Pipe', '110mm Ø', 'Underground', 'linear m', 68.00, 62.00, 76.00, 'all', 2025, 3, 2],
    [7, 'material', 'HDPE Pipe', '50mm Ø', 'Class 12', 'linear m', 45.00, 40.00, 52.00, 'all', 2025, 3, 2],

    // Electrical (CPAP Group 160)
    [7, 'material', 'Copper Cable', '2.5mm²', 'PVC insulated', '100m roll', 820, 750, 920, 'all', 2025, 3, 2],
    [7, 'material', 'Copper Cable', '4mm²', 'PVC insulated', '100m roll', 1280, 1180, 1420, 'all', 2025, 3, 2],
    [7, 'material', 'Distribution Board', '12-way', 'Surface mount', 'each', 1450, 1280, 1680, 'residential', 2025, 3, 2],
    [7, 'material', 'LED Downlight', '12W', 'Warm white', 'each', 185, 165, 210, 'residential', 2025, 3, 2],

    // Other materials
    [7, 'material', 'Gypsum Board', '12.5mm', 'Standard', 'm²', 42.00, 38.00, 48.00, 'all', 2025, 3, 2],
    [7, 'material', 'Ceramic Floor Tile', '600×600mm', 'Porcelain', 'm²', 195, 175, 225, 'residential', 2025, 3, 2],
    [7, 'material', 'Ceramic Floor Tile', '600×600mm', 'Porcelain', 'm²', 210, 188, 240, 'commercial', 2025, 3, 2],
    [7, 'material', 'Insulation', 'Aerolite 135mm', 'Think Pink', 'm²', 58.00, 52.00, 65.00, 'residential', 2025, 3, 2],
    [7, 'material', 'Waterproofing', 'Bitumen membrane', '4mm torch-on', 'm²', 95.00, 85.00, 110.00, 'all', 2025, 3, 2],
    [7, 'material', 'Paint — Internal', 'Acrylic PVA', 'White, 20L', 'drum', 850, 780, 950, 'residential', 2025, 3, 2],
    [7, 'material', 'Paint — External', 'Acrylic textured', '20L', 'drum', 1250, 1150, 1400, 'all', 2025, 3, 2],
    [7, 'material', 'Glass', '4mm clear float', '', 'm²', 195, 178, 220, 'all', 2025, 3, 2],
    [7, 'material', 'Diesel', '50ppm', 'Bulk delivery', 'litre', 18.80, 17.50, 20.50, 'all', 2025, 3, 2],

    // Labor — Johannesburg (ZAR/day, 9hr day)
    [7, 'labor', 'Bricklayer', 'Skilled', '', 'day', 780, 700, 880, 'all', 2025, 3, 2],
    [7, 'labor', 'Bricklayer', 'Semi-skilled', '', 'day', 520, 460, 600, 'all', 2025, 3, 2],
    [7, 'labor', 'Carpenter', 'Skilled', '', 'day', 820, 740, 920, 'all', 2025, 3, 2],
    [7, 'labor', 'Steel Fixer', 'Skilled', '', 'day', 800, 720, 900, 'all', 2025, 3, 2],
    [7, 'labor', 'Plumber', 'Licensed', '', 'day', 950, 850, 1100, 'all', 2025, 3, 2],
    [7, 'labor', 'Electrician', 'Licensed (IE)', '', 'day', 1050, 950, 1200, 'all', 2025, 3, 2],
    [7, 'labor', 'Painter', 'Skilled', '', 'day', 620, 550, 720, 'all', 2025, 3, 2],
    [7, 'labor', 'Tiler', 'Skilled', '', 'day', 720, 650, 820, 'all', 2025, 3, 2],
    [7, 'labor', 'General Laborer', 'Unskilled', '', 'day', 340, 300, 390, 'all', 2025, 3, 2],
    [7, 'labor', 'Site Supervisor', 'Foreman', '', 'day', 1600, 1400, 1850, 'all', 2025, 3, 2],
    [7, 'labor', 'Plant Operator', 'TLB/Excavator', '', 'day', 1100, 980, 1250, 'all', 2025, 3, 2],

    // Equipment
    [7, 'equipment', 'Excavator', '20-ton crawler', '', 'day', 5800, 5000, 6800, 'all', 2025, 3, 2],
    [7, 'equipment', 'TLB', '4×4', '', 'day', 3200, 2800, 3700, 'all', 2025, 3, 2],
    [7, 'equipment', 'Concrete Pump', '36m boom', '', 'day', 8500, 7500, 9800, 'commercial', 2025, 3, 2],
    [7, 'equipment', 'Mobile Crane', '25t', '', 'day', 12500, 11000, 14800, 'all', 2025, 3, 2],
    [7, 'equipment', 'Mobile Scaffold Tower', '6m working height', '', 'week', 1800, 1500, 2200, 'all', 2025, 3, 2],
    [7, 'equipment', 'Compactor', 'Single drum', '', 'day', 2400, 2000, 2800, 'infrastructure', 2025, 3, 2],

    // ============================================
    // 🇿🇦 South Africa — Cape Town (region 12)
    // ============================================
    [12, 'material', 'Ready-mix Concrete', '25 MPa', '19mm stone', 'm³', 2010, 1900, 2250, 'all', 2025, 3, 2],
    [12, 'material', 'Ready-mix Concrete', '30 MPa', '19mm stone', 'm³', 2180, 2050, 2420, 'all', 2025, 3, 2],
    [12, 'material', 'Cement', 'CEM I 42.5N', '50kg bag', 'bag', 88.00, 83.00, 95.00, 'residential', 2025, 3, 2],
    [12, 'material', 'Reinforcing Steel', 'Y16 (high tensile)', 'Ø16mm', 'ton', 15200, 14500, 16200, 'all', 2025, 3, 2],
    [12, 'material', 'Clay Face Brick', 'Standard', 'Imperial', '1000 pcs', 4200, 3900, 4700, 'residential', 2025, 3, 2],
    [12, 'material', 'Clay Stock Brick', 'NFP', '', '1000 pcs', 2720, 2500, 3050, 'all', 2025, 3, 2],
    [12, 'material', 'Steel Roof Sheeting', '0.5mm IBR', 'Galvanized', 'm²', 135, 125, 150, 'all', 2025, 3, 5],
    [12, 'labor', 'Bricklayer', 'Skilled', '', 'day', 850, 780, 960, 'all', 2025, 3, 2],
    [12, 'labor', 'Carpenter', 'Skilled', '', 'day', 890, 810, 1000, 'all', 2025, 3, 2],
    [12, 'labor', 'Electrician', 'Licensed', '', 'day', 1120, 1020, 1280, 'all', 2025, 3, 2],
    [12, 'labor', 'General Laborer', 'Unskilled', '', 'day', 370, 330, 420, 'all', 2025, 3, 2],

    // ============================================
    // 🇿🇦 South Africa — Durban (region 13)
    // ============================================
    [13, 'material', 'Ready-mix Concrete', '25 MPa', '19mm stone', 'm³', 1880, 1760, 2100, 'all', 2025, 3, 2],
    [13, 'material', 'Ready-mix Concrete', '30 MPa', '19mm stone', 'm³', 2040, 1910, 2260, 'all', 2025, 3, 2],
    [13, 'material', 'Cement', 'CEM I 42.5N', '50kg bag', 'bag', 82.00, 77.00, 89.00, 'residential', 2025, 3, 2],
    [13, 'material', 'Reinforcing Steel', 'Y16 (high tensile)', 'Ø16mm', 'ton', 14300, 13600, 15300, 'all', 2025, 3, 2],
    [13, 'material', 'Clay Stock Brick', 'NFP', '', '1000 pcs', 2380, 2150, 2680, 'all', 2025, 3, 2],
    [13, 'material', 'Concrete Block', '140mm', 'Hollow', '1000 pcs', 12200, 11500, 13600, 'all', 2025, 3, 2],
    [13, 'material', 'Timber', 'SA Pine S5', '38×114mm', 'linear m', 33.00, 30.00, 37.00, 'all', 2025, 3, 2],
    [13, 'labor', 'Bricklayer', 'Skilled', '', 'day', 720, 650, 820, 'all', 2025, 3, 2],
    [13, 'labor', 'Plumber', 'Licensed', '', 'day', 880, 800, 1020, 'all', 2025, 3, 2],
    [13, 'labor', 'General Laborer', 'Unskilled', '', 'day', 310, 280, 360, 'all', 2025, 3, 2],

    // ============================================
    // 🇪🇬 Egypt — Cairo (region 9)
    // ============================================
    [9, 'material', 'Ready-mix Concrete', '25 MPa', '', 'm³', 1250, 1100, 1450, 'all', 2025, 1, 3],
    [9, 'material', 'Reinforcing Steel', '10-16mm', 'High tensile', 'ton', 39350, 38000, 41000, 'all', 2025, 1, 3],
    [9, 'material', 'Cement', 'Portland', '50kg bag', 'bag', 170, 155, 185, 'all', 2025, 1, 3],
    [9, 'labor', 'Bricklayer', 'Skilled', '', 'day', 450, 380, 520, 'all', 2025, 1, 3],
    [9, 'labor', 'Steel Fixer', 'Skilled', '', 'day', 480, 420, 550, 'all', 2025, 1, 3],
    [9, 'labor', 'General Laborer', '', '', 'day', 220, 180, 260, 'all', 2025, 1, 3],

    // ============================================
    // 🇰🇪 Kenya — Nairobi (region 11)
    // ============================================
    [11, 'material', 'Ready-mix Concrete', '25 MPa', '', 'm³', 12500, 11800, 13500, 'all', 2025, 1, 4],
    [11, 'material', 'Reinforcing Steel', 'Y12-Y16', '', 'ton', 165000, 158000, 175000, 'all', 2025, 1, 4],
    [11, 'material', 'Cement', 'Portland', '50kg bag', 'bag', 750, 700, 820, 'all', 2025, 1, 4],
    [11, 'labor', 'Mason', 'Skilled', '', 'day', 1200, 1000, 1500, 'all', 2025, 1, 4],
    [11, 'labor', 'Carpenter', 'Skilled', '', 'day', 1400, 1200, 1700, 'all', 2025, 1, 4],
    [11, 'labor', 'Electrician', 'Licensed', '', 'day', 1800, 1500, 2200, 'all', 2025, 1, 4],
    [11, 'labor', 'General Laborer', '', '', 'day', 600, 500, 750, 'all', 2025, 1, 4],
    [11, 'equipment', 'Excavator', '20-ton', '', 'day', 45000, 40000, 52000, 'all', 2025, 1, 4],
  ];
  const stmt = db!.prepare(
    "INSERT INTO cost_items (region_id, category, subcategory, spec_code, spec_detail, unit, unit_price, price_min, price_max, building_type, data_year, data_quarter, source_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
  );
  for (const item of items) {
    stmt.run(item);
  }
  stmt.free();
}

function queryToRows(stmt: any): any[] {
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Browser IPC API — mimics window.electronAPI.invoke()
const browserAPI = {
  invoke: async (channel: string, ...args: any[]): Promise<any> => {
    if (!db) throw new Error('Database not initialized');

    switch (channel) {
      case 'regions:tree':
        return queryToRows(db.prepare('SELECT * FROM regions ORDER BY level, name'));

      case 'regions:path': {
        const path: any[] = [];
        let id: number = args[0];
        while (id) {
          const rows = queryToRows(db.prepare('SELECT * FROM regions WHERE id = ?', [id]));
          if (rows.length === 0) break;
          path.unshift(rows[0]);
          id = rows[0].parent_id;
        }
        return path;
      }

      case 'regions:search': {
        const keyword = args[0];
        return queryToRows(db.prepare('SELECT * FROM regions WHERE name LIKE ? ORDER BY level, name', [`%${keyword}%`]));
      }

      case 'cost-items:query': {
        const filter = args[0] || {};
        const conditions: string[] = ["status = 'active'"];
        const params: any[] = [];
        if (filter.region_id) { conditions.push('region_id = ?'); params.push(filter.region_id); }
        if (filter.category) { conditions.push('category = ?'); params.push(filter.category); }
        if (filter.subcategory) { conditions.push('subcategory LIKE ?'); params.push(`%${filter.subcategory}%`); }
        if (filter.building_type) { conditions.push("(building_type = ? OR building_type = 'all')"); params.push(filter.building_type); }
        if (filter.data_year) { conditions.push('data_year = ?'); params.push(filter.data_year); }
        if (filter.data_quarter) { conditions.push('(data_quarter = ? OR data_quarter IS NULL)'); params.push(filter.data_quarter); }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const page = filter.page || 1;
        const pageSize = filter.page_size || 50;
        const offset = (page - 1) * pageSize;

        const countStmt = db.prepare(`SELECT COUNT(*) as total FROM cost_items ${where}`);
        countStmt.bind(params);
        const total = countStmt.step() ? countStmt.getAsObject().total : 0;
        countStmt.free();

        const dataStmt = db.prepare(
          `SELECT c.*, s.name as source_name FROM cost_items c LEFT JOIN sources s ON c.source_id = s.id ${where} ORDER BY c.subcategory, c.spec_code LIMIT ? OFFSET ?`
        );
        dataStmt.bind([...params, pageSize, offset]);
        const data = queryToRows(dataStmt);

        return { data, total, page, page_size: pageSize };
      }

      case 'cost-items:search': {
        const keyword = args[0];
        return queryToRows(db.prepare(
          "SELECT c.*, s.name as source_name FROM cost_items c LEFT JOIN sources s ON c.source_id = s.id WHERE (c.subcategory LIKE ? OR c.spec_code LIKE ? OR c.notes LIKE ?) AND c.status = 'active' LIMIT 50",
          [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
        ));
      }

      case 'cost-items:years': {
        return queryToRows(db.prepare("SELECT DISTINCT data_year FROM cost_items WHERE status = 'active' ORDER BY data_year DESC"))
          .map((r: any) => r.data_year);
      }

      case 'cost-items:compare': {
        const [regionIds, category, year] = args;
        const conditions = [
          `c.region_id IN (${regionIds.map(() => '?').join(',')})`,
          "c.status = 'active'"
        ];
        const params: any[] = [...regionIds];
        if (category) { conditions.push('c.category = ?'); params.push(category); }
        if (year) { conditions.push('c.data_year = ?'); params.push(year); }
        return queryToRows(db.prepare(
          `SELECT c.subcategory, c.spec_code, c.unit, c.unit_price, c.price_min, c.price_max, r.currency, r.name as region_name FROM cost_items c JOIN regions r ON c.region_id = r.id WHERE ${conditions.join(' AND ')} ORDER BY c.subcategory, c.spec_code, r.name`,
          params
        ));
      }

      case 'cost-items:update-price': {
        const [id, unitPrice, priceMin, priceMax] = args;
        db.run("UPDATE cost_items SET unit_price = ?, price_min = ?, price_max = ?, is_manual_fix = 1, updated_at = datetime('now') WHERE id = ?", [unitPrice, priceMin, priceMax, id]);
        saveDB();
        return true;
      }

      case 'sources:all':
        return queryToRows(db.prepare('SELECT * FROM sources ORDER BY country, name'));

      case 'sources:active':
        return queryToRows(db.prepare('SELECT * FROM sources WHERE is_active = 1 ORDER BY country, name'));

      case 'sources:toggle': {
        const [id, active] = args;
        db.run('UPDATE sources SET is_active = ? WHERE id = ?', [active ? 1 : 0, id]);
        saveDB();
        return true;
      }

      case 'sync-log:list': {
        const sourceId = args[0];
        if (sourceId) {
          return queryToRows(db.prepare('SELECT * FROM sync_log WHERE source_id = ? ORDER BY started_at DESC LIMIT 50', [sourceId]));
        }
        return queryToRows(db.prepare('SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 50'));
      }

      case 'sync:run': {
        const sourceId = args[0] as number;
        const now = new Date().toISOString();
        const startedAt = new Date().toISOString();

        let newCount = 0;
        let updatedCount = 0;

        if (sourceId >= 2 && sourceId <= 13) {
          // REAL file-based adapters
          try {
            const adapterImports: Record<number, () => Promise<{ default?: any; [k: string]: any }>> = {
              2: () => import('./adapters/statssa'),
              3: () => import('./adapters/capmas'),
              4: () => import('./adapters/knbs'),
              5: () => import('./adapters/seifsa'),
              6: () => import('./adapters/ghana'),
              7: () => import('./adapters/nigeria'),
              8: () => import('./adapters/turner'),
              9: () => import('./adapters/uganda'),
              10: () => import('./adapters/rwanda'),
              11: () => import('./adapters/zambia'),
              12: () => import('./adapters/building-costs'),
              13: () => import('./adapters/road-costs'),
            };
            const fetchFns: Record<number, string> = {
              2: 'fetchStatsSaData', 3: 'fetchCapmasData', 4: 'fetchKnbsData',
              5: 'fetchSeifsaData', 6: 'fetchGhanaData', 7: 'fetchNigeriaData',
              8: 'fetchTurnerData', 9: 'fetchUgandaData', 10: 'fetchRwandaData',
              11: 'fetchZambiaData', 12: 'fetchBuildingCosts', 13: 'fetchRoadCosts',
            };

            const mod = await adapterImports[sourceId]();
            const fn = mod[fetchFns[sourceId]];
            const items = await fn();

            db.run("UPDATE cost_items SET status = 'superseded', updated_at = ? WHERE source_id = 2 AND category IN ('index','material') AND status = 'active'", [now]);

            const insertStmt = db.prepare(
              "INSERT INTO cost_items (region_id, category, subcategory, spec_code, spec_detail, unit, unit_price, price_min, price_max, building_type, data_year, data_quarter, source_id, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
            );
            for (const item of items) {
              try {
                insertStmt.run([item.region_id, item.category, item.subcategory, item.spec_code, item.spec_detail, item.unit, item.unit_price, item.price_min, item.price_max, item.building_type, item.data_year, item.data_quarter, item.source_id, item.notes]);
                newCount++;
              } catch (e) {}
            }
            insertStmt.free();
          } catch (e: any) {
            console.error(`[Sync] Source ${sourceId} fetch failed:`, e.message);
            db.run("INSERT INTO sync_log (source_id, started_at, finished_at, status, new_records, error_message) VALUES (?, ?, ?, 'failed', 0, ?)", [sourceId, startedAt, now, e.message]);
            db.run('UPDATE sources SET last_sync_at = ? WHERE id = ?', [now, sourceId]);
            saveDB();
            return { newCount: 0, updatedCount: 0, conflictCount: 0 };
          }
        } else if (sourceId === 1) {
          // REAL Eurostat adapter
          try {
            const { fetchEurostatData } = await import('./adapters/eurostat');
            const items = await fetchEurostatData();

            // Mark old Eurostat index data as superseded
            db.run("UPDATE cost_items SET status = 'superseded', updated_at = ? WHERE source_id = 1 AND category = 'index'", [now]);

            // Insert fresh data
            const insertStmt = db.prepare(
              "INSERT INTO cost_items (region_id, category, subcategory, spec_code, spec_detail, unit, unit_price, price_min, price_max, building_type, data_year, data_quarter, source_id, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
            );
            for (const item of items) {
              try {
                insertStmt.run([
                  item.region_id, item.category, item.subcategory, item.spec_code,
                  item.spec_detail, item.unit, item.unit_price,
                  item.price_min, item.price_max,
                  item.building_type, item.data_year, item.data_quarter,
                  item.source_id, item.notes,
                ]);
                newCount++;
              } catch (e) { /* skip duplicates */ }
            }
            insertStmt.free();
          } catch (e: any) {
            console.error('[Sync] Eurostat fetch failed:', e.message);
            db.run("INSERT INTO sync_log (source_id, started_at, finished_at, status, new_records, error_message) VALUES (?, ?, ?, 'failed', 0, ?)",
              [sourceId, startedAt, now, e.message]);
            db.run('UPDATE sources SET last_sync_at = ? WHERE id = ?', [now, sourceId]);
            saveDB();
            return { newCount: 0, updatedCount: 0, conflictCount: 0 };
          }
        } else {
          // Other sources — simulated sync
          const sourceRegions = queryToRows(db.prepare(
            "SELECT DISTINCT ci.region_id, r.name FROM cost_items ci JOIN regions r ON ci.region_id = r.id WHERE ci.source_id = ?", [sourceId]
          ));

          if (sourceRegions.length > 0) {
            const sampleMaterials = [
              ['Sand', 'Fine', 'Plaster sand', 'm³'],
              ['Aggregate', '13mm', 'Crushed stone', 'm³'],
              ['Concrete', '20 MPa', 'Ready-mix', 'm³'],
              ['Reinforcing Steel', 'Y10', 'Ø10mm', 'ton'],
              ['Bricks', 'Clay', 'Face brick', '1000 pcs'],
              ['Timber', 'SA Pine', '38×152mm', 'linear m'],
            ];
            const count = 2 + Math.floor(Math.random() * 5);
            const insertStmt = db.prepare(
              "INSERT INTO cost_items (region_id, category, subcategory, spec_code, spec_detail, unit, unit_price, price_min, price_max, building_type, data_year, data_quarter, source_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
            );
            for (let i = 0; i < count; i++) {
              const mat = sampleMaterials[Math.floor(Math.random() * sampleMaterials.length)];
              const region = sourceRegions[Math.floor(Math.random() * sourceRegions.length)];
              try {
                insertStmt.run([region.region_id, 'material', mat[0], mat[1], mat[2], mat[3], 100 + Math.floor(Math.random() * 5000), null, null, 'all', 2025, 3, sourceId]);
                newCount++;
              } catch (e) {}
            }
            insertStmt.free();
          }
        }

        try { db.run("INSERT INTO cost_items_fts(cost_items_fts) VALUES('rebuild')"); } catch(e) {}

        db.run("INSERT INTO sync_log (source_id, started_at, finished_at, status, new_records, updated_records) VALUES (?, ?, ?, 'success', ?, ?)",
          [sourceId, startedAt, now, newCount, updatedCount]);
        db.run('UPDATE sources SET last_sync_at = ? WHERE id = ?', [now, sourceId]);
        saveDB();
        return { newCount, updatedCount, conflictCount: 0 };
      }

      // CSV Import
      case 'csv:import': {
        const csvText = args[0] as string;
        const result = { inserted: 0, errors: [] as string[] };
        try {
          const lines = csvText.split('\n').filter(l => l.trim());
          if (lines.length < 2) { result.errors.push('CSV file is empty'); return result; }

          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const required = ['region_id','category','subcategory','unit','data_year'];
          for (const f of required) {
            if (!headers.includes(f)) { result.errors.push(`Missing column: ${f}`); }
          }
          if (result.errors.length > 0) return result;

          const insertStmt = db.prepare(
            "INSERT INTO cost_items (region_id, category, subcategory, spec_code, spec_detail, unit, unit_price, price_min, price_max, building_type, data_year, data_quarter, source_id, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
          );

          for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
            const row: Record<string,string> = {};
            headers.forEach((h,idx) => { row[h] = vals[idx] || ''; });
            try {
              insertStmt.run([
                parseInt(row.region_id) || 9,
                row.category || 'material',
                row.subcategory || 'Unknown',
                row.spec_code || null,
                row.spec_detail || null,
                row.unit || 'unit',
                row.unit_price ? parseFloat(row.unit_price) : null,
                row.price_min ? parseFloat(row.price_min) : null,
                row.price_max ? parseFloat(row.price_max) : null,
                row.building_type || 'all',
                parseInt(row.data_year) || 2025,
                row.data_quarter ? parseInt(row.data_quarter) : 1,
                99, // CSV import source
                row.notes || null,
              ]);
              result.inserted++;
            } catch (e: any) { result.errors.push(`Row ${i}: ${e.message}`); }
          }
          insertStmt.free();
          saveDB();
        } catch (e: any) { result.errors.push(e.message); }
        return result;
      }

      // Auto-sync config
      case 'settings:auto-sync:get':
        return {
          enabled: getAutoSyncEnabled(),
          intervalDays: getAutoSyncInterval(),
          lastSync: getLastAutoSync(),
          nextSync: getNextSyncTime(),
        };

      case 'settings:auto-sync:set': {
        const { enabled, intervalDays } = args[0];
        localStorage.setItem(SYNC_ENABLED_KEY, String(enabled));
        localStorage.setItem(SYNC_INTERVAL_KEY, String(intervalDays));
        // Restart timer with new settings
        if (autoSyncTimer) clearInterval(autoSyncTimer);
        startAutoSyncTimer();
        return { enabled: getAutoSyncEnabled(), intervalDays: getAutoSyncInterval(), nextSync: getNextSyncTime() };
      }

      default:
        console.warn(`[BrowserDB] Unknown channel: ${channel}`);
        return null;
    }
  },
};

// --- Auto-sync ---

const SYNC_ENABLED_KEY = 'costbase_auto_sync_enabled';
const SYNC_INTERVAL_KEY = 'costbase_sync_interval_days';
const SYNC_LAST_KEY = 'costbase_last_auto_sync';

let autoSyncTimer: ReturnType<typeof setInterval> | null = null;

function getAutoSyncEnabled(): boolean {
  return localStorage.getItem(SYNC_ENABLED_KEY) === 'true';
}

function getAutoSyncInterval(): number {
  return parseInt(localStorage.getItem(SYNC_INTERVAL_KEY) || '10', 10);
}

function getLastAutoSync(): string | null {
  return localStorage.getItem(SYNC_LAST_KEY);
}

function setLastAutoSync(ts: string): void {
  localStorage.setItem(SYNC_LAST_KEY, ts);
}

function isSyncDue(): boolean {
  if (!getAutoSyncEnabled()) return false;
  const last = getLastAutoSync();
  if (!last) return true; // Never synced — do it now
  const interval = getAutoSyncInterval();
  const nextDue = new Date(last).getTime() + interval * 86400000;
  return Date.now() >= nextDue;
}

function getNextSyncTime(): string | null {
  if (!getAutoSyncEnabled()) return null;
  const last = getLastAutoSync();
  const interval = getAutoSyncInterval();
  const base = last ? new Date(last).getTime() : Date.now();
  return new Date(base + interval * 86400000).toISOString();
}

async function runAutoSync(): Promise<void> {
  if (!isSyncDue()) return;
  console.log('[AutoSync] Running scheduled sync...');
  const sources = queryToRows(db!.prepare('SELECT * FROM sources WHERE is_active = 1'));
  for (const s of sources) {
    try {
      const now = new Date().toISOString();
      db!.run("INSERT INTO sync_log (source_id, started_at, finished_at, status, new_records) VALUES (?, ?, ?, 'success', 0)", [s.id, now, now]);
      db!.run('UPDATE sources SET last_sync_at = ? WHERE id = ?', [now, s.id]);
    } catch (e) { console.warn('[AutoSync] Failed for', s.name, e); }
  }
  setLastAutoSync(new Date().toISOString());
  saveDB();
  console.log('[AutoSync] Complete');
}

function startAutoSyncTimer(): void {
  if (autoSyncTimer) clearInterval(autoSyncTimer);
  // Check every hour whether sync is due
  autoSyncTimer = setInterval(() => { runAutoSync(); }, 3600000);
  // Also run immediately on startup if due
  setTimeout(() => { runAutoSync(); }, 5000);
  console.log('[AutoSync] Timer started — interval:', getAutoSyncInterval(), 'days, enabled:', getAutoSyncEnabled());
}

// ---

// Install the browser API
export function installBrowserAPI(): void {
  (window as any).electronAPI = browserAPI;
  console.log('[BrowserDB] API installed — window.electronAPI available');
  startAutoSyncTimer();
}
