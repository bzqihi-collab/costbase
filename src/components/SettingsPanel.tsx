import React, { useState, useEffect, useCallback } from 'react';
import type { DataSource } from '../../shared/types';

export default function SettingsPanel() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    window.electronAPI.invoke('sources:all').then((data: unknown) => setSources(data as DataSource[]));
  }, []);

  const handleImportCSV = useCallback(async () => {
    setMessage('正在导入 CSV...');
    try {
      // Find a manual_import source or use the first available
      const manualSource = sources.find(s => s.access_type === 'manual_import');
      if (!manualSource) {
        setMessage('没有可用的手动导入数据源。请先在数据源管理中创建一个。');
        return;
      }
      await window.electronAPI.invoke('sync:run', manualSource.id);
      setMessage('导入完成！');
    } catch (e: any) {
      setMessage(`导入失败: ${e.message}`);
    }
  }, [sources]);

  return (
    <div className="h-full overflow-auto p-6">
      <h2 className="mb-6 text-xl font-bold text-gray-200">设置</h2>

      <div className="mb-8">
        <h3 className="mb-3 text-sm font-semibold text-gray-400">CSV 手动导入</h3>
        <p className="mb-4 text-xs text-gray-500">
          导入 CSV 格式的建筑费用数据。文件需包含列: region_id, category, subcategory, unit, data_year, unit_price
          (可选: spec_code, spec_detail, price_min, price_max, building_type, data_quarter, notes)
        </p>
        <button
          onClick={handleImportCSV}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          📂 选择 CSV 文件并导入
        </button>
        {message && <p className="mt-2 text-xs text-gray-400">{message}</p>}
      </div>

      <div className="mb-8">
        <h3 className="mb-3 text-sm font-semibold text-gray-400">偏好设置</h3>
        <div className="grid gap-4 max-w-md">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">默认显示币种</label>
            <select className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200">
              <option>原始币种</option>
              <option>EUR</option>
              <option>USD</option>
              <option>CNY</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">启动时自动检查更新</label>
            <input type="checkbox" defaultChecked className="rounded" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">数据存储位置</label>
            <span className="text-xs text-gray-500">%APPDATA%/costbase.db</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-400">数据源配置</h3>
        <p className="text-xs text-gray-500">
          在此添加或修改外部数据源。当前已注册 {sources.length} 个数据源。每个数据源需要一个独立的适配器模块。
        </p>
        <div className="mt-3 grid gap-2">
          {sources.map(s => (
            <div key={s.id} className="flex items-center gap-2 rounded bg-gray-900 px-3 py-2 text-xs text-gray-400">
              <span className="font-medium text-gray-300">{s.name}</span>
              <span className="text-gray-600">({s.country})</span>
              <span className="ml-auto text-gray-500">{s.access_type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
