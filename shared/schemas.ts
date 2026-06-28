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
