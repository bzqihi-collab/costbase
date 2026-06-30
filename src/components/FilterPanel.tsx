import React, { useEffect, useState } from 'react';
import RegionTree from './RegionTree';
import { useT } from '../i18n/LanguageContext';
import type { Region, CostItemFilter } from '../../shared/types';

const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 };
const selectStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13 };
const chipBase: React.CSSProperties = { padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 500, transition: 'all 0.15s', background: 'var(--bg-card)', color: 'var(--text-secondary)' };

interface Props { onQuery: (filter: CostItemFilter) => void; onSearch: (keyword: string) => void; }

export default function FilterPanel({ onQuery }: Props) {
  const { t, tr } = useT();
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedPath, setSelectedPath] = useState<Region[]>([]);
  const [category, setCategory] = useState('');
  const [buildingType, setBuildingType] = useState('');
  const [dataYear, setDataYear] = useState<number | undefined>();
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => { window.electronAPI.invoke('cost-items:years').then((d: unknown) => setYears(d as number[])); }, []);

  const handleRegionSelect = async (region: Region) => {
    setSelectedRegion(region);
    const path = await window.electronAPI.invoke('regions:path', region.id) as Region[];
    setSelectedPath(path);
  };

  const cats = [
    { v: '', l: t('filter.all') },
    { v: 'material', l: t('filter.material') },
    { v: 'labor', l: t('filter.labor') },
    { v: 'equipment', l: t('filter.equipment') },
    { v: 'transport', l: t('filter.transport') },
    { v: 'building_cost', l: t('filter.building_cost') },
    { v: 'infrastructure', l: t('filter.infra') },
    { v: 'index', l: t('filter.index') },
  ];
  const btypes = [
    { v: '', l: t('filter.building_all') }, { v: 'residential', l: t('filter.residential') },
    { v: 'commercial', l: t('filter.commercial') }, { v: 'industrial', l: t('filter.industrial') }, { v: 'infrastructure', l: t('filter.infrastructure') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 18, height: '100%', overflowY: 'auto' }}>
      <div>
        <div style={sectionLabel}>📍 {t('filter.region')}</div>
        <RegionTree onSelect={handleRegionSelect} selectedId={selectedRegion?.id} />
        {selectedPath.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, flexWrap: 'wrap' }}>
            {selectedPath.map((r, i) => (
              <span key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {i > 0 && <span style={{ color: 'var(--text-muted)' }}>›</span>}
                <span style={{ color: i === selectedPath.length - 1 ? 'var(--accent-light)' : 'var(--text-secondary)', fontWeight: i === selectedPath.length - 1 ? 600 : 400 }}>{tr(r.name)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={sectionLabel}>📦 {t('filter.category')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {cats.map(c => {
            const active = category === c.v;
            return <button key={c.v} onClick={() => setCategory(c.v)} style={{ ...chipBase, background: active ? 'var(--accent-bg)' : chipBase.background, color: active ? 'var(--accent-light)' : chipBase.color, fontWeight: active ? 600 : 500 }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'var(--bg-card)'; }}
            >{c.l}</button>;
          })}
        </div>
      </div>

      <div>
        <div style={sectionLabel}>🏢 {t('filter.building_type')}</div>
        <select value={buildingType} onChange={e => setBuildingType(e.target.value)} style={selectStyle}>{btypes.map(bt => <option key={bt.v} value={bt.v}>{bt.l}</option>)}</select>
      </div>

      <div>
        <div style={sectionLabel}>📅 {t('filter.year')}</div>
        <select value={dataYear ?? ''} onChange={e => setDataYear(e.target.value ? Number(e.target.value) : undefined)} style={selectStyle}>
          <option value="">{t('filter.year_all')}</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <button onClick={() => onQuery({ region_id: selectedRegion?.id, category: category || undefined, building_type: buildingType || undefined, data_year: dataYear })}
        style={{ width: '100%', padding: '10px 0', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: 'linear-gradient(135deg, var(--accent), #c4862a)', color: '#1a1a1a', marginTop: 4, transition: 'opacity 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }} onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
      >{t('filter.query_btn')}</button>
    </div>
  );
}
