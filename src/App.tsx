import React, { useState } from 'react';
import Layout from './components/Layout';

type Page = 'query' | 'compare' | 'sync' | 'settings';

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
      {page === 'query' && <PlaceholderPage title="费用查询" />}
      {page === 'compare' && <PlaceholderPage title="地区对比" />}
      {page === 'sync' && <PlaceholderPage title="数据同步" />}
      {page === 'settings' && <PlaceholderPage title="设置" />}
    </Layout>
  );
}
