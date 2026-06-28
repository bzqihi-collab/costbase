import React, { useEffect, useState } from 'react';
import type { DataSource } from '../../shared/types';

export default function StatusBar() {
  const [lastUpdate, setLastUpdate] = useState('数据更新: --');
  const [sourceInfo, setSourceInfo] = useState('来源: --');
  const [nextSync, setNextSync] = useState('下次同步: --');

  useEffect(() => {
    window.electronAPI.invoke('sources:all').then((data: unknown) => {
      const sources = data as DataSource[];
      const syncedSources = sources.filter(s => s.last_sync_at);
      if (syncedSources.length > 0) {
        const latest = syncedSources.sort((a, b) =>
          new Date(b.last_sync_at!).getTime() - new Date(a.last_sync_at!).getTime()
        )[0];
        setLastUpdate(`数据更新: ${new Date(latest.last_sync_at!).toLocaleDateString('zh-CN')}`);
      }
      const activeSources = sources.filter(s => s.is_active === 1);
      if (activeSources.length > 0) {
        setSourceInfo(`来源: ${activeSources.map(s => s.name.split(' ')[0]).join(', ')}`);
      }
    });
  }, []);

  return (
    <footer className="flex items-center justify-between border-t border-gray-800 bg-gray-900 px-4 py-1.5 text-xs text-gray-500">
      <span>{lastUpdate} | {sourceInfo}</span>
      <span>{nextSync}</span>
    </footer>
  );
}
