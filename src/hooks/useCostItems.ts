import { useState, useCallback } from 'react';
import type { CostItem, CostItemFilter, QueryResult } from '../../shared/types';

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
