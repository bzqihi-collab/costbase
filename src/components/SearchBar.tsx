import React, { useState, useCallback } from 'react';

interface Props {
  onSearch: (keyword: string) => void;
}

export default function SearchBar({ onSearch }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  }, [value, onSearch]);

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="全文搜索 — 规格型号、材料名称、备注..."
        className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-4 pr-12 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
      >
        搜索
      </button>
    </form>
  );
}
