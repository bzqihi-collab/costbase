import React from 'react';

export default function StatusBar() {
  return (
    <footer className="flex items-center justify-between border-t border-gray-800 bg-gray-900 px-4 py-1.5 text-xs text-gray-500">
      <span>数据更新: -- | 来源: --</span>
      <span>下次同步: --</span>
    </footer>
  );
}
