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
