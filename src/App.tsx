import React, { useState, useCallback } from 'react';
import Layout from './components/Layout';
import FilterPanel from './components/FilterPanel';
import CostTable from './components/CostTable';
import { useCostItems } from './hooks/useCostItems';
import type { CostItemFilter } from '../shared/types';

type Page = 'query' | 'compare' | 'sync' | 'settings';

function QueryPage() {
  const { result, loading, query } = useCostItems();

  const handleQuery = useCallback((filter: CostItemFilter) => {
    query(filter);
  }, [query]);

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-gray-800">
        <FilterPanel onQuery={handleQuery} onSearch={() => {}} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-200">费用查询</h2>
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
