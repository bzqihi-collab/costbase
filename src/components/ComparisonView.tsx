import React, { useState, useCallback } from 'react';
import RegionTree from './RegionTree';
import type { Region } from '../../shared/types';

export default function ComparisonView() {
  const [selectedRegions, setSelectedRegions] = useState<Region[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectRegion = useCallback((region: Region) => {
    setSelectedRegions((prev) => {
      const exists = prev.find((r) => r.id === region.id);
      if (exists) return prev.filter((r) => r.id !== region.id);
      if (prev.length >= 3) return prev;
      return [...prev, region];
    });
  }, []);

  const handleCompare = useCallback(async () => {
    if (selectedRegions.length < 2) return;
    setLoading(true);
    const ids = selectedRegions.map((r) => r.id);
    const data = await window.electronAPI.invoke('cost-items:compare', ids, category || undefined);
    setComparisonData(data || []);
    setLoading(false);
  }, [selectedRegions, category]);

  // Build a list of unique (subcategory, spec_code, unit) keys across all data
  const groupedRows = new Map<string, any>();
  for (const row of comparisonData) {
    const key = `${row.subcategory}|${row.spec_code}|${row.unit}`;
    if (!groupedRows.has(key)) {
      groupedRows.set(key, { subcategory: row.subcategory, spec_code: row.spec_code, unit: row.unit, prices: {} as Record<string, any> });
    }
    groupedRows.get(key)!.prices[row.region_name] = {
      unit_price: row.unit_price,
      price_min: row.price_min,
      price_max: row.price_max,
      currency: row.currency,
    };
  }
  const rows = Array.from(groupedRows.values());

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-gray-800 p-4 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-gray-300">选择地区对比 (2-3)</h3>
        <RegionTree onSelect={handleSelectRegion} />
        <div>
          <h4 className="mb-2 text-xs font-semibold text-gray-500">已选地区</h4>
          {selectedRegions.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded bg-gray-800 px-2 py-1 text-xs text-gray-300 mb-1">
              <span>{r.name}</span>
              <button onClick={() => handleSelectRegion(r)} className="text-red-400 hover:text-red-300">✕</button>
            </div>
          ))}
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200"
        >
          <option value="">全部类别</option>
          <option value="material">建筑材料</option>
          <option value="labor">人工费</option>
          <option value="equipment">设备租赁</option>
          <option value="transport">运输费</option>
        </select>
        <button
          onClick={handleCompare}
          disabled={selectedRegions.length < 2}
          className="w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          📊 开始对比
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading && <p className="text-center text-gray-500">加载中...</p>}
        {!loading && rows.length === 0 && (
          <p className="text-center text-gray-500">请选择 2-3 个地区后点击"开始对比"</p>
        )}
        {rows.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-3 py-2 text-left text-xs text-gray-500">材料/规格</th>
                <th className="px-3 py-2 text-left text-xs text-gray-500">单位</th>
                {selectedRegions.map((r) => (
                  <th key={r.id} className="px-3 py-2 text-right text-xs text-gray-500">{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, i: number) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="px-3 py-2">
                    <span className="font-medium text-gray-200">{row.subcategory}</span>
                    <span className="ml-2 text-xs text-blue-400">{row.spec_code}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-400">{row.unit}</td>
                  {selectedRegions.map((r) => {
                    const p = row.prices[r.name];
                    return (
                      <td key={r.id} className="px-3 py-2 text-right">
                        {p ? (
                          <div>
                            <span className="text-gray-200 font-medium">{p.unit_price?.toLocaleString() || '—'}</span>
                            <span className="ml-1 text-xs text-gray-500">{p.currency}</span>
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                    );
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
