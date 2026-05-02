import { useState, useEffect, type ReactNode } from 'react';
import { X, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportToCsv, type CsvColumn } from '../lib/exportCsv';
import { toast } from 'react-hot-toast';

interface ExportModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  columns: CsvColumn<T>[];
  fetchData: () => Promise<T[]>;
  filename: string;
  children?: ReactNode; // Filter controls rendered by parent
  onFiltersChanged?: number; // Increment to trigger re-fetch
}

export function ExportModal<T>({ isOpen, onClose, title, columns, fetchData, filename, children, onFiltersChanged }: ExportModalProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasFetched(false);
      setData([]);
    }
  }, [isOpen]);

  const handlePreview = async () => {
    setIsLoading(true);
    try {
      const result = await fetchData();
      setData(result);
      setHasFetched(true);
    } catch (err) {
      console.error('Error fetching export data:', err);
      toast.error('Error al obtener los datos para exportar');
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch when filters change (if already previewed)
  useEffect(() => {
    if (hasFetched && isOpen) {
      handlePreview();
    }
  }, [onFiltersChanged]);

  const handleExport = async () => {
    let exportData = data;
    if (!hasFetched) {
      setIsLoading(true);
      try {
        exportData = await fetchData();
      } catch (err) {
        console.error('Error fetching export data:', err);
      toast.error('Error al obtener los datos para exportar');
        return;
      } finally {
        setIsLoading(false);
      }
    }
    if (exportData.length === 0) return;
    exportToCsv(exportData, columns, filename);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[20050] flex items-center justify-center p-4 animate-in fade-in">
      <div className="absolute inset-0 bg-[#004975]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00C288]/10 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-[#00C288]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#004975]">{title}</h3>
              <p className="text-xs font-bold text-gray-400">Exportar datos a CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        {children && (
          <div className="p-5 border-b border-gray-100 space-y-4">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Filtros</span>
            {children}
          </div>
        )}

        {/* Preview / Actions */}
        <div className="p-5 space-y-4">
          {!hasFetched ? (
            <button
              onClick={handlePreview}
              disabled={isLoading}
              className="w-full py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl font-bold text-[#004975] text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  Vista previa de registros
                </>
              )}
            </button>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-center">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-bold">Consultando...</span>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-black text-[#004975] tabular-nums">{data.length}</p>
                  <p className="text-xs font-bold text-gray-400 mt-1">registros encontrados</p>
                </>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-500 text-sm hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={isLoading}
              className="flex-1 py-3 bg-[#00C288] hover:bg-[#00ab78] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
