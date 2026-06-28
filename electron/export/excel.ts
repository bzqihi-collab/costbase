import ExcelJS from 'exceljs';
import { dialog } from 'electron';
import type { CostItem } from '../../shared/types';

export async function exportExcel(items: CostItem[], title: string): Promise<void> {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: `cost-report-${Date.now()}.xlsx`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });

  if (!filePath) return;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('费用数据');

  // Title
  sheet.mergeCells('A1:H1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center' };

  // Timestamp
  sheet.mergeCells('A2:H2');
  sheet.getCell('A2').value = `导出时间: ${new Date().toLocaleString('zh-CN')}`;
  sheet.getCell('A2').font = { size: 10, color: { argb: '888888' } };

  // Headers
  const headers = ['子类别', '规格型号', '规格补充', '单位', '单价', '最低价', '最高价', '数据来源'];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E5E7EB' } };
  });

  // Data
  for (const item of items) {
    sheet.addRow([
      item.subcategory, item.spec_code || '', item.spec_detail || '', item.unit,
      item.unit_price, item.price_min, item.price_max,
      (item as any).source_name || '',
    ]);
  }

  // Column widths
  const widths = [12, 14, 14, 8, 12, 12, 12, 20];
  sheet.columns?.forEach((col, i) => { col.width = widths[i] || 12; });

  await workbook.xlsx.writeFile(filePath);
}
