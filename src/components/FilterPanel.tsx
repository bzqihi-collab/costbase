import React, { useEffect, useState } from 'react';
import RegionTree from './RegionTree';
import type { Region, CostItemFilter } from '../../shared/types';

const CATEGORIES = [
  { value: '', label: '全部类别' },
  { value: 'material', label: '建筑材料' },
  { value: 'labor', label: '人工费' },
  { value: 'equipment', label: '设备租赁' },
  { value: 'transport', label: '运输费' },
];

const BUILDING_TYPES = [
  { value: '', label: '全部类型' },
  { value: 'residential', label: '住宅' },
  { value: 'commercial', label: '商业' },
  { value: 'industrial', label: '工业' },
  { value: 'infrastructure', label: '基础设施' },
];

interface Props {
  onQuery: (filter: CostItemFilter) => void;
  onSearch: (keyword: string) => void;
}

export default function FilterPanel({ onQuery, onSearch }: Props) {
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedPath, setSelectedPath] = useState<Region[]>([]);
  const [category, setCategory] = useState('');
  const [buildingType, setBuildingType] = useState('');
  const [dataYear, setDataYear] = useState<number | undefined>();
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    window.electronAPI.invoke('cost-items:years').then((data: unknown) => setYears(data as number[]));
  }, []);

  const handleRegionSelect = async (region: Region) => {
    setSelectedRegion(region);
    const path = await window.electronAPI.invoke('regions:path', region.id) as Region[];
    setSelectedPath(path);
  };

  const handleQuery = () => {
    onQuery({
      region_id: selectedRegion?.id,
      category: category || undefined,
      building_type: buildingType || undefined,
      data_year: dataYear,
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">地区</label>
        <RegionTree onSelect={handleRegionSelect} selectedId={selectedRegion?.id} />
        {selectedPath.length > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
            {selectedPath.map((r, i) => (
              <span key={r.id}>
                {i > 0 && <span className="mx-1 opacity-30">▸</span>}
                <span className={i === selectedPath.length - 1 ? 'font-semibold text-blue-400' : ''}>{r.name}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">费用类别</label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                category === c.value ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">建筑类型</label>
        <select
          value={buildingType}
          onChange={(e) => setBuildingType(e.target.value)}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
        >
          {BUILDING_TYPES.map((bt) => (
            <option key={bt.value} value={bt.value}>{bt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">数据年份</label>
        <select
          value={dataYear ?? ''}
          onChange={(e) => setDataYear(e.target.value ? Number(e.target.value) : undefined)}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="">全部年份</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <button
        onClick={handleQuery}
        className="mt-2 w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        🔍 查询
      </button>
    </div>
  );
}
