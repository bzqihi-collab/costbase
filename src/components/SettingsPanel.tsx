import React, { useState, useEffect, useCallback } from 'react';
import { useT } from '../i18n/LanguageContext';
import type { DataSource } from '../../shared/types';

const card: React.CSSProperties = { padding: 20, borderRadius: 'var(--radius)', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 24 };
const h3: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14, textTransform: 'uppercase' as const, letterSpacing: 1 };
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const label: React.CSSProperties = { fontSize: 13.5, color: 'var(--text)' };
const selectS: React.CSSProperties = { padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13 };

export default function SettingsPanel() {
  const { t } = useT();
  const [sources, setSources] = useState<DataSource[]>([]);
  const [message, setMessage] = useState('');
  const [autoSync, setAutoSync] = useState({ enabled: false, intervalDays: 10, nextSync: null as string | null });

  useEffect(() => {
    window.electronAPI.invoke('sources:all').then((d: unknown) => setSources(d as DataSource[]));
    window.electronAPI.invoke('settings:auto-sync:get').then((d: unknown) => {
      if (d) setAutoSync(d as typeof autoSync);
    });
  }, []);

  const handleAutoSyncToggle = useCallback(async (enabled: boolean) => {
    const next = { ...autoSync, enabled };
    setAutoSync(next);
    const result = await window.electronAPI.invoke('settings:auto-sync:set', next) as typeof autoSync;
    if (result) setAutoSync(result);
  }, [autoSync]);

  const handleIntervalChange = useCallback(async (days: number) => {
    const next = { ...autoSync, intervalDays: days };
    setAutoSync(next);
    const result = await window.electronAPI.invoke('settings:auto-sync:set', next) as typeof autoSync;
    if (result) setAutoSync(result);
  }, [autoSync]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportCSV = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(t('settings.importing'));
    try {
      const text = await file.text();
      const result = await window.electronAPI.invoke('csv:import', text) as { inserted: number; errors: string[] };
      if (result.errors?.length) {
        setMessage(`${t('settings.import_done')} Inserted ${result.inserted} rows. Errors: ${result.errors.slice(0, 3).join('; ')}`);
      } else {
        setMessage(`${t('settings.import_done')} (${result.inserted} rows)`);
      }
    } catch (e: any) { setMessage(`${t('settings.import_fail')}: ${e.message}`); }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [t]);

  return (
    <div style={{ padding: 28, height: '100%', overflow: 'auto', background: 'var(--bg-root)' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>{t('settings.title')}</h2>

      {/* Auto Sync */}
      <div style={card}>
        <h3 style={h3}>⏱ Auto Sync</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
          <div style={row}>
            <span style={label}>Enable auto sync</span>
            <input type="checkbox" checked={autoSync.enabled}
              onChange={e => handleAutoSyncToggle(e.target.checked)} />
          </div>
          <div style={row}>
            <span style={label}>Sync interval</span>
            <select value={autoSync.intervalDays} onChange={e => handleIntervalChange(Number(e.target.value))}
              disabled={!autoSync.enabled} style={{ ...selectS, opacity: autoSync.enabled ? 1 : 0.4 }}>
              {[1, 3, 5, 7, 10, 15, 30].map(d => (
                <option key={d} value={d}>Every {d} day{d > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
          {autoSync.enabled && autoSync.nextSync && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Next auto sync: {new Date(autoSync.nextSync).toLocaleString()}
            </div>
          )}
          {autoSync.enabled && (
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              The app will automatically sync all enabled data sources on the configured interval.
              Sync runs when the app is open. If the interval has passed while the app was closed,
              sync will run on next launch.
            </p>
          )}
        </div>
      </div>

      {/* CSV Import */}
      <div style={card}>
        <h3 style={h3}>{t('settings.csv')}</h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.7 }}>{t('settings.csv_desc')}</p>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
        <button onClick={handleImportCSV}
          style={{ padding: '8px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent)', background: 'var(--accent-bg)', color: 'var(--accent-light)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
          {t('settings.csv_btn')}
        </button>
        {message && <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>{message}</p>}
      </div>

      {/* Preferences */}
      <div style={card}>
        <h3 style={h3}>{t('settings.preferences')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
          <div style={row}>
            <span style={label}>{t('settings.currency')}</span>
            <select style={selectS}>
              <option>{t('settings.currency_original')}</option><option>EUR</option><option>USD</option><option>CNY</option>
            </select>
          </div>
          <div style={row}>
            <span style={label}>{t('settings.storage')}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%APPDATA%/costbase.db</span>
          </div>
        </div>
      </div>

      {/* Sources */}
      <div style={card}>
        <h3 style={h3}>{t('settings.sources')}</h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>{t('settings.sources_desc')}{sources.length}{t('settings.sources_suffix')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sources.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-hover)', fontSize: 12.5 }}>
              <span style={{ fontWeight: 500, color: 'var(--text)' }}>{s.name}</span>
              <span style={{ color: 'var(--text-muted)' }}>({s.country})</span>
              <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 11 }}>{s.access_type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
