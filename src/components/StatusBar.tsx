import React, { useEffect, useState } from 'react';
import type { DataSource } from '../../shared/types';
import { useT } from '../i18n/LanguageContext';

export default function StatusBar() {
  const { t } = useT();
  const [lastUpdate, setLastUpdate] = useState('—');
  const [sourceCount, setSourceCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [nextSync, setNextSync] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI.invoke('sources:all').then((d: unknown) => {
      const sources = d as DataSource[];
      setSourceCount(sources.length);
      setActiveCount(sources.filter(s => s.is_active === 1).length);
      const latest = sources.filter(s => s.last_sync_at).sort((a, b) =>
        new Date(b.last_sync_at!).getTime() - new Date(a.last_sync_at!).getTime()
      )[0];
      if (latest?.last_sync_at) setLastUpdate(new Date(latest.last_sync_at).toLocaleDateString('zh-CN'));
    });
    window.electronAPI.invoke('settings:auto-sync:get').then((d: unknown) => {
      if (d) {
        const cfg = d as { enabled: boolean; nextSync: string | null };
        if (cfg.enabled && cfg.nextSync) setNextSync(new Date(cfg.nextSync).toLocaleString());
      }
    });
  }, []);

  return (
    <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 18px', background: 'var(--bg-sidebar)', borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--text-muted)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <span>{t('status.sources')} <b style={{ color: 'var(--text-secondary)' }}>{sourceCount}</b></span>
        <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
        <span>{t('status.active')} <b style={{ color: 'var(--green)' }}>{activeCount}</b></span>
        <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
        <span>{t('status.updated')} <b style={{ color: 'var(--text-secondary)' }}>{lastUpdate}</b></span>
        {nextSync && (
          <>
            <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
            <span>Next sync <b style={{ color: 'var(--accent-light)' }}>{nextSync}</b></span>
          </>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
        {t('app.ready')}
      </div>
    </footer>
  );
}
