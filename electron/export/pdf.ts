import { jsPDF } from 'jspdf';
import { dialog } from 'electron';
import { writeFileSync } from 'fs';
import type { CostItem } from '../../shared/types';

// Note: jsPDF autoTable is a plugin. We use a simple approach without the plugin.
// For full table support, you'd add 'jspdf-autotable' dependency.
export async function exportPDF(items: CostItem[], title: string): Promise<void> {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: `cost-report-${Date.now()}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (!filePath) return;

  const doc = new jsPDF({ orientation: 'landscape' });

  // Title
  doc.setFontSize(14);
  doc.text(title, 14, 20);
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text(`Export time: ${new Date().toLocaleString('zh-CN')}`, 14, 28);

  // Simple table rendering
  const startY = 38;
  const rowHeight = 8;
  const colWidths = [30, 28, 28, 18, 26, 26, 26, 40];
  const headers = ['Subcategory', 'Spec', 'Detail', 'Unit', 'Price', 'Min', 'Max', 'Source'];

  // Draw headers
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(59, 130, 246);
  let x = 14;
  for (let i = 0; i < headers.length; i++) {
    doc.rect(x, startY, colWidths[i], rowHeight, 'F');
    doc.text(headers[i], x + 2, startY + 5);
    x += colWidths[i];
  }

  // Draw rows
  doc.setTextColor(0, 0, 0);
  for (let r = 0; r < items.length; r++) {
    const y = startY + (r + 1) * rowHeight;
    if (y > 190) {
      doc.addPage();
      // Re-draw would go here in production
    }
    const item = items[r];
    const rowData = [
      item.subcategory, item.spec_code || '', item.spec_detail || '', item.unit,
      String(item.unit_price ?? '-'), String(item.price_min ?? '-'), String(item.price_max ?? '-'),
      (item as any).source_name || '',
    ];
    x = 14;
    for (let i = 0; i < rowData.length; i++) {
      if (r % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(x, y, colWidths[i], rowHeight, 'F');
      }
      doc.text(rowData[i], x + 2, y + 5);
      x += colWidths[i];
    }
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  writeFileSync(filePath, pdfBuffer);
}
