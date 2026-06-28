# 建筑行业海外费用标准知识库系统 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 Electron + React + SQLite 桌面应用，供咨询顾问按国家/地区查询建筑费用标准，支持离线查询和定时同步外部官方数据源。

**Architecture:** Electron 双进程架构 — React 渲染进程负责 UI（三栏布局：导航/筛选/数据表格），Node.js 主进程负责 SQLite 数据库操作、数据源适配器、定时同步调度。通过 contextBridge IPC 通信，Zod 做数据校验，better-sqlite3 做本地存储。

**Tech Stack:** Electron 30+, React 18, TypeScript 5, better-sqlite3, Zod, Tailwind CSS, exceljs, jsPDF, node-cron, electron-builder

---

## 文件结构规划

```
cost-knowledge-base/
├── electron/
│   ├── main.ts                 # Electron 主入口，窗口创建，IPC 注册
│   ├── preload.ts              # contextBridge 暴露安全 API
│   ├── adapters/
│   │   ├── base.ts             # 适配器基类/接口定义
│   │   ├── eurostat.ts         # Eurostat SDMX API 适配器
│   │   ├── csv-import.ts       # 通用 CSV 导入适配器
│   │   └── index.ts            # 适配器注册表
│   ├── sync/
│   │   ├── scheduler.ts        # node-cron 定时任务
│   │   ├── pipeline.ts         # staging → 校验 → 合并管道
│   │   └── conflict.ts         # 冲突检测
│   ├── db/
│   │   ├── connection.ts       # better-sqlite3 单例
│   │   ├── migrate.ts          # 迁移执行器
│   │   ├── queries/
│   │   │   ├── regions.ts      # 地区查询
│   │   │   ├── cost-items.ts   # 费用条目查询
│   │   │   ├── sources.ts      # 数据源查询
│   │   │   └── sync-log.ts     # 同步日志查询
│   │   └── seed.ts             # 初始种子数据
│   ├── export/
│   │   ├── excel.ts            # Excel 导出
│   │   └── pdf.ts              # PDF 导出
│   └── ipc/
│       └── handlers.ts         # IPC handler 注册
├── src/
│   ├── main.tsx                # React 入口
│   ├── App.tsx                 # 路由 + 布局壳
│   ├── components/
│   │   ├── Layout.tsx          # 三栏布局容器
│   │   ├── Sidebar.tsx         # 左侧导航
│   │   ├── StatusBar.tsx       # 底部状态栏
│   │   ├── RegionTree.tsx      # 地区层级树选择器
│   │   ├── FilterPanel.tsx     # 中间筛选面板
│   │   ├── CostTable.tsx       # 费用数据表格
│   │   ├── SearchBar.tsx       # 全文搜索
│   │   ├── ComparisonView.tsx  # 地区对比视图
│   │   ├── SyncManager.tsx     # 同步管理面板
│   │   ├── SyncLogTable.tsx    # 同步日志表格
│   │   └── SettingsPanel.tsx   # 设置面板
│   ├── hooks/
│   │   ├── useIPC.ts           # IPC 调用 hook
│   │   ├── useRegions.ts       # 地区数据 hook
│   │   ├── useCostItems.ts     # 费用数据 hook
│   │   └── useSync.ts          # 同步状态 hook
│   └── index.css               # Tailwind + 全局样式
├── shared/
│   ├── types.ts                # 共享类型定义
│   └── schemas.ts              # Zod 校验 schema
├── resources/                  # 图标等
├── package.json
├── tsconfig.json
├── electron-builder.yml
├── tailwind.config.js
├── vite.config.ts              # Vite (渲染进程打包)
└── vite.electron.config.ts     # Vite (主进程打包)
```

---

### Task 1: 项目脚手架搭建

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vite.electron.config.ts`, `tailwind.config.js`, `electron-builder.yml`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Create: `electron/main.ts`, `electron/preload.ts`

- [ ] **Step 1: 初始化 package.json 并安装依赖**

```bash
mkdir -p cost-knowledge-base && cd cost-knowledge-base
npm init -y
```

```bash
npm install react react-dom react-router-dom
npm install -D typescript @types/react @types/react-dom vite @vitejs/plugin-react electron electron-builder better-sqlite3 @types/better-sqlite3 zod exceljs jspdf node-cron @types/node-cron tailwindcss postcss autoprefixer concurrently
```

- [ ] **Step 2: 配置 package.json 脚本和入口**

```json
{
  "name": "cost-knowledge-base",
  "version": "1.0.0",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"tsc -p tsconfig.electron.json --watch\" \"electron .\"",
    "build": "vite build && tsc -p tsconfig.electron.json && electron-builder",
    "start": "electron ."
  }
}
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": { "@shared/*": ["shared/*"] }
  },
  "include": ["src/**/*", "electron/**/*", "shared/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: 创建 Vite 配置**

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',
  build: { outDir: 'dist' },
  resolve: {
    alias: { '@shared': path.resolve(__dirname, 'shared') }
  }
});
```

- [ ] **Step 5: 创建 Electron 主入口**

```typescript
// electron/main.ts
import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
```

- [ ] **Step 6: 创建 preload.ts**

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
```

- [ ] **Step 7: 创建 React 入口和最小 App**

```typescript
// src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
```

```typescript
// src/App.tsx
import React from 'react';

export default function App() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
      <h1 className="text-3xl font-bold">CostBase — 建筑费用知识库</h1>
    </div>
  );
}
```

- [ ] **Step 8: 创建 TypeScript 类型声明**

```typescript
// src/types/electron.d.ts
export interface ElectronAPI {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

- [ ] **Step 9: 验证项目可启动**

```bash
npx vite build && npx tsc electron/main.ts --outDir dist-electron --module commonjs --target es2022 --esModuleInterop --skipLibCheck
npx electron .
```

期望：Electron 窗口打开，显示 "CostBase — 建筑费用知识库"。

- [ ] **Step 10: 提交**

```bash
git init && git add -A && git commit -m "feat: scaffold Electron + React project"
```

---

### Task 2: 共享类型与 Zod Schema

**Files:**
- Create: `shared/types.ts`
- Create: `shared/schemas.ts`

- [ ] **Step 1: 创建共享类型定义**

```typescript
// shared/types.ts

export interface Region {
  id: number;
  name: string;
  level: 'country' | 'state' | 'city';
  parent_id: number | null;
  currency: string;
  unit_system: 'metric' | 'imperial';
  iso_code: string;
}

export interface CostItem {
  id: number;
  region_id: number;
  category: 'material' | 'labor' | 'equipment' | 'transport';
  subcategory: string;
  spec_code: string | null;
  spec_detail: string | null;
  unit: string;
  unit_price: number | null;
  price_min: number | null;
  price_max: number | null;
  building_type: string;
  data_year: number;
  data_quarter: number;
  source_id: number;
  is_manual_fix: number;
  status: 'active' | 'superseded';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DataSource {
  id: number;
  name: string;
  type: 'gov_platform' | 'official_statistics' | 'industry_assoc';
  country: string;
  url: string;
  api_endpoint: string | null;
  access_type: 'public' | 'api_free' | 'api_key' | 'manual_import';
  sync_frequency: 'weekly' | 'monthly' | 'quarterly' | null;
  last_sync_at: string | null;
  is_active: number;
  api_config: string | null;
  notes: string | null;
}

export interface SyncLog {
  id: number;
  source_id: number;
  started_at: string;
  finished_at: string | null;
  status: 'success' | 'partial' | 'failed';
  new_records: number;
  updated_records: number;
  conflicts: number;
  error_message: string | null;
  details: string | null;
}

export interface CostItemFilter {
  region_id?: number;
  category?: string;
  subcategory?: string;
  building_type?: string;
  data_year?: number;
  data_quarter?: number;
  keyword?: string;
  page?: number;
  page_size?: number;
}

export interface QueryResult<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ComparisonRow {
  subcategory: string;
  spec_code: string;
  unit: string;
  prices: Record<string, { unit_price: number | null; price_min: number | null; price_max: number | null; currency: string }>;
}

export interface SyncResult {
  source_id: number;
  status: 'success' | 'partial' | 'failed';
  new_records: number;
  updated_records: number;
  conflicts: number;
  error_message?: string;
}
```

- [ ] **Step 2: 创建 Zod 校验 schema**

```typescript
// shared/schemas.ts
import { z } from 'zod';

export const costItemSchema = z.object({
  region_id: z.number().int().positive(),
  category: z.enum(['material', 'labor', 'equipment', 'transport']),
  subcategory: z.string().min(1).max(200),
  spec_code: z.string().max(100).nullable(),
  spec_detail: z.string().max(200).nullable(),
  unit: z.string().min(1).max(50),
  unit_price: z.number().nonnegative().nullable(),
  price_min: z.number().nonnegative().nullable(),
  price_max: z.number().nonnegative().nullable(),
  building_type: z.string().default('all'),
  data_year: z.number().int().min(2000).max(2100),
  data_quarter: z.number().int().min(1).max(4),
  source_id: z.number().int().positive(),
  notes: z.string().max(1000).nullable(),
});

export const costItemBatchSchema = z.array(costItemSchema);

export const regionSchema = z.object({
  name: z.string().min(1).max(200),
  level: z.enum(['country', 'state', 'city']),
  parent_id: z.number().int().positive().nullable(),
  currency: z.string().length(3),
  unit_system: z.enum(['metric', 'imperial']),
  iso_code: z.string().length(2),
});

export const sourceSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['gov_platform', 'official_statistics', 'industry_assoc']),
  country: z.string().length(2),
  url: z.string().url(),
  api_endpoint: z.string().url().nullable(),
  access_type: z.enum(['public', 'api_free', 'api_key', 'manual_import']),
  sync_frequency: z.enum(['weekly', 'monthly', 'quarterly']).nullable(),
});
```

- [ ] **Step 3: 提交**

```bash
git add shared/ && git commit -m "feat: add shared types and Zod schemas"
```

---

### Task 3: 数据库层 — 连接、迁移、种子数据

**Files:**
- Create: `electron/db/connection.ts`
- Create: `electron/db/migrate.ts`
- Create: `electron/db/seed.ts`
- Create: `electron/db/queries/regions.ts`
- Create: `electron/db/queries/cost-items.ts`
- Create: `electron/db/queries/sources.ts`
- Create: `electron/db/queries/sync-log.ts`

- [ ] **Step 1: 创建数据库连接单例**

```typescript
// electron/db/connection.ts
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'costbase.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}
```

- [ ] **Step 2: 创建迁移模块**

```typescript
// electron/db/migrate.ts
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
```

- [ ] **Step 3: 创建种子数据**

```typescript
// electron/db/seed.ts
import { getDB } from './connection';
import { runMigrations } from './migrate';

export function seedInitialData(): void {
  const db = getDB();

  const regionCount = db.prepare('SELECT COUNT(*) as count FROM regions').get() as { count: number };
  if (regionCount.count > 0) return;

  const insert = db.transaction(() => {
    // 注册数据源
    const sources = [
      { name: 'Eurostat Construction Cost Index', type: 'official_statistics', country: 'EU', url: 'https://ec.europa.eu/eurostat', api_endpoint: 'https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/sts_copi_a', access_type: 'api_free', sync_frequency: 'quarterly' },
      { name: 'Stats SA Construction Material Price Indices', type: 'official_statistics', country: 'ZA', url: 'https://www.statssa.gov.za', access_type: 'public', sync_frequency: 'monthly' },
      { name: 'CAPMAS Building Materials Bulletin', type: 'official_statistics', country: 'EG', url: 'https://www.eip.gov.eg', access_type: 'public', sync_frequency: 'monthly' },
      { name: 'KNBS Construction Input Price Indices', type: 'official_statistics', country: 'KE', url: 'https://www.knbs.or.ke', access_type: 'public', sync_frequency: 'quarterly' },
    ];
    const insertSource = db.prepare(
      'INSERT INTO sources (name, type, country, url, api_endpoint, access_type, sync_frequency) VALUES (?,?,?,?,?,?,?)'
    );
    for (const s of sources) {
      insertSource.run(s.name, s.type, s.country, s.url, s.api_endpoint || null, s.access_type, s.sync_frequency);
    }

    // 注册示例地区
    const regions = [
      { name: '德国', level: 'country', parent_id: null, currency: 'EUR', unit_system: 'metric', iso_code: 'DE' },
      { name: '巴伐利亚', level: 'state', parent_id: 1, currency: 'EUR', unit_system: 'metric', iso_code: null },
      { name: '慕尼黑', level: 'city', parent_id: 2, currency: 'EUR', unit_system: 'metric', iso_code: null },
      { name: '日本', level: 'country', parent_id: null, currency: 'JPY', unit_system: 'metric', iso_code: 'JP' },
      { name: '東京', level: 'city', parent_id: 4, currency: 'JPY', unit_system: 'metric', iso_code: null },
      { name: '南非', level: 'country', parent_id: null, currency: 'ZAR', unit_system: 'metric', iso_code: 'ZA' },
      { name: '约翰内斯堡', level: 'city', parent_id: 6, currency: 'ZAR', unit_system: 'metric', iso_code: null },
    ];
    const insertRegion = db.prepare(
      'INSERT INTO regions (name, level, parent_id, currency, unit_system, iso_code) VALUES (?,?,?,?,?,?)'
    );
    for (const r of regions) {
      insertRegion.run(r.name, r.level, r.parent_id, r.currency, r.unit_system, r.iso_code);
    }

    // 插入示例费用数据
    const sampleItems = [
      { region_id: 3, category: 'material', subcategory: '混凝土', spec_code: 'C30/37', spec_detail: '泵送', unit: 'm³', unit_price: 128.50, price_min: 118.00, price_max: 142.00, data_year: 2025, data_quarter: 2, source_id: 1, building_type: 'all' },
      { region_id: 3, category: 'material', subcategory: '混凝土', spec_code: 'C30/37', spec_detail: '非泵送', unit: 'm³', unit_price: 115.00, price_min: 105.00, price_max: 128.00, data_year: 2025, data_quarter: 2, source_id: 1, building_type: 'all' },
      { region_id: 3, category: 'material', subcategory: '钢筋', spec_code: 'HRB400', spec_detail: 'Φ12-16mm', unit: '吨', unit_price: 892.00, price_min: 845.00, price_max: 940.00, data_year: 2025, data_quarter: 2, source_id: 1, building_type: 'all' },
      { region_id: 5, category: 'material', subcategory: 'コンクリート', spec_code: 'JIS A 5308', spec_detail: '21-18-20N', unit: 'm³', unit_price: 18500, price_min: 17500, price_max: 20000, data_year: 2025, data_quarter: 1, source_id: 1, building_type: 'all' },
      { region_id: 5, category: 'material', subcategory: '鉄筋', spec_code: 'SD345', spec_detail: 'D16-D25', unit: 'トン', unit_price: 128000, price_min: 122000, price_max: 135000, data_year: 2025, data_quarter: 1, source_id: 1, building_type: 'all' },
      { region_id: 7, category: 'material', subcategory: 'Concrete', spec_code: '25 MPa', spec_detail: 'Ready-mix', unit: 'm³', unit_price: 1850, price_min: 1750, price_max: 2100, data_year: 2025, data_quarter: 1, source_id: 2, building_type: 'all' },
      { region_id: 7, category: 'material', subcategory: 'Reinforcing Steel', spec_code: 'Y12-Y16', spec_detail: 'High tensile', unit: 'ton', unit_price: 14500, price_min: 13800, price_max: 15500, data_year: 2025, data_quarter: 1, source_id: 2, building_type: 'all' },
    ];
    const insertItem = db.prepare(
      `INSERT INTO cost_items (region_id, category, subcategory, spec_code, spec_detail, unit, unit_price, price_min, price_max, data_year, data_quarter, source_id, building_type)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    for (const item of sampleItems) {
      insertItem.run(item.region_id, item.category, item.subcategory, item.spec_code, item.spec_detail, item.unit, item.unit_price, item.price_min, item.price_max, item.data_year, item.data_quarter, item.source_id, item.building_type);
    }

    // 重建 FTS 索引
    db.exec("INSERT INTO cost_items_fts(cost_items_fts) VALUES('rebuild')");
  });

  insert();
  console.log('Seed data inserted: 7 regions, 4 sources, 7 sample cost items');
}
```

- [ ] **Step 4: 创建地区查询模块**

```typescript
// electron/db/queries/regions.ts
import { getDB } from '../connection';
import { Region } from '../../../shared/types';

export function getRegionTree(): Region[] {
  return getDB().prepare(
    'SELECT * FROM regions ORDER BY level, name'
  ).all() as Region[];
}

export function getRegionById(id: number): Region | undefined {
  return getDB().prepare('SELECT * FROM regions WHERE id = ?').get(id) as Region | undefined;
}

export function getChildren(parentId: number): Region[] {
  return getDB().prepare('SELECT * FROM regions WHERE parent_id = ? ORDER BY name').all(parentId) as Region[];
}

export function searchRegions(keyword: string): Region[] {
  return getDB().prepare(
    'SELECT * FROM regions WHERE name LIKE ? ORDER BY level, name'
  ).all(`%${keyword}%`) as Region[];
}

export function getRegionPath(regionId: number): Region[] {
  const path: Region[] = [];
  let current: Region | undefined = getRegionById(regionId);
  while (current) {
    path.unshift(current);
    current = current.parent_id ? getRegionById(current.parent_id) : undefined;
  }
  return path;
}

export function createRegion(region: Omit<Region, 'id'>): Region {
  const result = getDB().prepare(
    'INSERT INTO regions (name, level, parent_id, currency, unit_system, iso_code) VALUES (?,?,?,?,?,?)'
  ).run(region.name, region.level, region.parent_id, region.currency, region.unit_system, region.iso_code);
  return getRegionById(result.lastInsertRowid as number)!;
}
```

- [ ] **Step 5: 创建费用条目查询模块**

```typescript
// electron/db/queries/cost-items.ts
import { getDB } from '../connection';
import { CostItem, CostItemFilter, QueryResult } from '../../../shared/types';

export function queryCostItems(filter: CostItemFilter): QueryResult<CostItem> {
  const db = getDB();
  const conditions: string[] = ['ci.status = ?'];
  const params: unknown[] = ['active'];

  if (filter.region_id) {
    conditions.push('ci.region_id = ?');
    params.push(filter.region_id);
  }
  if (filter.category) {
    conditions.push('ci.category = ?');
    params.push(filter.category);
  }
  if (filter.subcategory) {
    conditions.push('ci.subcategory LIKE ?');
    params.push(`%${filter.subcategory}%`);
  }
  if (filter.building_type) {
    conditions.push('(ci.building_type = ? OR ci.building_type = ?)');
    params.push(filter.building_type, 'all');
  }
  if (filter.data_year) {
    conditions.push('ci.data_year = ?');
    params.push(filter.data_year);
  }
  if (filter.data_quarter) {
    conditions.push('(ci.data_quarter = ? OR ci.data_quarter IS NULL)');
    params.push(filter.data_quarter);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = filter.page || 1;
  const pageSize = filter.page_size || 50;
  const offset = (page - 1) * pageSize;

  const countResult = db.prepare(
    `SELECT COUNT(*) as total FROM cost_items ci ${whereClause}`
  ).get(...params) as { total: number };

  const data = db.prepare(
    `SELECT ci.*, s.name as source_name
     FROM cost_items ci
     LEFT JOIN sources s ON ci.source_id = s.id
     ${whereClause}
     ORDER BY ci.subcategory, ci.spec_code
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset) as CostItem[];

  return { data, total: countResult.total, page, page_size: pageSize };
}

export function searchCostItems(keyword: string, limit = 50): CostItem[] {
  const db = getDB();
  const rows = db.prepare(
    `SELECT ci.*, s.name as source_name
     FROM cost_items_fts fts
     JOIN cost_items ci ON fts.rowid = ci.id
     LEFT JOIN sources s ON ci.source_id = s.id
     WHERE cost_items_fts MATCH ? AND ci.status = 'active'
     ORDER BY rank
     LIMIT ?`
  ).all(keyword, limit) as CostItem[];
  return rows;
}

export function getDistinctYears(): number[] {
  return getDB().prepare(
    'SELECT DISTINCT data_year FROM cost_items WHERE status = ? ORDER BY data_year DESC'
  ).all('active').map((r: any) => r.data_year);
}

export function getComparisonData(regionIds: number[], category?: string, year?: number): Map<string, any> {
  const db = getDB();
  const conditions = ['ci.region_id IN (' + regionIds.map(() => '?').join(',') + ')', "ci.status = 'active'"];
  const params: unknown[] = [...regionIds];

  if (category) { conditions.push('ci.category = ?'); params.push(category); }
  if (year) { conditions.push('ci.data_year = ?'); params.push(year); }

  return db.prepare(
    `SELECT ci.subcategory, ci.spec_code, ci.unit, ci.unit_price, ci.price_min, ci.price_max, r.currency, r.name as region_name
     FROM cost_items ci
     JOIN regions r ON ci.region_id = r.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ci.subcategory, ci.spec_code, r.name`
  ).all(...params) as any;
}

export function updateCostItemPrice(id: number, unitPrice: number, priceMin: number, priceMax: number): void {
  getDB().prepare(
    `UPDATE cost_items SET unit_price = ?, price_min = ?, price_max = ?, is_manual_fix = 1, updated_at = datetime('now') WHERE id = ?`
  ).run(unitPrice, priceMin, priceMax, id);
}
```

- [ ] **Step 6: 创建数据源和同步日志查询**

```typescript
// electron/db/queries/sources.ts
import { getDB } from '../connection';
import { DataSource } from '../../../shared/types';

export function getAllSources(): DataSource[] {
  return getDB().prepare('SELECT * FROM sources ORDER BY country, name').all() as DataSource[];
}

export function getActiveSources(): DataSource[] {
  return getDB().prepare('SELECT * FROM sources WHERE is_active = 1 ORDER BY country, name').all() as DataSource[];
}

export function updateSourceLastSync(sourceId: number, timestamp: string): void {
  getDB().prepare('UPDATE sources SET last_sync_at = ? WHERE id = ?').run(timestamp, sourceId);
}

export function toggleSource(sourceId: number, active: boolean): void {
  getDB().prepare('UPDATE sources SET is_active = ? WHERE id = ?').run(active ? 1 : 0, sourceId);
}
```

```typescript
// electron/db/queries/sync-log.ts
import { getDB } from '../connection';
import { SyncLog } from '../../../shared/types';

export function getSyncLogs(sourceId?: number, limit = 50): SyncLog[] {
  if (sourceId) {
    return getDB().prepare(
      'SELECT * FROM sync_log WHERE source_id = ? ORDER BY started_at DESC LIMIT ?'
    ).all(sourceId, limit) as SyncLog[];
  }
  return getDB().prepare(
    'SELECT * FROM sync_log ORDER BY started_at DESC LIMIT ?'
  ).all(limit) as SyncLog[];
}

export function createSyncLog(sourceId: number): number {
  const result = getDB().prepare(
    "INSERT INTO sync_log (source_id, started_at, status) VALUES (?, datetime('now'), 'success')"
  ).run(sourceId);
  return result.lastInsertRowid as number;
}

export function finalizeSyncLog(logId: number, status: string, newRecs: number, updatedRecs: number, conflicts: number, errorMsg?: string): void {
  getDB().prepare(
    `UPDATE sync_log SET finished_at = datetime('now'), status = ?, new_records = ?, updated_records = ?, conflicts = ?, error_message = ? WHERE id = ?`
  ).run(status, newRecs, updatedRecs, conflicts, errorMsg || null, logId);
}
```

- [ ] **Step 7: 在 main.ts 中集成数据库初始化**

更新 `electron/main.ts`，在 `app.whenReady()` 中添加：

```typescript
import { runMigrations } from './db/migrate';
import { seedInitialData } from './db/seed';

app.whenReady().then(() => {
  runMigrations();
  seedInitialData();
  createWindow();
});
```

- [ ] **Step 8: 提交**

```bash
git add electron/db/ && git commit -m "feat: add database layer with migrations, seed data, and query modules"
```

---

### Task 4: IPC 通信层

**Files:**
- Create: `electron/ipc/handlers.ts`
- Modify: `electron/main.ts`

- [ ] **Step 1: 创建 IPC handler 注册模块**

```typescript
// electron/ipc/handlers.ts
import { ipcMain } from 'electron';
import { getRegionTree, getRegionPath, searchRegions } from '../db/queries/regions';
import { queryCostItems, searchCostItems, getDistinctYears, getComparisonData, updateCostItemPrice } from '../db/queries/cost-items';
import { getAllSources, getActiveSources, toggleSource } from '../db/queries/sources';
import { getSyncLogs } from '../db/queries/sync-log';

export function registerHandlers(): void {
  // 地区
  ipcMain.handle('regions:tree', () => getRegionTree());
  ipcMain.handle('regions:path', (_e, id: number) => getRegionPath(id));
  ipcMain.handle('regions:search', (_e, keyword: string) => searchRegions(keyword));

  // 费用条目
  ipcMain.handle('cost-items:query', (_e, filter: any) => queryCostItems(filter));
  ipcMain.handle('cost-items:search', (_e, keyword: string) => searchCostItems(keyword));
  ipcMain.handle('cost-items:years', () => getDistinctYears());
  ipcMain.handle('cost-items:compare', (_e, regionIds: number[], category?: string, year?: number) =>
    getComparisonData(regionIds, category, year)
  );
  ipcMain.handle('cost-items:update-price', (_e, id: number, unitPrice: number, priceMin: number, priceMax: number) =>
    updateCostItemPrice(id, unitPrice, priceMin, priceMax)
  );

  // 数据源
  ipcMain.handle('sources:all', () => getAllSources());
  ipcMain.handle('sources:active', () => getActiveSources());
  ipcMain.handle('sources:toggle', (_e, id: number, active: boolean) => toggleSource(id, active));

  // 同步日志
  ipcMain.handle('sync-log:list', (_e, sourceId?: number) => getSyncLogs(sourceId));
}
```

- [ ] **Step 2: 在 main.ts 中注册 handlers**

在 `electron/main.ts` 中添加 `import { registerHandlers } from './ipc/handlers';` 并在 `createWindow()` 前调用 `registerHandlers();`

- [ ] **Step 3: 提交**

```bash
git add electron/ipc/ electron/main.ts && git commit -m "feat: add IPC handler registration"
```

---

### Task 5: React 前端 — 布局壳与导航

**Files:**
- Create: `src/components/Layout.tsx`
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/StatusBar.tsx`
- Create: `src/hooks/useIPC.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建 useIPC hook**

```typescript
// src/hooks/useIPC.ts
import { useCallback, useEffect, useState } from 'react';

export function useIPC<T>(channel: string, params?: unknown) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (args?: unknown) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.invoke(channel, ...(args !== undefined ? [args] : []));
      setData(result as T);
      return result as T;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useEffect(() => {
    if (params !== undefined) {
      execute(params);
    }
  }, []);

  return { data, loading, error, execute, refetch: execute };
}
```

- [ ] **Step 2: 创建 Layout 组件**

```typescript
// src/components/Layout.tsx
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';

type Page = 'query' | 'compare' | 'sync' | 'settings';

export default function Layout({ children, activePage, onNavigate }: {
  children: React.ReactNode;
  activePage: Page;
  onNavigate: (page: Page) => void;
}) {
  return (
    <div className="flex h-screen flex-col bg-gray-950 text-gray-100">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePage={activePage} onNavigate={onNavigate} />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
```

- [ ] **Step 3: 创建 Sidebar 组件**

```typescript
// src/components/Sidebar.tsx
import React from 'react';

const NAV_ITEMS = [
  { id: 'query' as const, icon: '📋', label: '费用查询' },
  { id: 'compare' as const, icon: '📊', label: '地区对比' },
  { id: 'sync' as const, icon: '🔄', label: '数据同步' },
  { id: 'settings' as const, icon: '⚙️', label: '设置' },
];

export default function Sidebar({ activePage, onNavigate }: {
  activePage: string;
  onNavigate: (page: string) => void;
}) {
  return (
    <aside className="flex w-52 flex-col border-r border-gray-800 bg-gray-900 p-3">
      <div className="mb-6 px-2 py-1 text-lg font-bold text-blue-400">🏗️ CostBase</div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              activePage === item.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="mt-auto pt-4 text-xs text-gray-600">
        <p>CostBase v1.0.0</p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: 创建 StatusBar 组件**

```typescript
// src/components/StatusBar.tsx
import React from 'react';

export default function StatusBar() {
  return (
    <footer className="flex items-center justify-between border-t border-gray-800 bg-gray-900 px-4 py-1.5 text-xs text-gray-500">
      <span>数据更新: -- | 来源: --</span>
      <span>下次同步: --</span>
    </footer>
  );
}
```

- [ ] **Step 5: 更新 App.tsx 集成布局**

```typescript
// src/App.tsx
import React, { useState } from 'react';
import Layout from './components/Layout';

type Page = 'query' | 'compare' | 'sync' | 'settings';

function QueryPage() {
  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-gray-800 bg-gray-900 p-4">
        <h3 className="mb-4 text-sm font-semibold text-gray-300">筛选条件</h3>
        <p className="text-xs text-gray-600">组件开发中...</p>
      </div>
      <div className="flex-1 p-4">
        <h2 className="mb-2 text-lg font-bold text-gray-200">费用查询</h2>
        <p className="text-sm text-gray-500">选择地区和筛选条件后显示数据</p>
      </div>
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-lg text-gray-500">{title} — 即将开发</p>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>('query');

  return (
    <Layout activePage={page} onNavigate={setPage}>
      {page === 'query' && <QueryPage />}
      {page === 'compare' && <PlaceholderPage title="地区对比" />}
      {page === 'sync' && <PlaceholderPage title="数据同步" />}
      {page === 'settings' && <PlaceholderPage title="设置" />}
    </Layout>
  );
}
```

- [ ] **Step 6: 提交**

```bash
git add src/ && git commit -m "feat: add layout shell with sidebar navigation and placeholder pages"
```

---

### Task 6: 地区树选择器组件

**Files:**
- Create: `src/components/RegionTree.tsx`
- Create: `src/hooks/useRegions.ts`

- [ ] **Step 1: 创建 useRegions hook**

```typescript
// src/hooks/useRegions.ts
import { useState, useCallback } from 'react';
import { Region } from '../../shared/types';

export function useRegions() {
  const [tree, setTree] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTree = useCallback(async () => {
    setLoading(true);
    const data = await window.electronAPI.invoke('regions:tree') as Region[];
    setTree(data);
    setLoading(false);
    return data;
  }, []);

  const buildNodeMap = useCallback(() => {
    const map = new Map<number, Region[]>();
    for (const r of tree) {
      const parentId = r.parent_id ?? 0;
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId)!.push(r);
    }
    return map;
  }, [tree]);

  return { tree, loading, loadTree, buildNodeMap };
}
```

- [ ] **Step 2: 创建 RegionTree 组件**

```typescript
// src/components/RegionTree.tsx
import React, { useEffect, useState } from 'react';
import { Region } from '../../shared/types';

interface Props {
  onSelect: (region: Region) => void;
  selectedId?: number;
}

export default function RegionTree({ onSelect, selectedId }: Props) {
  const [tree, setTree] = useState<Region[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    window.electronAPI.invoke('regions:tree').then(setTree);
  }, []);

  // Build parent -> children map
  const childrenMap = new Map<number | null, Region[]>();
  for (const r of tree) {
    const key = r.parent_id;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(r);
  }

  // Filter by search
  const filtered = search
    ? tree.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : childrenMap.get(null) || [];

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (region: Region, depth: number = 0) => {
    const children = childrenMap.get(region.id) || [];
    const isExpanded = expanded.has(region.id);
    const isSelected = region.id === selectedId;

    return (
      <div key={region.id}>
        <button
          onClick={() => {
            onSelect(region);
            if (children.length > 0) toggleExpand(region.id);
          }}
          className={`flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm transition-colors ${
            isSelected ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {children.length > 0 && (
            <span className="text-xs w-3">{isExpanded ? '▾' : '▸'}</span>
          )}
          {children.length === 0 && <span className="w-3" />}
          <span className="text-xs opacity-50 w-8 text-right">{region.level === 'country' ? '🌐' : region.level === 'state' ? '🏛' : '📍'}</span>
          <span className="truncate">{region.name}</span>
        </button>
        {isExpanded && children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        placeholder="搜索国家/城市..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />
      <div className="max-h-64 overflow-y-auto">
        {search
          ? filtered.map((r) => renderNode(r, 0))
          : (childrenMap.get(null) || []).map((r) => renderNode(r, 0))
        }
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/RegionTree.tsx src/hooks/useRegions.ts && git commit -m "feat: add region tree selector component"
```

---

### Task 7: 费用查询页面 — 筛选面板与数据表格

**Files:**
- Create: `src/components/FilterPanel.tsx`
- Create: `src/components/CostTable.tsx`
- Create: `src/hooks/useCostItems.ts`
- Modify: `src/App.tsx` (替换 QueryPage)

- [ ] **Step 1: 创建 useCostItems hook**

```typescript
// src/hooks/useCostItems.ts
import { useState, useCallback } from 'react';
import { CostItem, CostItemFilter, QueryResult } from '../../shared/types';

export function useCostItems() {
  const [result, setResult] = useState<QueryResult<CostItem> | null>(null);
  const [loading, setLoading] = useState(false);

  const query = useCallback(async (filter: CostItemFilter) => {
    setLoading(true);
    const data = await window.electronAPI.invoke('cost-items:query', filter) as QueryResult<CostItem>;
    setResult(data);
    setLoading(false);
    return data;
  }, []);

  const search = useCallback(async (keyword: string) => {
    setLoading(true);
    const data = await window.electronAPI.invoke('cost-items:search', keyword) as CostItem[];
    setResult(data.length > 0 ? { data, total: data.length, page: 1, page_size: data.length } : null);
    setLoading(false);
  }, []);

  const getYears = useCallback(async () => {
    return await window.electronAPI.invoke('cost-items:years') as number[];
  }, []);

  return { result, loading, query, search, getYears };
}
```

- [ ] **Step 2: 创建 FilterPanel 组件**

```typescript
// src/components/FilterPanel.tsx
import React, { useEffect, useState } from 'react';
import RegionTree from './RegionTree';
import { Region, CostItemFilter } from '../../shared/types';

const CATEGORIES = [
  { value: '', label: '全部类别' },
  { value: 'material', label: '建筑材料' },
  { value: 'labor', label: '人工费' },
  { value: 'equipment', label: '设备租赁' },
  { value: 'transport', label: '运输费' },
];

const BUILDING_TYPES = [
  { value: '', label: '全部类型' },
  { value: 'residential', label: '住宅' },
  { value: 'commercial', label: '商业' },
  { value: 'industrial', label: '工业' },
  { value: 'infrastructure', label: '基础设施' },
];

interface Props {
  onQuery: (filter: CostItemFilter) => void;
  onSearch: (keyword: string) => void;
}

export default function FilterPanel({ onQuery, onSearch }: Props) {
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedPath, setSelectedPath] = useState<Region[]>([]);
  const [category, setCategory] = useState('');
  const [buildingType, setBuildingType] = useState('');
  const [dataYear, setDataYear] = useState<number | undefined>();
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    window.electronAPI.invoke('cost-items:years').then(setYears);
  }, []);

  const handleRegionSelect = async (region: Region) => {
    setSelectedRegion(region);
    const path = await window.electronAPI.invoke('regions:path', region.id) as Region[];
    setSelectedPath(path);
  };

  const handleQuery = () => {
    onQuery({
      region_id: selectedRegion?.id,
      category: category || undefined,
      building_type: buildingType || undefined,
      data_year: dataYear,
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* 地区选择 */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">地区</label>
        <RegionTree onSelect={handleRegionSelect} selectedId={selectedRegion?.id} />
        {selectedPath.length > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
            {selectedPath.map((r, i) => (
              <span key={r.id}>
                {i > 0 && <span className="mx-1 opacity-30">▸</span>}
                <span className={i === selectedPath.length - 1 ? 'font-semibold text-blue-400' : ''}>{r.name}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 费用类别 */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">费用类别</label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                category === c.value
                  ? 'bg-blue-600 text-white'
                  : c.value === ''
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* 建筑类型 */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">建筑类型</label>
        <select
          value={buildingType}
          onChange={(e) => setBuildingType(e.target.value)}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
        >
          {BUILDING_TYPES.map((bt) => (
            <option key={bt.value} value={bt.value}>{bt.label}</option>
          ))}
        </select>
      </div>

      {/* 年份 */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">数据年份</label>
        <select
          value={dataYear ?? ''}
          onChange={(e) => setDataYear(e.target.value ? Number(e.target.value) : undefined)}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="">全部年份</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <button
        onClick={handleQuery}
        className="mt-2 w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        🔍 查询
      </button>
    </div>
  );
}
```

- [ ] **Step 3: 创建 CostTable 组件**

```typescript
// src/components/CostTable.tsx
import React from 'react';
import { CostItem, QueryResult } from '../../shared/types';

const COLUMNS = [
  { key: 'subcategory', label: '子类别', width: 'w-24' },
  { key: 'spec_code', label: '规格型号', width: 'w-20' },
  { key: 'spec_detail', label: '规格补充', width: 'w-28' },
  { key: 'unit', label: '单位', width: 'w-16' },
  { key: 'unit_price', label: '单价', width: 'w-24', align: 'right' as const },
  { key: 'price_min', label: '最低价', width: 'w-24', align: 'right' as const },
  { key: 'price_max', label: '最高价', width: 'w-24', align: 'right' as const },
  { key: 'source_name', label: '数据来源', width: 'w-32' },
];

function formatPrice(val: number | null): string {
  if (val === null || val === undefined) return '—';
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  result: QueryResult<CostItem> | null;
  loading: boolean;
}

export default function CostTable({ result, loading }: Props) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  if (!result || result.data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">请选择筛选条件后点击查询</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-900 text-left">
          <tr className="border-b border-gray-700">
            {COLUMNS.map((col) => (
              <th key={col.key} className={`${col.width} px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 ${col.align === 'right' ? 'text-right' : ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.data.map((item: any) => (
            <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
              <td className="px-3 py-2 font-medium text-gray-200">{item.subcategory}</td>
              <td className="px-3 py-2 text-blue-400 font-mono">{item.spec_code || '—'}</td>
              <td className="px-3 py-2 text-gray-400">{item.spec_detail || '—'}</td>
              <td className="px-3 py-2 text-gray-400">{item.unit}</td>
              <td className="px-3 py-2 text-right font-semibold text-gray-100">{formatPrice(item.unit_price)}</td>
              <td className="px-3 py-2 text-right text-gray-400">{formatPrice(item.price_min)}</td>
              <td className="px-3 py-2 text-right text-gray-400">{formatPrice(item.price_max)}</td>
              <td className="px-3 py-2 text-xs text-gray-500" title={`${item.source_name}`}>
                {item.source_name || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-3 text-xs text-gray-600">
        共 {result.total} 条记录 | 第 {result.page} 页
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 更新 App.tsx 中的 QueryPage**

替换原来的占位 QueryPage：

```typescript
function QueryPage() {
  const { result, loading, query } = useCostItems();
  const [regionPath, setRegionPath] = useState<Region[]>([]);

  const handleQuery = useCallback((filter: CostItemFilter) => {
    query(filter);
    if (filter.region_id) {
      window.electronAPI.invoke('regions:path', filter.region_id).then(setRegionPath);
    }
  }, [query]);

  const title = regionPath.length > 0
    ? `费用查询 — ${regionPath.map(r => r.name).join(' · ')}`
    : '费用查询';

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-gray-800">
        <FilterPanel onQuery={handleQuery} onSearch={() => {}} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-200">{title}</h2>
          <div className="flex gap-2">
            <button className="rounded-md bg-green-700 px-3 py-1 text-xs text-white hover:bg-green-600">📥 导出 Excel</button>
            <button className="rounded-md bg-gray-700 px-3 py-1 text-xs text-white hover:bg-gray-600">📄 导出 PDF</button>
          </div>
        </div>
        <CostTable result={result} loading={loading} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 提交**

```bash
git add src/components/FilterPanel.tsx src/components/CostTable.tsx src/hooks/useCostItems.ts src/App.tsx
git commit -m "feat: add cost query page with filter panel and data table"
```

---

### Task 8: 全文搜索

**Files:**
- Create: `src/components/SearchBar.tsx`
- Modify: `src/App.tsx` (集成搜索)

- [ ] **Step 1: 创建 SearchBar 组件**

```typescript
// src/components/SearchBar.tsx
import React, { useState, useCallback } from 'react';

interface Props {
  onSearch: (keyword: string) => void;
}

export default function SearchBar({ onSearch }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  }, [value, onSearch]);

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="全文搜索 — 规格型号、材料名称、备注..."
        className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-4 pr-12 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
      >
        搜索
      </button>
    </form>
  );
}
```

- [ ] **Step 2: 在 QueryPage 中集成 SearchBar**

在 QueryPage 组件顶部添加搜索栏，搜索结果替换当前表格数据：

```typescript
// 在 QueryPage 中添加：
const { result, loading, query, search } = useCostItems();
const [searchMode, setSearchMode] = useState(false);

// 在 FilterPanel 上方添加:
<div className="border-b border-gray-800 p-4">
  <SearchBar onSearch={(kw) => { setSearchMode(true); search(kw); }} />
</div>

// 当 searchMode 时，在标题区显示"搜索: xxx"并提供一个清除按钮
```

- [ ] **Step 3: 提交**

```bash
git add src/components/SearchBar.tsx src/App.tsx && git commit -m "feat: add full-text search with FTS5"
```

---

### Task 9: 数据同步引擎 — 适配器基类与管道

**Files:**
- Create: `electron/adapters/base.ts`
- Create: `electron/adapters/index.ts`
- Create: `electron/sync/pipeline.ts`
- Create: `electron/sync/conflict.ts`

- [ ] **Step 1: 创建适配器基类**

```typescript
// electron/adapters/base.ts
import { CostItem } from '../../shared/types';

export interface AdapterFetchResult {
  items: Omit<CostItem, 'id' | 'created_at' | 'updated_at'>[];
  errors: string[];
}

export abstract class BaseAdapter {
  abstract name: string;
  abstract sourceId: number;

  abstract fetch(params?: Record<string, unknown>): Promise<AdapterFetchResult>;

  protected transformCurrency(
    items: Omit<CostItem, 'id' | 'created_at' | 'updated_at'>[],
    fromCurrency: string,
    _toCurrency: string,
    _rate: number
  ): Omit<CostItem, 'id' | 'created_at' | 'updated_at'>[] {
    // 默认不做转换，保留原始币种。具体适配器可覆盖此方法
    return items;
  }
}
```

- [ ] **Step 2: 创建适配器注册表**

```typescript
// electron/adapters/index.ts
import { BaseAdapter } from './base';

const registry = new Map<string, BaseAdapter>();

export function registerAdapter(key: string, adapter: BaseAdapter): void {
  registry.set(key, adapter);
}

export function getAdapter(key: string): BaseAdapter | undefined {
  return registry.get(key);
}

export function getAllAdapters(): BaseAdapter[] {
  return Array.from(registry.values());
}
```

- [ ] **Step 3: 创建同步管道**

```typescript
// electron/sync/pipeline.ts
import { getDB } from '../db/connection';
import { costItemSchema } from '../../shared/schemas';
import { BaseAdapter } from '../adapters/base';
import { detectConflicts, resolveConflicts } from './conflict';
import { createSyncLog, finalizeSyncLog } from '../db/queries/sync-log';
import { updateSourceLastSync } from '../db/queries/sources';

const BATCH_ID = () => `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export async function runSync(adapter: BaseAdapter): Promise<{
  newCount: number;
  updatedCount: number;
  conflictCount: number;
}> {
  const db = getDB();
  const batchId = BATCH_ID();
  const logId = createSyncLog(adapter.sourceId);

  try {
    // Step 1: Fetch
    const { items, errors } = await adapter.fetch();
    if (errors.length > 0) {
      console.warn(`[Sync] ${adapter.name} fetch warnings:`, errors);
    }

    // Step 2: Stage raw data
    const insertStaging = db.prepare(
      'INSERT INTO cost_items_staging (batch_id, source_id, data_json) VALUES (?,?,?)'
    );
    const stageTx = db.transaction(() => {
      for (const item of items) {
        insertStaging.run(batchId, adapter.sourceId, JSON.stringify(item));
      }
    });
    stageTx();

    // Step 3: Validate
    const stagingRows = db.prepare(
      "SELECT * FROM cost_items_staging WHERE batch_id = ? AND validation_status = 'pending'"
    ).all(batchId) as any[];

    let validCount = 0;
    let invalidCount = 0;
    const validItems: (typeof items[0])[] = [];

    for (const row of stagingRows) {
      const parsed = JSON.parse(row.data_json);
      const result = costItemSchema.safeParse(parsed);
      if (result.success) {
        db.prepare("UPDATE cost_items_staging SET validation_status = 'valid' WHERE id = ?").run(row.id);
        validItems.push(result.data);
        validCount++;
      } else {
        const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        db.prepare("UPDATE cost_items_staging SET validation_status = 'invalid', validation_errors = ? WHERE id = ?").run(errors, row.id);
        invalidCount++;
      }
    }

    // Step 4: Conflict detection
    const conflicts = detectConflicts(adapter.sourceId, validItems);

    // Step 5: Merge
    const { inserted, updated, skipped } = resolveConflicts(adapter.sourceId, validItems, conflicts);

    // Step 6: Rebuild FTS
    db.exec("INSERT INTO cost_items_fts(cost_items_fts) VALUES('rebuild')");

    finalizeSyncLog(logId, errors.length > 0 ? 'partial' : 'success', inserted, updated, skipped);
    updateSourceLastSync(adapter.sourceId, new Date().toISOString());

    return { newCount: inserted, updatedCount: updated, conflictCount: skipped };
  } catch (e: any) {
    finalizeSyncLog(logId, 'failed', 0, 0, 0, e.message);
    throw e;
  }
}
```

- [ ] **Step 4: 创建冲突检测模块**

```typescript
// electron/sync/conflict.ts
import { getDB } from '../db/connection';
import { CostItem } from '../../shared/types';

type CostItemInput = Omit<CostItem, 'id' | 'created_at' | 'updated_at'>;

interface ConflictInfo {
  incoming: CostItemInput;
  existingId: number;
  isManualFix: boolean;
}

export function detectConflicts(
  sourceId: number,
  items: CostItemInput[]
): Map<string, ConflictInfo> {
  const db = getDB();
  const conflicts = new Map<string, ConflictInfo>();

  for (const item of items) {
    // Match key: region_id + category + subcategory + spec_code + building_type + data_year + data_quarter
    const existing = db.prepare(
      `SELECT * FROM cost_items
       WHERE source_id = ? AND region_id = ? AND category = ? AND subcategory = ?
       AND (spec_code = ? OR (spec_code IS NULL AND ? IS NULL))
       AND building_type = ? AND data_year = ? AND data_quarter = ?
       AND status = 'active'`
    ).get(
      sourceId, item.region_id, item.category, item.subcategory,
      item.spec_code, item.spec_code,
      item.building_type, item.data_year, item.data_quarter
    ) as CostItem | undefined;

    if (existing) {
      const key = `${item.region_id}|${item.category}|${item.subcategory}|${item.spec_code}|${item.data_year}Q${item.data_quarter}`;
      conflicts.set(key, {
        incoming: item,
        existingId: existing.id,
        isManualFix: existing.is_manual_fix === 1,
      });
    }
  }

  return conflicts;
}

export function resolveConflicts(
  _sourceId: number,
  items: CostItemInput[],
  conflicts: Map<string, ConflictInfo>
): { inserted: number; updated: number; skipped: number } {
  const db = getDB();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  const insertStmt = db.prepare(
    `INSERT INTO cost_items (region_id, category, subcategory, spec_code, spec_detail, unit, unit_price, price_min, price_max, building_type, data_year, data_quarter, source_id, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );

  const updateStmt = db.prepare(
    `UPDATE cost_items SET unit_price = ?, price_min = ?, price_max = ?, spec_detail = ?, unit = ?, notes = ?, updated_at = datetime('now'), status = 'active'
     WHERE id = ?`
  );

  for (const item of items) {
    const key = `${item.region_id}|${item.category}|${item.subcategory}|${item.spec_code}|${item.data_year}Q${item.data_quarter}`;
    const conflict = conflicts.get(key);

    if (conflict) {
      if (conflict.isManualFix) {
        // 人工修改过的记录，跳过自动覆盖
        skipped++;
        continue;
      } else {
        // 自动更新
        updateStmt.run(item.unit_price, item.price_min, item.price_max, item.spec_detail, item.unit, item.notes, conflict.existingId);
        updated++;
      }
    } else {
      // 新记录
      insertStmt.run(item.region_id, item.category, item.subcategory, item.spec_code, item.spec_detail, item.unit, item.unit_price, item.price_min, item.price_max, item.building_type, item.data_year, item.data_quarter, item.source_id, item.notes);
      inserted++;
    }
  }

  return { inserted, updated, skipped };
}
```

- [ ] **Step 5: 提交**

```bash
git add electron/adapters/ electron/sync/ && git commit -m "feat: add sync engine with adapter base, pipeline, and conflict detection"
```

---

### Task 10: Eurostat 适配器 + 定时调度

**Files:**
- Create: `electron/adapters/eurostat.ts`
- Create: `electron/sync/scheduler.ts`
- Modify: `electron/main.ts` (启动调度器)

- [ ] **Step 1: 创建 Eurostat 适配器**

```typescript
// electron/adapters/eurostat.ts
import { BaseAdapter, AdapterFetchResult } from './base';
import { CostItem } from '../../shared/types';

export class EurostatAdapter extends BaseAdapter {
  name = 'Eurostat Construction Cost Index';
  sourceId = 1; // matches seed data

  async fetch(): Promise<AdapterFetchResult> {
    const items: Omit<CostItem, 'id' | 'created_at' | 'updated_at'>[] = [];
    const errors: string[] = [];

    try {
      // Eurostat SDMX 2.1 API — construction cost index
      const url = 'https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/sts_copi_a?format=JSON';
      const response = await fetch(url);
      if (!response.ok) {
        errors.push(`Eurostat API returned ${response.status}`);
        return { items, errors };
      }

      const json = await response.json();

      // 解析 SDMX-JSON 结构
      // 实际解析逻辑根据 API 返回结构调整，此处为框架示例
      // 将 Eurostat 数据转换为标准化的 CostItem 格式
      // 需要按国家映射到对应的 region_id

      console.log(`[Eurostat] Fetched data, ${Object.keys(json).length} keys`);
    } catch (e: any) {
      errors.push(`Eurostat fetch error: ${e.message}`);
    }

    return { items, errors };
  }
}
```

- [ ] **Step 2: 创建定时调度器**

```typescript
// electron/sync/scheduler.ts
import cron from 'node-cron';
import { getActiveSources } from '../db/queries/sources';
import { getAdapter } from '../adapters/index';
import { runSync } from './pipeline';

const jobs = new Map<number, cron.ScheduledTask>();

export function startScheduler(): void {
  // 每天 09:00 检查当天需要同步的数据源
  cron.schedule('0 9 * * *', async () => {
    console.log('[Scheduler] Checking sync schedule...');
    const sources = getActiveSources();
    for (const source of sources) {
      const adapter = getAdapter(source.name);
      if (adapter) {
        try {
          console.log(`[Scheduler] Running sync: ${source.name}`);
          await runSync(adapter);
        } catch (e: any) {
          console.error(`[Scheduler] Sync failed for ${source.name}:`, e.message);
        }
      }
    }
  });

  console.log('[Scheduler] Started — daily check at 09:00');
}

export function stopScheduler(): void {
  for (const [id, job] of jobs) {
    job.stop();
    jobs.delete(id);
  }
}
```

- [ ] **Step 3: 在 main.ts 中启动调度器**

```typescript
import { startScheduler } from './sync/scheduler';

app.whenReady().then(() => {
  runMigrations();
  seedInitialData();
  registerHandlers();
  createWindow();
  startScheduler();
});
```

- [ ] **Step 4: 提交**

```bash
git add electron/adapters/eurostat.ts electron/sync/scheduler.ts electron/main.ts && git commit -m "feat: add Eurostat adapter and cron scheduler"
```

---

### Task 11: 地区对比页面

**Files:**
- Create: `src/components/ComparisonView.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建 ComparisonView 组件**

```typescript
// src/components/ComparisonView.tsx
import React, { useState, useCallback } from 'react';
import RegionTree from './RegionTree';
import { Region } from '../../shared/types';

export default function ComparisonView() {
  const [selectedRegions, setSelectedRegions] = useState<Region[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectRegion = useCallback((region: Region) => {
    setSelectedRegions((prev) => {
      const exists = prev.find((r) => r.id === region.id);
      if (exists) return prev.filter((r) => r.id !== region.id);
      if (prev.length >= 3) return prev; // max 3 regions
      return [...prev, region];
    });
  }, []);

  const handleCompare = useCallback(async () => {
    if (selectedRegions.length < 2) return;
    setLoading(true);
    const ids = selectedRegions.map((r) => r.id);
    const data = await window.electronAPI.invoke('cost-items:compare', ids, category || undefined);
    setComparisonData(data || []);
    setLoading(false);
  }, [selectedRegions, category]);

  return (
    <div className="flex h-full">
      {/* 左侧: 选择地区 */}
      <div className="w-64 border-r border-gray-800 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-300">选择地区对比 (2-3)</h3>
        <RegionTree onSelect={handleSelectRegion} />
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-semibold text-gray-500">已选地区</h4>
          {selectedRegions.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded bg-gray-800 px-2 py-1 text-xs text-gray-300 mb-1">
              <span>{r.name}</span>
              <button onClick={() => handleSelectRegion(r)} className="text-red-400 hover:text-red-300">✕</button>
            </div>
          ))}
        </div>
        <button
          onClick={handleCompare}
          disabled={selectedRegions.length < 2}
          className="mt-4 w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          📊 开始对比
        </button>
      </div>

      {/* 右侧: 对比表格 */}
      <div className="flex-1 overflow-auto p-4">
        {loading && <p className="text-gray-500">加载中...</p>}
        {!loading && comparisonData.length === 0 && (
          <p className="text-gray-500">请选择 2-3 个地区后点击"开始对比"</p>
        )}
        {comparisonData.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-3 py-2 text-left text-xs text-gray-500">材料/规格</th>
                <th className="px-3 py-2 text-left text-xs text-gray-500">单位</th>
                {selectedRegions.map((r) => (
                  <th key={r.id} className="px-3 py-2 text-right text-xs text-gray-500">{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row: any, i: number) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="px-3 py-2">
                    <span className="font-medium text-gray-200">{row.subcategory}</span>
                    <span className="ml-2 text-xs text-blue-400">{row.spec_code}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-400">{row.unit}</td>
                  {selectedRegions.map((r) => (
                    <td key={r.id} className="px-3 py-2 text-right text-gray-200">
                      {row.prices?.[r.name]?.unit_price?.toLocaleString() || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 在 App.tsx 中集成 ComparisonView**

替换 ComparisonPage placeholder：

```typescript
{page === 'compare' && <ComparisonView />}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/ComparisonView.tsx src/App.tsx && git commit -m "feat: add region comparison view"
```

---

### Task 12: Excel/PDF 导出

**Files:**
- Create: `electron/export/excel.ts`
- Create: `electron/export/pdf.ts`
- Modify: `electron/ipc/handlers.ts` (注册导出 IPC)

- [ ] **Step 1: 创建 Excel 导出模块**

```typescript
// electron/export/excel.ts
import ExcelJS from 'exceljs';
import { dialog } from 'electron';
import { CostItem } from '../../shared/types';

export async function exportExcel(items: CostItem[], title: string): Promise<void> {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: `cost-report-${Date.now()}.xlsx`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });

  if (!filePath) return;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('费用数据');

  // 标题
  sheet.mergeCells('A1:H1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center' };

  // 时间戳
  sheet.mergeCells('A2:H2');
  sheet.getCell('A2').value = `导出时间: ${new Date().toLocaleString('zh-CN')}`;
  sheet.getCell('A2').font = { size: 10, color: { argb: '888888' } };

  // 表头
  const headers = ['子类别', '规格型号', '规格补充', '单位', '单价', '最低价', '最高价', '数据来源'];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E5E7EB' } }; });

  // 数据
  for (const item of items) {
    sheet.addRow([
      item.subcategory, item.spec_code || '', item.spec_detail || '', item.unit,
      item.unit_price, item.price_min, item.price_max,
      (item as any).source_name || '',
    ]);
  }

  // 列宽
  sheet.columns?.forEach((col, i) => {
    col.width = [12, 14, 14, 8, 12, 12, 12, 20][i] || 12;
  });

  await workbook.xlsx.writeFile(filePath);
}
```

- [ ] **Step 2: 创建 PDF 导出模块**

```typescript
// electron/export/pdf.ts
import { jsPDF } from 'jspdf';
import { dialog } from 'electron';
import { writeFileSync } from 'fs';
import { CostItem } from '../../shared/types';

export async function exportPDF(items: CostItem[], title: string): Promise<void> {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: `cost-report-${Date.now()}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (!filePath) return;

  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(14);
  doc.text(title, 14, 20);
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text(`Export time: ${new Date().toLocaleString('zh-CN')}`, 14, 28);

  // Table
  const headers = [['Subcategory', 'Spec', 'Detail', 'Unit', 'Price', 'Min', 'Max', 'Source']];
  const rows = items.map((item) => [
    item.subcategory, item.spec_code || '', item.spec_detail || '', item.unit,
    String(item.unit_price ?? '-'), String(item.price_min ?? '-'), String(item.price_max ?? '-'),
    ((item as any).source_name || ''),
  ]);

  (doc as any).autoTable({
    head: headers,
    body: rows,
    startY: 35,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  writeFileSync(filePath, pdfBuffer);
}
```

- [ ] **Step 3: 注册导出 IPC handler**

在 `electron/ipc/handlers.ts` 中添加：

```typescript
import { exportExcel } from '../export/excel';
import { exportPDF } from '../export/pdf';

ipcMain.handle('export:excel', async () => {
  // 从当前筛选状态获取数据 — 实际实现需从渲染进程传入
  // 这里为框架代码，实际调用时由渲染进程传入 items 和 title
});

ipcMain.handle('export:pdf', async () => {
  // 同上，实际由渲染进程传入 items 和 title
});
```

> 实际实现时，导出数据由渲染进程通过 IPC 参数传入，格式为：`window.electronAPI.invoke('export:excel', items, title)`

- [ ] **Step 4: 提交**

```bash
git add electron/export/ electron/ipc/handlers.ts && git commit -m "feat: add Excel and PDF export modules"
```

---

### Task 13: 同步管理面板 + CSV 导入

**Files:**
- Create: `src/components/SyncManager.tsx`
- Create: `src/components/SyncLogTable.tsx`
- Create: `electron/adapters/csv-import.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建 SyncManager 组件**

```typescript
// src/components/SyncManager.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { DataSource, SyncLog } from '../../shared/types';

export default function SyncManager() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [syncing, setSyncing] = useState<number | null>(null);

  useEffect(() => {
    window.electronAPI.invoke('sources:all').then(setSources);
    window.electronAPI.invoke('sync-log:list').then(setLogs);
  }, []);

  const handleSync = useCallback(async (sourceId: number) => {
    setSyncing(sourceId);
    try {
      await window.electronAPI.invoke('sync:run', sourceId);
      setLogs(await window.electronAPI.invoke('sync-log:list'));
    } catch (e: any) {
      console.error('Sync failed:', e.message);
    }
    setSyncing(null);
  }, []);

  const handleToggle = useCallback(async (id: number, active: boolean) => {
    await window.electronAPI.invoke('sources:toggle', id, active);
    setSources(await window.electronAPI.invoke('sources:all'));
  }, []);

  return (
    <div className="h-full overflow-auto p-6">
      <h2 className="mb-6 text-xl font-bold text-gray-200">数据同步管理</h2>

      {/* 数据源列表 */}
      <div className="mb-8">
        <h3 className="mb-3 text-sm font-semibold text-gray-400">数据源状态</h3>
        <div className="grid gap-3">
          {sources.map((source) => (
            <div key={source.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${source.is_active ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <h4 className="font-medium text-gray-200">{source.name}</h4>
                  <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-500">{source.country}</span>
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {source.sync_frequency} · 上次同步: {source.last_sync_at ? new Date(source.last_sync_at).toLocaleString('zh-CN') : '从未'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={source.is_active === 1}
                    onChange={(e) => handleToggle(source.id, e.target.checked)}
                    className="rounded"
                  />
                  启用
                </label>
                <button
                  onClick={() => handleSync(source.id)}
                  disabled={syncing === source.id || !source.is_active}
                  className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {syncing === source.id ? '同步中...' : '立即同步'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 同步日志 */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-400">同步日志</h3>
        <SyncLogTable logs={logs} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 SyncLogTable 组件**

```typescript
// src/components/SyncLogTable.tsx
import React from 'react';
import { SyncLog } from '../../shared/types';

const STATUS_STYLES: Record<string, string> = {
  success: 'text-green-400',
  partial: 'text-yellow-400',
  failed: 'text-red-400',
};

export default function SyncLogTable({ logs }: { logs: SyncLog[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-gray-600">暂无同步记录</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left">
            <th className="px-3 py-2 text-xs text-gray-500">时间</th>
            <th className="px-3 py-2 text-xs text-gray-500">状态</th>
            <th className="px-3 py-2 text-xs text-gray-500 text-right">新增</th>
            <th className="px-3 py-2 text-xs text-gray-500 text-right">更新</th>
            <th className="px-3 py-2 text-xs text-gray-500 text-right">冲突</th>
            <th className="px-3 py-2 text-xs text-gray-500">错误信息</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-gray-800">
              <td className="px-3 py-2 text-gray-400">{log.started_at ? new Date(log.started_at).toLocaleString('zh-CN') : '-'}</td>
              <td className={`px-3 py-2 font-medium ${STATUS_STYLES[log.status] || ''}`}>
                {log.status === 'success' ? '成功' : log.status === 'partial' ? '部分成功' : '失败'}
              </td>
              <td className="px-3 py-2 text-right text-green-400">{log.new_records}</td>
              <td className="px-3 py-2 text-right text-blue-400">{log.updated_records}</td>
              <td className="px-3 py-2 text-right text-yellow-400">{log.conflicts}</td>
              <td className="px-3 py-2 text-xs text-red-400 max-w-xs truncate">{log.error_message || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: 创建 CSV 导入适配器**

```typescript
// electron/adapters/csv-import.ts
import { BaseAdapter, AdapterFetchResult } from './base';
import { dialog } from 'electron';
import { readFileSync } from 'fs';
import { CostItem } from '../../shared/types';

export class CsvImportAdapter extends BaseAdapter {
  name = 'CSV Import';
  sourceId = 99; // 动态设置

  private lastFileContent: string | null = null;

  async fetch(): Promise<AdapterFetchResult> {
    const items: Omit<CostItem, 'id' | 'created_at' | 'updated_at'>[] = [];
    const errors: string[] = [];

    try {
      const { filePaths } = await dialog.showOpenDialog({
        filters: [{ name: 'CSV', extensions: ['csv'] }],
        properties: ['openFile'],
      });

      if (!filePaths || filePaths.length === 0) {
        errors.push('No file selected');
        return { items, errors };
      }

      const content = readFileSync(filePaths[0], 'utf-8');
      this.lastFileContent = content;

      const lines = content.split('\n').filter((l) => l.trim());
      if (lines.length < 2) {
        errors.push('CSV file is empty or has no data rows');
        return { items, errors };
      }

      // Parse header
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const requiredFields = ['region_id', 'category', 'subcategory', 'unit', 'data_year'];
      for (const f of requiredFields) {
        if (!headers.includes(f)) {
          errors.push(`Missing required field: ${f}`);
        }
      }
      if (errors.length > 0) return { items, errors };

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

        items.push({
          region_id: parseInt(row.region_id),
          category: row.category as CostItem['category'],
          subcategory: row.subcategory,
          spec_code: row.spec_code || null,
          spec_detail: row.spec_detail || null,
          unit: row.unit,
          unit_price: row.unit_price ? parseFloat(row.unit_price) : null,
          price_min: row.price_min ? parseFloat(row.price_min) : null,
          price_max: row.price_max ? parseFloat(row.price_max) : null,
          building_type: row.building_type || 'all',
          data_year: parseInt(row.data_year),
          data_quarter: row.data_quarter ? parseInt(row.data_quarter) : 1,
          source_id: this.sourceId,
          is_manual_fix: 0,
          status: 'active' as const,
          notes: row.notes || null,
        });
      }
    } catch (e: any) {
      errors.push(`CSV import error: ${e.message}`);
    }

    return { items, errors };
  }
}
```

- [ ] **Step 4: 更新 App.tsx 集成 SyncManager**

```typescript
{page === 'sync' && <SyncManager />}
```

- [ ] **Step 5: 注册 CSV 导入和同步触发 IPC handler**

在 `electron/ipc/handlers.ts` 中添加：

```typescript
import { runSync } from '../sync/pipeline';
import { getAdapter } from '../adapters/index';
import { CsvImportAdapter } from '../adapters/csv-import';

ipcMain.handle('sync:run', async (_e, sourceId: number) => {
  const sources = getActiveSources();
  const source = sources.find(s => s.id === sourceId);
  if (!source) throw new Error(`Source ${sourceId} not found`);

  let adapter = getAdapter(source.name);
  if (!adapter) {
    // 如果是手动导入，使用 CSV adapter
    if (source.access_type === 'manual_import') {
      adapter = new CsvImportAdapter();
      (adapter as CsvImportAdapter).sourceId = sourceId;
    } else {
      throw new Error(`No adapter for source: ${source.name}`);
    }
  }

  return await runSync(adapter);
});
```

- [ ] **Step 6: 提交**

```bash
git add src/components/SyncManager.tsx src/components/SyncLogTable.tsx electron/adapters/csv-import.ts electron/ipc/handlers.ts src/App.tsx
git commit -m "feat: add sync manager UI, sync log table, and CSV import adapter"
```

---

### Task 14: 设置页面

**Files:**
- Create: `src/components/SettingsPanel.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建设置面板**

```typescript
// src/components/SettingsPanel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { DataSource } from '../../shared/types';

export default function SettingsPanel() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    window.electronAPI.invoke('sources:all').then(setSources);
  }, []);

  const handleImportCSV = useCallback(async (sourceId: number) => {
    setMessage('正在导入 CSV...');
    try {
      await window.electronAPI.invoke('sync:run', sourceId);
      setMessage('导入完成！');
    } catch (e: any) {
      setMessage(`导入失败: ${e.message}`);
    }
  }, []);

  return (
    <div className="h-full overflow-auto p-6">
      <h2 className="mb-6 text-xl font-bold text-gray-200">设置</h2>

      {/* CSV 手动导入 */}
      <div className="mb-8">
        <h3 className="mb-3 text-sm font-semibold text-gray-400">CSV 手动导入</h3>
        <p className="mb-4 text-xs text-gray-500">
          导入 CSV 格式的建筑费用数据。文件需包含列: region_id, category, subcategory, unit, data_year, unit_price (可选: spec_code, spec_detail, price_min, price_max, building_type, data_quarter, notes)
        </p>
        <div className="flex items-center gap-3">
          <select
            onChange={(e) => { /* store selected source */ }}
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200"
          >
            <option value="">选择目标数据源...</option>
            {sources.filter(s => s.access_type === 'manual_import').map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            onClick={() => handleImportCSV(1)} // TODO: use selected source
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            📂 选择 CSV 文件
          </button>
        </div>
        {message && <p className="mt-2 text-xs text-gray-400">{message}</p>}
      </div>

      {/* 偏好设置 */}
      <div className="mb-8">
        <h3 className="mb-3 text-sm font-semibold text-gray-400">偏好设置</h3>
        <div className="grid gap-4 max-w-md">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">默认显示币种</label>
            <select className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200">
              <option>原始币种</option>
              <option>EUR</option>
              <option>USD</option>
              <option>CNY</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">启动时自动检查更新</label>
            <input type="checkbox" defaultChecked className="rounded" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">数据存储位置</label>
            <span className="text-xs text-gray-500">%APPDATA%/costbase.db</span>
          </div>
        </div>
      </div>

      {/* 数据源配置 */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-400">数据源配置</h3>
        <p className="text-xs text-gray-500">
          在此添加或修改外部数据源。每个数据源需要一个独立的适配器模块。
          当前已注册 {sources.length} 个数据源。
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 更新 App.tsx**

```typescript
{page === 'settings' && <SettingsPanel />}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/SettingsPanel.tsx src/App.tsx && git commit -m "feat: add settings panel with CSV import and preferences"
```

---

### Task 15: 打包配置与收尾

**Files:**
- Create: `electron-builder.yml`
- Modify: `package.json`
- Modify: `src/App.tsx` (错误边界)

- [ ] **Step 1: 配置 electron-builder**

```yaml
# electron-builder.yml
appId: com.consulting.costbase
productName: CostBase
directories:
  output: release
  buildResources: resources
files:
  - dist/**/*
  - dist-electron/**/*
  - node_modules/**/*
win:
  target: nsis
  icon: resources/icon.ico
mac:
  target: dmg
  icon: resources/icon.icns
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
extraResources:
  - from: node_modules/better-sqlite3/build
    to: better-sqlite3/build
```

- [ ] **Step 2: 添加 TypeScript 配置编译 electron**

```json
// tsconfig.electron.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "outDir": "dist-electron",
    "noEmit": false
  },
  "include": ["electron/**/*"]
}
```

- [ ] **Step 3: 更新 package.json scripts**

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"tsc -p tsconfig.electron.json && electron .\"",
    "build:vite": "vite build",
    "build:electron": "tsc -p tsconfig.electron.json",
    "build": "npm run build:vite && npm run build:electron",
    "pack": "npm run build && electron-builder --dir",
    "dist": "npm run build && electron-builder",
    "start": "npm run build:electron && electron ."
  }
}
```

- [ ] **Step 4: 验证打包**

```bash
npm run dist
```

期望：`release/` 目录下生成安装包。

- [ ] **Step 5: 更新状态栏为动态数据**

修改 StatusBar 组件，通过 IPC 获取最新同步信息：

```typescript
// 在 StatusBar 中:
useEffect(() => {
  window.electronAPI.invoke('sources:all').then((sources: DataSource[]) => {
    const lastSync = sources
      .filter(s => s.last_sync_at)
      .sort((a, b) => new Date(b.last_sync_at!).getTime() - new Date(a.last_sync_at!).getTime())[0];
    if (lastSync) {
      setLastUpdate(`数据更新: ${new Date(lastSync.last_sync_at!).toLocaleDateString('zh-CN')}`);
      setSourceInfo(`来源: ${sources.filter(s => s.is_active).map(s => s.name.split(' ')[0]).join(', ')}`);
    }
  });
}, []);
```

- [ ] **Step 6: 提交**

```bash
git add electron-builder.yml tsconfig.electron.json package.json src/components/StatusBar.tsx
git commit -m "feat: add electron-builder config and finalize packaging"
```

---

## 验证清单

在完成所有 Tasks 后，逐项验证：

- [ ] `npm run dev` — 开发模式正常启动，Electron 窗口显示 UI
- [ ] 地区树选择器 — 展开/折叠/搜索/选择正常
- [ ] 费用查询 — 筛选条件 → 表格显示数据
- [ ] 全文搜索 — 搜索 "混凝土" 返回匹配结果
- [ ] 地区对比 — 选 3 个地区 → 并排对比表格
- [ ] 数据同步 — 面板显示数据源，手动同步触发日志
- [ ] Excel 导出 — 导出文件内容与表格一致
- [ ] PDF 导出 — 导出 PDF 格式正确
- [ ] CSV 导入 — 选择文件 → 数据入库
- [ ] 设置页面 — 偏好设置可交互
- [ ] 状态栏 — 显示最新同步和来源信息
- [ ] `npm run dist` — 成功生成安装包

---

> 📅 Plan created: 2025-06-28 | Based on spec: docs/specs/2025-06-28-cost-knowledge-base-design.md
