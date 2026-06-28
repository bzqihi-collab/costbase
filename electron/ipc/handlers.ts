import { ipcMain } from 'electron';
import { getRegionTree, getRegionPath, searchRegions } from '../db/queries/regions';
import { queryCostItems, searchCostItems, getDistinctYears, getComparisonData, updateCostItemPrice } from '../db/queries/cost-items';
import { getAllSources, getActiveSources, toggleSource, updateSourceLastSync } from '../db/queries/sources';
import { getSyncLogs, createSyncLog, finalizeSyncLog } from '../db/queries/sync-log';
import { exportExcel } from '../export/excel';
import { exportPDF } from '../export/pdf';
import { runSync } from '../sync/pipeline';
import { getAdapter } from '../adapters/index';

export function registerHandlers(): void {
  // 地区
  ipcMain.handle('regions:tree', () => getRegionTree());
  ipcMain.handle('regions:path', (_e, id: number) => getRegionPath(id));
  ipcMain.handle('regions:search', (_e, keyword: string) => searchRegions(keyword));

  // 费用条目
  ipcMain.handle('cost-items:query', (_e, filter: any) => queryCostItems(filter));
  ipcMain.handle('cost-items:search', (_e, keyword: string) => searchCostItems(keyword));
  ipcMain.handle('cost-items:years', () => getDistinctYears());
  ipcMain.handle('cost-items:compare', (_e, regionIds: number[], category?: string, year?: number) =>
    getComparisonData(regionIds, category, year)
  );
  ipcMain.handle('cost-items:update-price', (_e, id: number, unitPrice: number, priceMin: number, priceMax: number) =>
    updateCostItemPrice(id, unitPrice, priceMin, priceMax)
  );

  // 数据源
  ipcMain.handle('sources:all', () => getAllSources());
  ipcMain.handle('sources:active', () => getActiveSources());
  ipcMain.handle('sources:toggle', (_e, id: number, active: boolean) => toggleSource(id, active));

  // 同步日志
  ipcMain.handle('sync-log:list', (_e, sourceId?: number) => getSyncLogs(sourceId));

  // 手动同步触发
  ipcMain.handle('sync:run', async (_e, sourceId: number) => {
    const sources = getAllSources();
    const source = sources.find(s => s.id === sourceId);
    if (!source) throw new Error(`Source ${sourceId} not found`);

    const adapter = getAdapter(source.name);
    if (!adapter) {
      throw new Error(`No adapter registered for source: ${source.name}`);
    }

    return await runSync(adapter);
  });

  // 导出
  ipcMain.handle('export:excel', async (_e, items: any[], title: string) => {
    await exportExcel(items, title);
    return true;
  });
  ipcMain.handle('export:pdf', async (_e, items: any[], title: string) => {
    await exportPDF(items, title);
    return true;
  });
}
