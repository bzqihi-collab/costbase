import React from 'react';
import { useT } from '../i18n/LanguageContext';
import type { CostItem, QueryResult } from '../../shared/types';

function fmt(n: number | null): string {
  if (n == null) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CostTable({ result, loading, emptyText }: {
  result: QueryResult<CostItem> | null; loading: boolean; emptyText?: string;
}) {
  const { t } = useT();

  const cols = [
    { key: 'subcategory', label: t('col.subcategory'), style: { minWidth: 120 } },
    { key: 'spec_code', label: t('col.spec'), style: { minWidth: 100 } },
    { key: 'spec_detail', label: t('col.detail'), style: { minWidth: 100 } },
    { key: 'unit', label: t('col.unit'), style: { minWidth: 60 } },
    { key: 'unit_price', label: t('col.price'), style: { minWidth: 110, textAlign: 'right' as const } },
    { key: 'price_min', label: t('col.min'), style: { minWidth: 100, textAlign: 'right' as const } },
    { key: 'price_max', label: t('col.max'), style: { minWidth: 100, textAlign: 'right' as const } },
    { key: 'source_name', label: t('col.source'), style: { minWidth: 130 } },
  ];

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 28, height: 28, border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          {t('query.loading')}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!result || result.data.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📋</div>
          {emptyText || t('query.no_data')}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <tr style={{ background: 'var(--bg-card)', borderBottom: '2px solid var(--border)' }}>
            {cols.map(col => (
              <th key={col.key} style={{ padding: '11px 14px', fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: col.style.textAlign || 'left', whiteSpace: 'nowrap', ...col.style }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(result.data as any[]).map((item, i) => (
            <tr key={item.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-card)', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'var(--bg-card)'; }}
            >
              <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--text)' }}>{item.subcategory}</td>
              <td style={{ padding: '10px 14px', fontFamily: '"SF Mono","Cascadia Code","Consolas",monospace', fontSize: 12.5, color: 'var(--blue)' }}>{item.spec_code || '—'}</td>
              <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 12.5 }}>{item.spec_detail || '—'}</td>
              <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{item.unit}</td>
              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmt(item.unit_price)}</td>
              <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(item.price_min)}</td>
              <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(item.price_max)}</td>
              <td style={{ padding: '10px 14px', fontSize: 11.5, color: 'var(--text-muted)' }}>
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, background: 'var(--bg-hover)', fontSize: 11 }}>{item.source_name || '—'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        {t('query.records').replace('{n}', String(result.total))}
        <span style={{ marginLeft: 12 }}>{t('query.page')} {result.page}</span>
      </div>
    </div>
  );
}
