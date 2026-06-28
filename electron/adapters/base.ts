import type { CostItem } from '../../shared/types';

export interface AdapterFetchResult {
  items: Omit<CostItem, 'id' | 'created_at' | 'updated_at'>[];
  errors: string[];
}

export abstract class BaseAdapter {
  abstract name: string;
  abstract sourceId: number;

  abstract fetch(params?: Record<string, unknown>): Promise<AdapterFetchResult>;
}
