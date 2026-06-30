import React from 'react';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';

type Page = 'query' | 'compare' | 'sync' | 'settings';

export default function Layout({ children, activePage, onNavigate }: {
  children: React.ReactNode;
  activePage: Page;
  onNavigate: (page: Page) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-root)' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar activePage={activePage} onNavigate={onNavigate} />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg-root)' }}>
          {children}
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
