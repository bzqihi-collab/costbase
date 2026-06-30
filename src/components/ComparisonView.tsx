import React, { useState, useCallback } from 'react';
import RegionTree from './RegionTree';
import { useT } from '../i18n/LanguageContext';
import type { Region } from '../../shared/types';

export default function ComparisonView() {
  const { t, tr } = useT();
  const [selected, setSelected] = useState<Region[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleRegion = useCallback((r: Region) => {
    setSelected(prev => prev.find(x => x.id === r.id) ? prev.filter(x => x.id !== r.id) : prev.length < 3 ? [...prev, r] : prev);
  }, []);

  const compare = useCallback(async () => {
    if (selected.length < 2) return;
    setLoading(true);
    const result = await window.electronAPI.invoke('cost-items:compare', selected.map(r => r.id), category || undefined);
    setData(result || []);
    setLoading(false);
  }, [selected, category]);

  const map = new Map<string, any>();
  for (const row of data) {
    const k = `${row.subcategory}|${row.spec_code}|${row.unit}`;
    if (!map.has(k)) map.set(k, { subcategory: row.subcategory, spec_code: row.spec_code, unit: row.unit, prices: {} });
    map.get(k)!.prices[row.region_name] = { unit_price: row.unit_price, currency: row.currency };
  }
  const rows = Array.from(map.values());

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg-root)' }}>
      <div style={{ width: 260, borderRight: '1px solid var(--border)', background: 'var(--bg-surface)', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t('compare.select')}</h3>
        <RegionTree onSelect={toggleRegion} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{t('compare.selected')}</div>
          {selected.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', borderRadius: 'var(--radius-sm)', marginBottom: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 12.5, color: 'var(--text-secondary)' }}>
              <span>{tr(r.name)}</span>
              <button onClick={() => toggleRegion(r)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
          ))}
          {selected.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('compare.none')}</div>}
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13 }}>
          <option value="">{t('filter.all')}</option>
          <option value="material">{t('filter.material')}</option>
          <option value="labor">{t('filter.labor')}</option>
          <option value="equipment">{t('filter.equipment')}</option>
          <option value="transport">{t('filter.transport')}</option>
        </select>
        <button onClick={compare} disabled={selected.length < 2}
          style={{ padding: '10px 0', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: '#1a1a1a', opacity: selected.length < 2 ? 0.4 : 1 }}>
          {t('compare.start')}
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
        {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>{t('compare.loading')}</div>}
        {!loading && rows.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: 30, opacity: 0.3 }}>📊</div>}
        {rows.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('col.subcategory')}</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('col.unit')}</th>
                {selected.map(r => (<th key={r.id} style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--accent-light)', textTransform: 'uppercase' }}>{tr(r.name)}</th>))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-card)' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontWeight: 500, color: 'var(--text)' }}>{row.subcategory}</span>
                    <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--blue)', fontFamily: 'monospace' }}>{row.spec_code}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{row.unit}</td>
                  {selected.map(r => {
                    const p = row.prices[r.name];
                    return (<td key={r.id} style={{ padding: '10px 14px', textAlign: 'right' }}>
                      {p ? <span><span style={{ fontWeight: 600, color: 'var(--text)' }}>{p.unit_price?.toLocaleString() || '—'}</span><span style={{ marginLeft: 4, fontSize: 11, color: 'var(--text-muted)' }}>{p.currency}</span></span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>);
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
