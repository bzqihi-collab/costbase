import React, { useEffect, useState } from 'react';
import SyncLogTable from './SyncLogTable';
import { useT } from '../i18n/LanguageContext';
import type { DataSource, SyncLog } from '../../shared/types';

export default function SyncManager() {
  const { t } = useT();
  const [sources, setSources] = useState<DataSource[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = () => setTick(t => t + 1);

  useEffect(() => {
    window.electronAPI.invoke('sources:all')
      .then((d: unknown) => { console.log('sources:all result:', d); setSources((d as DataSource[]) || []); })
      .catch((e: any) => console.error('sources:all error:', e));
    window.electronAPI.invoke('sync-log:list')
      .then((d: unknown) => { console.log('sync-log:list result:', d); setLogs((d as SyncLog[]) || []); })
      .catch((e: any) => console.error('sync-log:list error:', e));
  }, [tick]);

  const doSync = async (sourceId: number) => {
    if (syncing !== null) return;
    setSyncing(sourceId);
    try {
      await window.electronAPI.invoke('sync:run', sourceId);
      refresh();
    } catch (e: any) {
      console.error('Sync error:', e);
    }
    setSyncing(null);
  };

  const doToggle = async (id: number, active: boolean) => {
    await window.electronAPI.invoke('sources:toggle', id, active);
    refresh();
  };

  const syncAll = async () => {
    if (syncing !== null) return;
    const active = sources.filter(s => s.is_active === 1);
    if (active.length === 0) return;
    for (const s of active) {
      setSyncing(s.id);
      try { await window.electronAPI.invoke('sync:run', s.id); } catch (e: any) { console.error(e); }
    }
    setSyncing(null);
    refresh();
  };

  if (sources.length === 0) {
    return (
      <div style={{ padding: 28, height: '100%', overflow: 'auto', background: 'var(--bg-root)', color: 'var(--text-muted)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>{t('sync.title')}</h2>
        <p>Loading data sources...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 28, height: '100%', overflow: 'auto', background: 'var(--bg-root)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{t('sync.title')}</h2>
        <button
          onClick={syncAll}
          disabled={syncing !== null}
          style={{
            padding: '9px 22px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: syncing !== null ? 'default' : 'pointer',
            fontSize: 13.5, fontWeight: 600, background: syncing !== null ? 'var(--bg-card)' : 'var(--accent)',
            color: syncing !== null ? 'var(--text-muted)' : '#1a1a1a', opacity: syncing !== null ? 0.5 : 1,
          }}
        >
          {syncing !== null ? '⏳ Syncing...' : '🔄 Sync All'}
        </button>
      </div>

      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>{t('sync.sources')}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {sources.map(source => {
          const busy = syncing === source.id;
          return (
            <div key={source.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: source.is_active ? 'var(--green)' : 'var(--text-muted)' }} />
                  <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{source.name}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>{source.country}</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                  {source.sync_frequency} · {t('sync.last')}: {source.last_sync_at ? new Date(source.last_sync_at).toLocaleString('zh-CN') : t('sync.never')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={source.is_active === 1} onChange={e => doToggle(source.id, e.target.checked)} />
                  {t('sync.enable')}
                </label>
                <span
                  onClick={() => { if (!busy) doSync(source.id); }}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: busy ? '1px solid var(--border)' : '1px solid var(--accent)',
                    cursor: busy ? 'default' : 'pointer',
                    fontSize: 12.5,
                    fontWeight: 600,
                    background: busy ? 'transparent' : 'var(--accent)',
                    color: busy ? 'var(--text-muted)' : '#1a1a1a',
                    opacity: busy ? 0.5 : 1,
                    userSelect: 'none',
                    display: 'inline-block',
                  }}
                >
                  {busy ? t('sync.syncing') : t('sync.sync_now')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>{t('sync.log')}</h3>
      <SyncLogTable logs={logs} />
    </div>
  );
}
