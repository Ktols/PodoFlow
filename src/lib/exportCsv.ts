import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface CsvColumn<T> {
  key: string;
  header: string;
  format?: (row: T) => string;
}

export function exportToCsv<T>(rows: T[], columns: CsvColumn<T>[], filename: string) {
  const BOM = '\uFEFF';
  const separator = ',';
  const header = columns.map(c => escapeCsvField(c.header)).join(separator);
  const body = rows.map(row =>
    columns.map(col => {
      const value = col.format ? col.format(row) : getNestedValue(row as Record<string, unknown>, col.key);
      return escapeCsvField(String(value ?? ''));
    }).join(separator)
  );
  const csv = BOM + [header, ...body].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], obj);
}

export async function exportToExcel<T>(rows: T[], columns: CsvColumn<T>[], filename: string, title?: string) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte');

  let rowIndex = 1;

  // Título (Opcional)
  if (title) {
    worksheet.mergeCells(`A${rowIndex}:${String.fromCharCode(65 + columns.length - 1)}${rowIndex}`);
    const titleCell = worksheet.getCell(`A${rowIndex}`);
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF004975' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(rowIndex).height = 30;
    rowIndex += 2;
  }

  // Headers
  const headerRow = worksheet.getRow(rowIndex);
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF004975' } // Brand color: #004975
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
    };
  });
  headerRow.height = 25;
  rowIndex++;

  // Data Rows
  rows.forEach((row, rowNum) => {
    const dataRow = worksheet.getRow(rowIndex);
    columns.forEach((col, idx) => {
      const cell = dataRow.getCell(idx + 1);
      const value = col.format ? col.format(row) : getNestedValue(row as Record<string, unknown>, col.key);
      cell.value = value !== null && value !== undefined ? String(value) : '';
      
      cell.font = { name: 'Arial', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      
      // Color de fondo alterno
      if (rowNum % 2 !== 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' } // bg-gray-50
        };
      }
      
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        right: { style: 'thin', color: { argb: 'FFEEEEEE' } }
      };
    });
    dataRow.height = 20;
    rowIndex++;
  });

  // Autoajustar ancho de columnas
  worksheet.columns.forEach((column) => {
    if (!column) return;
    let maxLength = 0;
    if (column.eachCell) {
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
    }
    // Añadir un poco de padding
    column.width = Math.min(maxLength + 2, 50);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
}
