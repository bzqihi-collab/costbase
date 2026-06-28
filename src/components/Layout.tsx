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
    <div className="flex h-screen flex-col bg-gray-950 text-gray-100">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePage={activePage} onNavigate={onNavigate} />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
