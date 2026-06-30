import React from 'react';
import { useT } from '../i18n/LanguageContext';
import type { SyncLog } from '../../shared/types';

const statusColor: Record<string, string> = { success: 'var(--green)', partial: 'var(--yellow)', failed: 'var(--red)' };

export default function SyncLogTable({ logs }: { logs: SyncLog[] }) {
  const { t } = useT();
  if (logs.length === 0) return <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('sync.no_log')}</p>;

  const heads = [t('sync.time'), t('sync.status'), t('sync.new'), t('sync.updated'), t('sync.conflicts'), t('sync.error')];

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            {heads.map((h, i) => (
              <th key={i} style={{ padding: '9px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: i >= 2 ? 'right' : 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '9px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>{log.started_at ? new Date(log.started_at).toLocaleString('zh-CN') : '-'}</td>
              <td style={{ padding: '9px 12px', fontWeight: 600, color: statusColor[log.status] || 'var(--text-muted)' }}>
                {log.status === 'success' ? t('sync.success') : log.status === 'partial' ? t('sync.partial') : t('sync.failed')}
              </td>
              <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--green)', fontWeight: 500 }}>{log.new_records}</td>
              <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--blue)', fontWeight: 500 }}>{log.updated_records}</td>
              <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--yellow)', fontWeight: 500 }}>{log.conflicts}</td>
              <td style={{ padding: '9px 12px', color: 'var(--red)', fontSize: 11.5, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.error_message || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
