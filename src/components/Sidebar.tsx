import React from 'react';

const NAV_ITEMS = [
  { id: 'query' as const, icon: '📋', label: '费用查询' },
  { id: 'compare' as const, icon: '📊', label: '地区对比' },
  { id: 'sync' as const, icon: '🔄', label: '数据同步' },
  { id: 'settings' as const, icon: '⚙️', label: '设置' },
];

export default function Sidebar({ activePage, onNavigate }: {
  activePage: string;
  onNavigate: (page: string) => void;
}) {
  return (
    <aside className="flex w-52 flex-col border-r border-gray-800 bg-gray-900 p-3">
      <div className="mb-6 px-2 py-1 text-lg font-bold text-blue-400">🏗️ CostBase</div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              activePage === item.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="mt-auto pt-4 text-xs text-gray-600">
        <p>CostBase v1.0.0</p>
      </div>
    </aside>
  );
}
