import React, { useState, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import FilterPanel from './components/FilterPanel';
import CostTable from './components/CostTable';
import SearchBar from './components/SearchBar';
import ComparisonView from './components/ComparisonView';
import SyncManager from './components/SyncManager';
import SettingsPanel from './components/SettingsPanel';
import { useCostItems } from './hooks/useCostItems';
import { useT } from './i18n/LanguageContext';
import type { CostItemFilter, CostItem, QueryResult } from '../shared/types';

type Page = 'query' | 'compare' | 'sync' | 'settings';

// --- Browser export helpers ---

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob(['﻿' + content], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportCSV(items: any[], title: string) {
  const headers = ['Subcategory', 'Spec Code', 'Spec Detail', 'Unit', 'Unit Price', 'Min Price', 'Max Price', 'Data Source'];
  const rows = items.map((r: any) => [
    r.subcategory, r.spec_code || '', r.spec_detail || '', r.unit,
    r.unit_price ?? '', r.price_min ?? '', r.price_max ?? '',
    r.source_name || '',
  ].map(v => typeof v === 'string' && (v.includes(',') || v.includes('"')) ? `"${v.replace(/"/g, '""')}"` : v).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  downloadBlob(csv, `${title.replace(/\s+/g, '_')}.csv`, 'text/csv');
}

async function exportPDF(items: any[], title: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFontSize(13);
  doc.text(title, 10, 14);
  doc.setFontSize(9);
  doc.setTextColor(128);
  doc.text(`Exported: ${new Date().toLocaleString()}`, 10, 21);

  const cols = ['Material', 'Spec', 'Detail', 'Unit', 'Price', 'Min', 'Max', 'Source'];
  const colW = [28, 22, 24, 14, 24, 24, 24, 24];
  const startY = 28;
  const rowH = 7;

  // Header
  doc.setFontSize(7);
  doc.setFillColor(59, 130, 246);
  doc.setTextColor(255, 255, 255);
  let x = 10;
  cols.forEach((c, i) => {
    doc.rect(x, startY, colW[i], rowH, 'F');
    doc.text(c, x + 1, startY + 5);
    x += colW[i];
  });

  // Rows
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(7);
  items.forEach((item: any, ri: number) => {
    const y = startY + (ri + 1) * rowH;
    if (y > 190) { doc.addPage(); /* simplistic - won't re-draw header */ }
    if (ri % 2 === 0) { doc.setFillColor(245, 245, 245); doc.rect(10, y, pageW - 20, rowH, 'F'); }
    const vals = [item.subcategory, item.spec_code || '', item.spec_detail || '', item.unit,
      item.unit_price?.toFixed(2) ?? '', item.price_min?.toFixed(2) ?? '', item.price_max?.toFixed(2) ?? '', item.source_name || ''];
    x = 10;
    vals.forEach((v, i) => { doc.text(String(v).substring(0, 30), x + 1, y + 5); x += colW[i]; });
  });

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
}

// ---

function QueryPage() {
  const { t, tr } = useT();
  const { result, loading, query, search } = useCostItems();
  const [searchMode, setSearchMode] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [regionTitle, setRegionTitle] = useState(t('query.title'));
  const lastResult = useRef<QueryResult<CostItem> | null>(null);

  // Keep a ref to the latest result for export
  if (result) lastResult.current = result;

  const handleQuery = useCallback((filter: CostItemFilter) => {
    setSearchMode(false);
    query(filter);
    if (filter.region_id) {
      window.electronAPI.invoke('regions:path', filter.region_id).then((p: unknown) => {
        const path = p as { name: string }[];
        if (path?.length) setRegionTitle(path.map(r => tr(r.name)).join(' · '));
      });
    } else setRegionTitle(t('query.title'));
  }, [query, t, tr]);

  const handleSearch = useCallback((keyword: string) => {
    setSearchMode(true);
    setSearchKeyword(keyword);
    search(keyword);
  }, [search]);

  const handleExportExcel = useCallback(() => {
    const items = lastResult.current?.data;
    if (!items || items.length === 0) return;
    exportCSV(items, regionTitle);
  }, [regionTitle]);

  const handleExportPDF = useCallback(() => {
    const items = lastResult.current?.data;
    if (!items || items.length === 0) return;
    exportPDF(items, regionTitle);
  }, [regionTitle]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <SearchBar onSearch={handleSearch} />
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: 260, borderRight: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
          <FilterPanel onQuery={handleQuery} onSearch={handleSearch} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-root)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
              {searchMode ? `🔍 ${searchKeyword}` : regionTitle}
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleExportExcel}
                style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--green)', background: 'var(--green-bg)', color: 'var(--green)', cursor: 'pointer', fontSize: 12.5, fontWeight: 500 }}>
                {t('query.export_excel')}
              </button>
              <button onClick={handleExportPDF}
                style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12.5 }}>
                {t('query.export_pdf')}
              </button>
            </div>
          </div>
          <CostTable result={result} loading={loading} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>('query');
  return (
    <Layout activePage={page} onNavigate={setPage}>
      {page === 'query' && <QueryPage />}
      {page === 'compare' && <ComparisonView />}
      {page === 'sync' && <SyncManager />}
      {page === 'settings' && <SettingsPanel />}
    </Layout>
  );
}
