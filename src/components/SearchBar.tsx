import React, { useState, useCallback } from 'react';
import { useT } from '../i18n/LanguageContext';

export default function SearchBar({ onSearch }: { onSearch: (keyword: string) => void }) {
  const { t } = useT();
  const [value, setValue] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  }, [value, onSearch]);

  return (
    <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
      <svg style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>
      </svg>
      <input
        type="text" value={value} onChange={e => setValue(e.target.value)}
        placeholder={t('query.search')}
        style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13.5, outline: 'none', transition: 'border-color 0.15s' }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
      />
    </form>
  );
}
