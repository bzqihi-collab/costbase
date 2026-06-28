import React, { useEffect, useState } from 'react';
import type { Region } from '../../shared/types';

interface Props {
  onSelect: (region: Region) => void;
  selectedId?: number;
}

export default function RegionTree({ onSelect, selectedId }: Props) {
  const [tree, setTree] = useState<Region[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    window.electronAPI.invoke('regions:tree').then((data) => setTree(data as Region[]));
  }, []);

  // Build parent -> children map
  const childrenMap = new Map<number | null, Region[]>();
  for (const r of tree) {
    const key = r.parent_id;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(r);
  }

  // Filter by search
  const filtered = search
    ? tree.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : childrenMap.get(null) || [];

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (region: Region, depth: number = 0) => {
    const children = childrenMap.get(region.id) || [];
    const isExpanded = expanded.has(region.id);
    const isSelected = region.id === selectedId;

    return (
      <div key={region.id}>
        <button
          onClick={() => {
            onSelect(region);
            if (children.length > 0) toggleExpand(region.id);
          }}
          className={`flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm transition-colors ${
            isSelected ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {children.length > 0 && (
            <span className="text-xs w-3">{isExpanded ? '▾' : '▸'}</span>
          )}
          {children.length === 0 && <span className="w-3" />}
          <span className="text-xs opacity-50 w-8 text-right">
            {region.level === 'country' ? '🌐' : region.level === 'state' ? '🏛' : '📍'}
          </span>
          <span className="truncate">{region.name}</span>
        </button>
        {isExpanded && children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        placeholder="搜索国家/城市..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />
      <div className="max-h-64 overflow-y-auto">
        {search
          ? filtered.map((r) => renderNode(r, 0))
          : (childrenMap.get(null) || []).map((r) => renderNode(r, 0))
        }
      </div>
    </div>
  );
}
