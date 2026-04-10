export interface CsvColumn<T> {
  key: string;
  header: string;
  format?: (row: T) => string;
}

export function exportToCsv<T>(rows: T[], columns: CsvColumn<T>[], filename: string) {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const separator = ',';

  const header = columns.map(c => escapeCsvField(c.header)).join(separator);

  const body = rows.map(row =>
    columns.map(col => {
      const value = col.format
        ? col.format(row)
        : getNestedValue(row, col.key);
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

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}
