import React from 'react';
import type { SyncLog } from '../../shared/types';

const STATUS_STYLES: Record<string, string> = {
  success: 'text-green-400',
  partial: 'text-yellow-400',
  failed: 'text-red-400',
};

export default function SyncLogTable({ logs }: { logs: SyncLog[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-gray-600">暂无同步记录</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left">
            <th className="px-3 py-2 text-xs text-gray-500">时间</th>
            <th className="px-3 py-2 text-xs text-gray-500">状态</th>
            <th className="px-3 py-2 text-xs text-gray-500 text-right">新增</th>
            <th className="px-3 py-2 text-xs text-gray-500 text-right">更新</th>
            <th className="px-3 py-2 text-xs text-gray-500 text-right">冲突</th>
            <th className="px-3 py-2 text-xs text-gray-500">错误信息</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-gray-800">
              <td className="px-3 py-2 text-gray-400">
                {log.started_at ? new Date(log.started_at).toLocaleString('zh-CN') : '-'}
              </td>
              <td className={`px-3 py-2 font-medium ${STATUS_STYLES[log.status] || ''}`}>
                {log.status === 'success' ? '成功' : log.status === 'partial' ? '部分成功' : '失败'}
              </td>
              <td className="px-3 py-2 text-right text-green-400">{log.new_records}</td>
              <td className="px-3 py-2 text-right text-blue-400">{log.updated_records}</td>
              <td className="px-3 py-2 text-right text-yellow-400">{log.conflicts}</td>
              <td className="px-3 py-2 text-xs text-red-400 max-w-xs truncate">{log.error_message || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
