import { BaseAdapter, AdapterFetchResult } from './base';
import type { CostItem } from '../../shared/types';

export class EurostatAdapter extends BaseAdapter {
  name = 'Eurostat Construction Cost Index';
  sourceId = 1; // matches seed data

  async fetch(): Promise<AdapterFetchResult> {
    const items: Omit<CostItem, 'id' | 'created_at' | 'updated_at'>[] = [];
    const errors: string[] = [];

    try {
      const url = 'https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/sts_copi_a?format=JSON';
      const response = await fetch(url);
      if (!response.ok) {
        errors.push(`Eurostat API returned ${response.status}`);
        return { items, errors };
      }

      const json = await response.json();
      console.log(`[Eurostat] Fetched data successfully`);
      // Full SDMX-JSON parsing would go here
      // Mapping Eurostat country codes to our region_id values
      // For now, this is the framework — actual mapping depends on API response structure
    } catch (e: any) {
      errors.push(`Eurostat fetch error: ${e.message}`);
    }

    return { items, errors };
  }
}
