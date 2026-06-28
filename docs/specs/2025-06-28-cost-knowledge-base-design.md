# 建筑行业海外费用标准知识库系统 — 设计规格文档

> 版本: v1.0 | 日期: 2025-06-28 | 状态: 待审批

---

## 1. 项目概述

### 1.1 背景

一家建筑行业咨询公司，主要业务是为海外建筑公司提供报价标准参考。核心工作是根据不同国家/地区的建筑市场情况，输出建筑材料费、人工费、设备租赁费、运输费等各项行业标准费用，帮助客户制定合理的工程报价。

### 1.2 核心目标

构建一个**桌面端知识库系统**，实现：

1. **按地域查询**：按国家→地区/城市层级，快速检索建筑费用标准数据
2. **离线可用**：所有数据存储在本地，无网络也能查询
3. **定时更新**：对接外部可信任的官方数据源，自动同步最新数据
4. **数据可靠**：每一条费用记录必须可追溯到真实、权威的来源

### 1.3 用户画像

| 属性 | 描述 |
|---|---|
| 使用者 | 公司内部造价咨询顾问 |
| 人数 | 5-10 人 |
| 场景 | 为客户制作报价方案时，查询目标地区的费用标准作为参考依据 |
| 技术要求 | 单机版，无需账号/权限系统 |
| 平台 | 跨平台（Windows / macOS） |

---

## 2. 数据模型

### 2.1 维度定义

| 维度 | 说明 | 示例 |
|---|---|---|
| **地域（Region）** | 国家→州/省→城市的树形层级结构 | 德国 > 巴伐利亚 > 慕尼黑 |
| **费用类别（Category）** | 费用大类 | material / labor / equipment / transport |
| **子类别（Subcategory）** | 费用子类 | 混凝土、钢筋、砌体、木结构... |
| **规格型号（Spec Code）** | 中粒度规格标识 | C30/37、HRB400、Φ12-16mm |
| **建筑类型（Building Type）** | 适用建筑类别 | residential / commercial / industrial / infrastructure |
| **时间（Data Period）** | 数据所属年份和季度 | 2025 Q2 |
| **数据来源（Source）** | 每一条数据可追溯的出处 | Destatis, Eurostat, BCA |

### 2.2 数据库表结构 (SQLite)

```sql
-- 地区层级表（自引用树结构）
CREATE TABLE regions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,              -- 例: "巴伐利亚"
    level       TEXT NOT NULL,              -- country / state / city
    parent_id   INTEGER REFERENCES regions(id),
    currency    TEXT,                        -- 例: "EUR"
    unit_system TEXT DEFAULT 'metric',       -- metric / imperial
    iso_code    TEXT                         -- ISO国家代码 例: "DE"
);

-- 费用条目表（核心表）
CREATE TABLE cost_items (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    region_id      INTEGER NOT NULL REFERENCES regions(id),
    category       TEXT NOT NULL,           -- material / labor / equipment / transport
    subcategory    TEXT NOT NULL,           -- 例: "混凝土"
    spec_code      TEXT,                    -- 规格型号: "C30/37"
    spec_detail    TEXT,                    -- 规格补充: "泵送/非泵送"
    unit           TEXT NOT NULL,           -- 单位: m³ / 吨 / 工日 / 台班
    unit_price     REAL,                    -- 推荐单价
    price_min      REAL,                    -- 市场最低价
    price_max      REAL,                    -- 市场最高价
    building_type  TEXT DEFAULT 'all',      -- residential/commercial/industrial/infrastructure/all
    data_year      INTEGER NOT NULL,
    data_quarter   INTEGER CHECK(data_quarter BETWEEN 1 AND 4),
    source_id      INTEGER REFERENCES sources(id),
    is_manual_fix  INTEGER DEFAULT 0,       -- 是否经人工修改过（冲突检测用）
    status         TEXT DEFAULT 'active',   -- active / superseded
    notes          TEXT,
    created_at     TEXT DEFAULT (datetime('now')),
    updated_at     TEXT DEFAULT (datetime('now'))
);

-- 数据来源表
CREATE TABLE sources (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,          -- 例: "Destatis Baukostenindex"
    type            TEXT NOT NULL,          -- gov_platform / official_statistics / industry_assoc
    country         TEXT,                   -- 覆盖国家 ISO 代码
    url             TEXT,                   -- 数据源官网
    api_endpoint    TEXT,                   -- API 地址（如有）
    access_type     TEXT DEFAULT 'public',  -- public / api_free / api_key / manual_import
    sync_frequency  TEXT,                   -- weekly / monthly / quarterly
    last_sync_at    TEXT,
    is_active       INTEGER DEFAULT 1,
    api_config      TEXT,                   -- JSON: API key, 请求参数等（加密存储）
    notes           TEXT
);

-- 同步日志表
CREATE TABLE sync_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id       INTEGER REFERENCES sources(id),
    started_at      TEXT,
    finished_at     TEXT,
    status          TEXT,                   -- success / partial / failed
    new_records     INTEGER DEFAULT 0,
    updated_records INTEGER DEFAULT 0,
    conflicts       INTEGER DEFAULT 0,
    error_message   TEXT,
    details         TEXT                    -- JSON: 详细统计信息
);

-- 全文搜索索引（FTS5）
CREATE VIRTUAL TABLE cost_items_fts USING fts5(
    subcategory, spec_code, spec_detail, notes,
    content='cost_items',
    content_rowid='id'
);
```

---

## 3. 技术架构

### 3.1 技术选型

| 层 | 技术 | 理由 |
|---|---|---|
| 桌面壳 | Electron | 跨平台成熟方案，VSCode/Notion 同款 |
| 前端 | React + TypeScript | 生态成熟，表格/筛选/搜索组件丰富 |
| 数据库 | SQLite (better-sqlite3) | 轻量本地数据库，离线毫秒查询 |
| 同步引擎 | Node.js (主进程) | 与 Electron 深度集成，定时任务 + HTTP 客户端 |
| 数据校验 | Zod | 运行时类型校验，外部数据入库前把关 |
| 打包 | electron-builder | 一键构建 .dmg / .exe / .AppImage |

### 3.2 架构图

```
┌─────────────────────────────────────────────────────┐
│                  Electron 桌面壳                      │
│  ┌───────────────────────────────────────────────┐  │
│  │              React 前端 (Renderer)              │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ 地区选择  │ │ 费用浏览  │ │  对比分析     │  │  │
│  │  │ 国家→城市 │ │ 分类筛选  │ │  多地区并列   │  │  │
│  │  └──────────┘ └──────────┘ └──────────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ 全文搜索  │ │ 数据导出  │ │  更新管理     │  │  │
│  │  │ FTS5全文  │ │ Excel/PDF │ │  手动+定时    │  │  │
│  │  └──────────┘ └──────────┘ └──────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│                        │ IPC (contextBridge)          │
│  ┌───────────────────────────────────────────────┐  │
│  │            Node.js 主进程 (Main)                │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ 数据适配  │ │ 定时调度  │ │  数据校验     │  │  │
│  │  │ adapters/ │ │cron任务   │ │  Zod schema  │  │  │
│  │  └──────────┘ └──────────┘ └──────────────┘  │  │
│  │  ┌──────────┐ ┌──────────────────────────┐   │  │
│  │  │ 导出引擎  │ │  SQLite (better-sqlite3) │   │  │
│  │  │xlsx/pdf   │ │  + FTS5 全文搜索         │   │  │
│  │  └──────────┘ └──────────────────────────┘   │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 3.3 核心设计原则

- **离线优先（Offline-First）**：所有查询走本地 SQLite，不依赖网络
- **适配器模式（Adapter Pattern）**：每个数据源一个独立的适配器模块，负责字段映射、单位转换、币种换算
- **暂存-校验-合并（Staging Pipeline）**：外部数据 → staging 临时表 → Zod 校验 → 合并到正式表
- **版本保留**：旧数据不删除，标记为 `superseded`，支持按年份回看历史数据
- **冲突检测**：经人工修改过的记录（`is_manual_fix=1`），同步时不自动覆盖，弹出确认

---

## 4. 认证数据源清单

> **数据可靠性原则**：所有数据源必须满足以下至少一条：
> 1. 政府统计机构官方发布
> 2. 政府授权/委托的行业研究机构发布
> 3. 可公开访问、可验证的标准化数据集

### 4.1 欧洲

| 国家/地区 | 数据源 | 发布机构 | 类型 | 访问方式 |
|---|---|---|---|---|
| **欧盟整体** | Construction Cost Index (sts_copi_a) | **Eurostat**（欧盟统计局） | 官方统计 | SDMX 2.1 API / CSV 下载 |
| **德国** | Baukostenindex / Baupreisindex | **Destatis**（联邦统计局） | 官方统计 | GENESIS-Online 数据库 / 免费PDF |
| **英国** | Building Materials and Components Statistics | **ONS**（国家统计局） | 官方统计 | gov.uk 月度公报 |
| **荷兰** | Input Price Index New Dwellings | **CBS**（荷兰统计局） | 官方统计 | data.overheid.nl 开放数据 |
| **瑞典** | Construction Cost Index (CCI) | **SCB**（瑞典统计局） | 官方统计 | scb.se 免费下载 |
| **芬兰** | Building Cost Index | **Statistics Finland** | 官方统计 | stat.fi 公开数据 |
| **希腊** | Material Costs Index in Construction | **ELSTAT**（希腊统计局） | 官方统计 | statistics.gr |

### 4.2 亚太

| 国家/地区 | 数据源 | 发布机构 | 类型 | 访问方式 |
|---|---|---|---|---|
| **日本** | 建設物価指数 (CMPI) / 建設工事費デフレーター | **国土交通省 (MLIT)** / 建設物価調査会 | 政府+行业 | 月度报告 PDF / 网站公开 |
| **新加坡** | Tender Price Index + Basic Construction Materials Price | **BCA**（建设局） | 政府机构 | bca.gov.sg 季度更新 |
| **澳大利亚** | Producer Price Indexes — Housing Construction | **ABS**（澳大利亚统计局） | 官方统计 | abs.gov.au 免费下载 |

### 4.3 中东

| 国家/地区 | 数据源 | 发布机构 | 类型 | 访问方式 |
|---|---|---|---|---|
| **阿联酋（迪拜）** | Construction Cost Index (CCI) | **Dubai Statistics Center (DSC)** | 政府机构 | dsc.gov.ae 季度PDF报告 |
| **沙特阿拉伯** | Construction Cost Index | **GASTAT**（统计总局） | 官方统计 | stats.gov.sa 月度更新 |

### 4.4 非洲

| 国家/地区 | 数据源 | 发布机构 | 类型 | 访问方式 |
|---|---|---|---|---|
| **南非** | Construction Material Price Indices (P0151.1) | **Stats SA**（南非统计局） | 官方统计 | statssa.gov.za 月度免费PDF |
| **埃及** | Monthly Bulletin of Average Retail Prices of Major Building Materials | **CAPMAS**（中央公共动员与统计局） | 官方统计 | eip.gov.eg 月度免费PDF |
| **肯尼亚** | Construction Input Price Indices (CIPI) | **KNBS**（肯尼亚国家统计局） | 官方统计 | knbs.or.ke 季度免费PDF |
| **尼日尔** | Indice des Prix des Matériaux de Construction (IPMC) | **INS-Niger**（尼日尔国家统计研究所） | 官方统计 | stat-niger.org 月度免费PDF |
| **塞内加尔** | Indice du Bâtiment et des Travaux Publics (IBTP) | **ANSD**（塞内加尔国家统计与人口局） | 官方统计 | ansd.sn 季度免费PDF |
| **尼日利亚** | Construction Input Price Index | **NBS**（尼日利亚国家统计局） | 官方统计 | nigerianstat.gov.ng（在线可用性有限，需 CSV 手动导入） |

> **关于非洲数据源的说明**：
> - 非洲各国统计局的数据公开程度差异较大，部分国家仅提供 PDF 报告而非结构化数据下载
> - **南非 Stats SA** 和**肯尼亚 KNBS** 是非洲数据质量最高的来源，提供英文报告和详细的材料分类指数
> - **尼日利亚 NBS** 虽然发布施工投入价格指数，但官网可访问性不稳定，建议配合行业报告（如 BusinessDay 的市场调查数据）交叉验证
> - 西非法语国家（尼日尔、塞内加尔）的统计局发布 IPMC/IBTP 指数，格式较统一，便于适配器标准化
> - 建议初始阶段优先接入南非、埃及、肯尼亚三个数据最稳定的来源
>
> **待拓展的非洲潜力数据源**（确认存在但需进一步验证 API/下载方式）：
> - 🇲🇦 **摩洛哥** — HCP（计划高专署）发布建筑成本指数
> - 🇹🇳 **突尼斯** — INS（国家统计研究所）发布建材价格指数
> - 🇨🇮 **科特迪瓦** — INS 可能发布相关指数
> - 🇨🇲 **喀麦隆** — INS 可能发布相关指数

### 4.5 北美

| 国家/地区 | 数据源 | 发布机构 | 类型 | 访问方式 |
|---|---|---|---|---|
| **美国/加拿大** | RSMeans Data | **Gordian** | 商业（行业标准） | API / 年度订阅（92,000+ 条目，970+ 地区） |

> **关于 RSMeans**：虽然不是政府来源，但它是北美建筑行业 80 多年的标准参考数据，被政府项目、保险公司、法律合同广泛引用。如需完全免费的替代方案，可用美国劳工统计局 (BLS) 的 Producer Price Index (PPI) 作为宏观趋势参考。

### 4.6 数据源扩展策略

在系统中，每个数据源以适配器插件的方式存在。新增一个国家/地区的数据源时：

1. 确认数据源符合可靠性标准（政府/行业协会/权威商业数据）
2. 编写对应的 adapter 模块（字段映射 + 单位/币种转换）
3. 在 sources 表中注册、配置同步频率
4. 首次全量导入，后续增量同步

---

## 5. 同步机制

### 5.1 同步流水线

```
外部数据源 → Adapter（标准化+币种换算）
           → Staging 临时表（暂存）
           → Zod Schema 校验
           → 冲突检测（is_manual_fix 比对）
           → 合并到 cost_items 正式表
           → sync_log 记录
```

### 5.2 同步策略

| 策略 | 说明 |
|---|---|
| **增量更新** | 按年份/季度维度拉取变化数据，不做全量替换 |
| **Staging 暂存** | 外部数据先入 staging 表，校验通过后再合并；校验失败的数据通知用户人工处理 |
| **适配器模式** | 每个数据源一个独立 adapter，统一输出标准化的 cost_items 格式 |
| **版本保留** | 旧数据标记 `superseded` 而非物理删除，可按年份回看历史 |
| **手动修正保护** | `is_manual_fix=1` 的记录不会被自动覆盖，弹出冲突解决界面 |

### 5.3 定时调度示例

```
BBSR/Destatis (德国)      → 每月 1 号 09:00
Eurostat (欧盟)            → 每季度首月 5 号
ONS (英国)                 → 每月 15 号
ABS (澳大利亚)             → 每季度 10 号
BCA (新加坡)               → 每季度 10 号
DSC (迪拜)                 → 每季度 15 号
手动同步                   → 随时触发 "立即同步全部" 或单数据源
```

### 5.4 币种与单位处理

- 数据源返回的原始币种保留在 `regions.currency` 中
- 费用录入时，同时存储原始币种价格
- 前端可按需显示原始币种或用户设定的偏好币种（基于内置汇率表或手动输入汇率转换）
- 单位系统（metric/imperial）在 `regions.unit_system` 中标注，适配器负责统一

---

## 6. 用户界面设计

### 6.1 主窗口布局

三栏结构（~1200×800）：

```
┌──────────┬────────────┬──────────────────────────────────┐
│  左侧     │  中间       │  右侧                             │
│  导航栏    │  筛选面板    │  数据区域                         │
│ 200px     │ 280px       │  flex: 1                          │
├──────────┤            │                                  │
│ 📋 费用查询│  地区 ▾     │  建筑材料费 — 德国·慕尼黑 (2025Q2) │
│ 📊 地区对比│  费用类别   │  ┌─────────────────────────────┐ │
│ 🔄 数据同步│  建筑类型   │  │ 规格 │补充 │单位│ 单价│最低│最高│ │
│ ⚙️ 设置    │  年份 ▾    │  │ C30  │泵送 │m³ │128€│118€│142€│ │
│            │            │  │ ...  │...  │...│ ...│ ...│ ...│ │
│            │  [🔍 查询] │  └─────────────────────────────┘ │
│            │            │  [📥 Excel] [📄 PDF]             │
├──────────┴────────────┴──────────────────────────────────┤
│ 底部状态栏: 数据更新 2025-06-15 | 来源: Destatis, Eurostat │
└──────────────────────────────────────────────────────────┘
```

### 6.2 功能页面

| 页面 | 功能 |
|---|---|
| **费用查询**（主页） | 地区层级选择 → 类别/建筑类型/年份筛选 → 表格浏览 → 导出 |
| **地区对比** | 选 2-3 个地区，同材料并列对比（价格差 + 百分比差异高亮） |
| **数据同步** | 查看各数据源状态、手动触发同步、查看同步历史日志 |
| **设置** | 数据源管理（开关/频率）、CSV 手动导入、偏好设置（默认币种、语言） |

### 6.3 交互要点

- **地区面包屑导航**：国家 ▸ 州/省 ▸ 城市，点击任意层级快速跳转
- **价格区间展示**：推荐价（粗体）+ 最低价-最高价（浅色），直观反映市场波动
- **来源水印**：每条记录 hover 可看到完整来源信息（机构名 + 数据发布时间）
- **底部状态栏常驻**：始终显示数据最新更新时间 + 下次计划同步时间
- **全文搜索**：顶部全局搜索栏，基于 FTS5，支持规格型号、材料名、备注文本搜索

---

## 7. 数据导出

| 格式 | 用途 | 实现 |
|---|---|---|
| **Excel (.xlsx)** | 顾问做报价方案时直接复制数据 | exceljs 库，保留格式（数字/百分比/颜色） |
| **PDF** | 打印或作为附件发给客户 | 内置 PDF 生成，带公司 Logo 和页脚来源标注 |

导出内容包含：
- 当前筛选条件（地区、类别、年份）作为标题
- 数据表格 + 每条记录的数据来源标注
- 导出时间戳

---

## 8. 非功能性需求

| 类别 | 要求 |
|---|---|
| **性能** | 10万条数据内，筛选+表格渲染 < 500ms |
| **搜索** | FTS5 全文索引，关键字搜索 < 200ms |
| **安装包** | Windows .exe / macOS .dmg，目标 < 200MB |
| **离线** | 无网络环境下所有查询功能完全可用 |
| **数据安全** | SQLite 文件仅本地存储，API Key 加密存储（如有） |
| **更新** | 应用自动检查新版本（GitHub Releases） |

---

## 9. 项目结构

```
cost-knowledge-base/
├── electron/                  # Electron 主进程
│   ├── main.ts                # 主入口
│   ├── preload.ts             # contextBridge API
│   ├── adapters/              # 数据源适配器
│   │   ├── eurostat.ts        # 欧盟 Eurostat
│   │   ├── destatis.ts        # 德国 Destatis
│   │   ├── ons_uk.ts          # 英国 ONS
│   │   ├── abs_au.ts          # 澳大利亚 ABS
│   │   ├── bca_sg.ts          # 新加坡 BCA
│   │   ├── dsc_ae.ts          # 阿联酋 DSC
│   │   ├── statssa_za.ts      # 南非 Stats SA
│   │   ├── capmas_eg.ts       # 埃及 CAPMAS
│   │   ├── knbs_ke.ts         # 肯尼亚 KNBS
│   │   ├── ins_ne.ts          # 尼日尔 INS
│   │   ├── ansd_sn.ts         # 塞内加尔 ANSD
│   │   └── csv_import.ts      # 通用 CSV 导入
│   ├── sync/                  # 同步调度
│   │   ├── scheduler.ts       # cron 定时任务
│   │   ├── pipeline.ts        # staging → 校验 → 合并
│   │   └── conflict.ts        # 冲突检测与解决
│   ├── db/                    # 数据库层
│   │   ├── connection.ts      # better-sqlite3 连接
│   │   ├── migrations/        # SQL 迁移文件
│   │   ├── queries/           # 结构化查询
│   │   └── seed/              # 初始种子数据
│   ├── export/                # 导出引擎
│   │   ├── excel.ts
│   │   └── pdf.ts
│   └── ipc/                   # IPC 通信处理
├── src/                       # React 前端
│   ├── App.tsx
│   ├── components/
│   │   ├── layout/            # 布局组件
│   │   ├── region-tree/       # 地区树选择器
│   │   ├── cost-table/        # 费用数据表格
│   │   ├── search/            # 搜索组件
│   │   ├── comparison/        # 地区对比
│   │   ├── sync-manager/      # 同步管理面板
│   │   └── export/            # 导出按钮
│   ├── hooks/                 # 自定义 hooks
│   ├── lib/                   # 工具函数
│   └── styles/                # 样式
├── shared/                    # 前后端共享
│   └── types.ts               # TypeScript 类型定义
│   └── schemas.ts             # Zod 校验 schema
├── resources/                 # 应用图标等静态资源
├── package.json
├── electron-builder.yml       # 打包配置
└── README.md
```

---

## 10. 开发路线图

### Phase 1 — MVP（4-6 周）

| 周 | 内容 |
|---|---|
| 1 | Electron + React 项目搭建，SQLite 数据库初始化，基础表结构 + 迁移 |
| 2 | 地区层级树组件，费用查询页面（筛选 + 表格），FTS5 全文搜索 |
| 3 | 数据同步管道（staging → 校验 → 合并），首个适配器（Eurostat API） |
| 4 | 地区对比页面，Excel/PDF 导出 |
| 5 | 同步管理面板（调度 + 日志），CSV 导入，设置页面 |
| 6 | 打包配置、测试、内部试用、修复 |

### Phase 2 — 扩展（后续迭代）

- 更多数据源适配器（按需添加国家/地区）
- 币种自动转换（对接实时汇率 API）
- 图表可视化（价格趋势折线图、地区对比柱状图）
- 数据导出为报价方案模板（一键生成报价文档）
- 自动更新（应用内检查新版本并升级）

---

## 11. 风险与注意事项

| 风险 | 缓解措施 |
|---|---|
| 外部数据源 API 变更或停更 | 适配器独立解耦，单源失效不影响其他源；CSV 手动导入作为后备 |
| 各数据源格式、分类标准不统一 | 适配器负责标准化映射；spec_code + notes 字段保留原始信息 |
| 数据版权/使用限制 | 仅使用公开/免费 API 和政府开放数据；付费数据源（如 RSMeans）单独采购 |
| SQLite 单文件并发（多人访问同一文件） | 当前单机版设计下无此问题；若未来需要多用户，可升级至 SQLite WAL 模式或迁移至 PostgreSQL |
| 安装包体积过大 | Electron 裁剪、按需引入依赖；目标 < 200MB |

---

## 12. 附录：术语表

| 术语 | 说明 |
|---|---|
| Adapter / 适配器 | 针对特定数据源的数据抓取+转换模块 |
| Staging / 暂存表 | 临时存放外部拉取数据的中间表 |
| FTS5 | SQLite 全文搜索引擎 |
| IPC | Electron 主进程与渲染进程间通信 |
| CCI / TPI | Construction Cost Index / Tender Price Index |
| is_manual_fix | 标记记录是否被人工修改过（用于冲突保护） |

---

> 📅 设计确认日期: 2025-06-28 | ✍️ 下一步: 编写实施计划
