import React from 'react';
import type { CostItem, QueryResult } from '../../shared/types';

const COLUMNS = [
  { key: 'subcategory', label: '子类别', width: 'min-w-20' },
  { key: 'spec_code', label: '规格型号', width: 'min-w-20' },
  { key: 'spec_detail', label: '规格补充', width: 'min-w-24' },
  { key: 'unit', label: '单位', width: 'min-w-14' },
  { key: 'unit_price', label: '单价', width: 'min-w-24', align: 'right' as const },
  { key: 'price_min', label: '最低价', width: 'min-w-24', align: 'right' as const },
  { key: 'price_max', label: '最高价', width: 'min-w-24', align: 'right' as const },
  { key: 'source_name', label: '数据来源', width: 'min-w-28' },
];

function formatPrice(val: number | null): string {
  if (val === null || val === undefined) return '—';
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  result: QueryResult<CostItem> | null;
  loading: boolean;
}

export default function CostTable({ result, loading }: Props) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  if (!result || result.data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">请选择筛选条件后点击查询</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-900">
          <tr className="border-b border-gray-700">
            {COLUMNS.map((col) => (
              <th key={col.key} className={`${col.width} px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(result.data as any[]).map((item) => (
            <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
              <td className="px-3 py-2 font-medium text-gray-200">{item.subcategory}</td>
              <td className="px-3 py-2 text-blue-400 font-mono">{item.spec_code || '—'}</td>
              <td className="px-3 py-2 text-gray-400">{item.spec_detail || '—'}</td>
              <td className="px-3 py-2 text-gray-400">{item.unit}</td>
              <td className="px-3 py-2 text-right font-semibold text-gray-100">{formatPrice(item.unit_price)}</td>
              <td className="px-3 py-2 text-right text-gray-400">{formatPrice(item.price_min)}</td>
              <td className="px-3 py-2 text-right text-gray-400">{formatPrice(item.price_max)}</td>
              <td className="px-3 py-2 text-xs text-gray-500" title={item.source_name || ''}>
                {item.source_name || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-3 text-xs text-gray-600">
        共 {result.total} 条记录 | 第 {result.page} 页
      </div>
    </div>
  );
}
