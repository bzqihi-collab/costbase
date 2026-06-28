import { getDB } from './connection';

const MIGRATIONS = [
  {
    version: 1,
    name: 'create_tables',
    sql: `
      CREATE TABLE IF NOT EXISTS regions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        level TEXT NOT NULL CHECK(level IN ('country','state','city')),
        parent_id INTEGER REFERENCES regions(id),
        currency TEXT NOT NULL,
        unit_system TEXT NOT NULL DEFAULT 'metric' CHECK(unit_system IN ('metric','imperial')),
        iso_code TEXT
      );

      CREATE TABLE IF NOT EXISTS sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('gov_platform','official_statistics','industry_assoc')),
        country TEXT,
        url TEXT,
        api_endpoint TEXT,
        access_type TEXT DEFAULT 'public' CHECK(access_type IN ('public','api_free','api_key','manual_import')),
        sync_frequency TEXT CHECK(sync_frequency IN ('weekly','monthly','quarterly')),
        last_sync_at TEXT,
        is_active INTEGER DEFAULT 1,
        api_config TEXT,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS cost_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region_id INTEGER NOT NULL REFERENCES regions(id),
        category TEXT NOT NULL CHECK(category IN ('material','labor','equipment','transport')),
        subcategory TEXT NOT NULL,
        spec_code TEXT,
        spec_detail TEXT,
        unit TEXT NOT NULL,
        unit_price REAL,
        price_min REAL,
        price_max REAL,
        building_type TEXT DEFAULT 'all',
        data_year INTEGER NOT NULL,
        data_quarter INTEGER CHECK(data_quarter BETWEEN 1 AND 4),
        source_id INTEGER REFERENCES sources(id),
        is_manual_fix INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active' CHECK(status IN ('active','superseded')),
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS cost_items_staging (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id TEXT NOT NULL,
        source_id INTEGER REFERENCES sources(id),
        data_json TEXT NOT NULL,
        validation_status TEXT DEFAULT 'pending' CHECK(validation_status IN ('pending','valid','invalid')),
        validation_errors TEXT,
        merge_status TEXT DEFAULT 'pending' CHECK(merge_status IN ('pending','merged','conflict','skipped')),
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER REFERENCES sources(id),
        started_at TEXT,
        finished_at TEXT,
        status TEXT CHECK(status IN ('success','partial','failed')),
        new_records INTEGER DEFAULT 0,
        updated_records INTEGER DEFAULT 0,
        conflicts INTEGER DEFAULT 0,
        error_message TEXT,
        details TEXT
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS cost_items_fts USING fts5(
        subcategory, spec_code, spec_detail, notes,
        content='cost_items', content_rowid='id'
      );

      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT DEFAULT (datetime('now'))
      );
    `,
  },
];

export function runMigrations(): void {
  const db = getDB();

  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT DEFAULT (datetime('now'))
  )`);

  const applied = db.prepare('SELECT version FROM _migrations').all() as { version: number }[];
  const appliedVersions = new Set(applied.map((r) => r.version));

  for (const m of MIGRATIONS) {
    if (!appliedVersions.has(m.version)) {
      const migrate = db.transaction(() => {
        db.exec(m.sql);
        db.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)').run(m.version, m.name);
      });
      migrate();
      console.log(`Migration v${m.version}: ${m.name} — applied`);
    }
  }
}
