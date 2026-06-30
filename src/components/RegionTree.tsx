import React, { useEffect, useState } from 'react';
import { useT } from '../i18n/LanguageContext';
import type { Region } from '../../shared/types';

const iconMap: Record<string, string> = { country: '🌐', state: '🏛', city: '📍' };

export default function RegionTree({ onSelect, selectedId }: {
  onSelect: (region: Region) => void;
  selectedId?: number;
}) {
  const { t, tr } = useT();
  const [tree, setTree] = useState<Region[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    window.electronAPI.invoke('regions:tree').then(d => setTree(d as Region[]));
  }, []);

  const childMap = new Map<number | null, Region[]>();
  for (const r of tree) {
    const k = r.parent_id;
    if (!childMap.has(k)) childMap.set(k, []);
    childMap.get(k)!.push(r);
  }

  const filtered = search
    ? tree.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || tr(r.name).toLowerCase().includes(search.toLowerCase()))
    : childMap.get(null) || [];

  const toggle = (id: number) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const node = (r: Region, d = 0) => {
    const kids = childMap.get(r.id) || [];
    const open = expanded.has(r.id);
    const sel = r.id === selectedId;
    return (
      <div key={r.id}>
        <button
          onClick={() => { onSelect(r); if (kids.length) toggle(r.id); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%',
            padding: '6px 8px', paddingLeft: d * 16 + 8, borderRadius: 'var(--radius-sm)',
            border: 'none', cursor: 'pointer', fontSize: 13,
            background: sel ? 'var(--accent-bg)' : 'transparent',
            color: sel ? 'var(--accent-light)' : 'var(--text-secondary)',
            fontWeight: sel ? 600 : 400,
            textAlign: 'left' as const,
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={{ width: 14, fontSize: 11, textAlign: 'center', flexShrink: 0 }}>
            {kids.length ? (open ? '▾' : '▸') : ''}
          </span>
          <span style={{ fontSize: 12, flexShrink: 0 }}>{iconMap[r.level] || '📍'}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr(r.name)}</span>
        </button>
        {open && kids.map(k => node(k, d + 1))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input
        type="text" placeholder={t('filter.search_region')} value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          padding: '7px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)',
          border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12.5, outline: 'none',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
      />
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {search
          ? filtered.map(r => node(r, 0))
          : (childMap.get(null) || []).map(r => node(r, 0))}
      </div>
    </div>
  );
}
