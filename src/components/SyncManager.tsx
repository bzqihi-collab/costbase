import React, { useEffect, useState, useCallback } from 'react';
import SyncLogTable from './SyncLogTable';
import type { DataSource, SyncLog } from '../../shared/types';

export default function SyncManager() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [syncing, setSyncing] = useState<number | null>(null);

  useEffect(() => {
    window.electronAPI.invoke('sources:all').then((data: unknown) => setSources(data as DataSource[]));
    window.electronAPI.invoke('sync-log:list').then((data: unknown) => setLogs(data as SyncLog[]));
  }, []);

  const handleSync = useCallback(async (sourceId: number) => {
    setSyncing(sourceId);
    try {
      await window.electronAPI.invoke('sync:run', sourceId);
      setLogs(await window.electronAPI.invoke('sync-log:list') as SyncLog[]);
    } catch (e: any) {
      console.error('Sync failed:', e.message);
    }
    setSyncing(null);
  }, []);

  const handleToggle = useCallback(async (id: number, active: boolean) => {
    await window.electronAPI.invoke('sources:toggle', id, active);
    setSources(await window.electronAPI.invoke('sources:all') as DataSource[]);
  }, []);

  return (
    <div className="h-full overflow-auto p-6">
      <h2 className="mb-6 text-xl font-bold text-gray-200">数据同步管理</h2>

      <div className="mb-8">
        <h3 className="mb-3 text-sm font-semibold text-gray-400">数据源状态</h3>
        <div className="grid gap-3">
          {sources.map((source) => (
            <div key={source.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${source.is_active ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <h4 className="font-medium text-gray-200">{source.name}</h4>
                  <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-500">{source.country}</span>
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {source.sync_frequency} · 上次同步: {source.last_sync_at ? new Date(source.last_sync_at).toLocaleString('zh-CN') : '从未'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={source.is_active === 1}
                    onChange={(e) => handleToggle(source.id, e.target.checked)}
                    className="rounded"
                  />
                  启用
                </label>
                <button
                  onClick={() => handleSync(source.id)}
                  disabled={syncing === source.id || !source.is_active}
                  className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {syncing === source.id ? '同步中...' : '立即同步'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-400">同步日志</h3>
        <SyncLogTable logs={logs} />
      </div>
    </div>
  );
}
