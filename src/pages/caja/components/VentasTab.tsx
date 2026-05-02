import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Search, Calendar, User, Eye, Download, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { VentaDrawer } from './VentaDrawer';
import { ExportModal } from '../../../components/ExportModal';
import { useAuthStore } from '../../../stores/authStore';
import type { CsvColumn } from '../../../lib/exportCsv';
import type { Venta } from '../../../types/entities';
import { DatePicker } from '../../../components/DatePicker';

export function VentasTab() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [ventaDetalle, setVentaDetalle] = useState<Venta | null>(null);

  // Filtros
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [fechaDesde, setFechaDesde] = useState(todayStr);
  const [fechaHasta, setFechaHasta] = useState(todayStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMetodo, setFilterMetodo] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);

  const { perfil } = useAuthStore();
  const isDueno = perfil?.rol_nombre === 'dueno';

  const isRangeToday = fechaDesde === todayStr && fechaHasta === todayStr;

  const fetchVentas = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('ventas')
      .select('*, pacientes (nombres, apellidos, numero_documento)')
      .gte('created_at', `${fechaDesde}T00:00:00`)
      .lte('created_at', `${fechaHasta}T23:59:59`)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error cargando ventas');
      console.error(error);
    } else {
      setVentas(data as unknown as Venta[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchVentas();
  }, [fechaDesde, fechaHasta]);

  const ventasFiltradas = ventas.filter(v => {
    if (filterMetodo && v.metodo_pago !== filterMetodo) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const pacNombre = v.pacientes ? `${v.pacientes.nombres} ${v.pacientes.apellidos}`.toLowerCase() : '';
      const itemNames = (v.items || []).map(i => i.nombre.toLowerCase()).join(' ');
      if (!pacNombre.includes(term) && !itemNames.includes(term)) return false;
    }
    return true;
  });

  const totalVentas = ventasFiltradas.reduce((sum, v) => sum + v.total, 0);
  const formatCurrency = (n: number) => `S/ ${n.toFixed(2)}`;
  const formatHora = (dateStr: string) => format(new Date(dateStr), 'hh:mm a');
  const formatFecha = (dateStr: string) => format(new Date(dateStr), "d MMM yyyy", { locale: es });

  const ventaCsvColumns: CsvColumn<Venta>[] = [
    { key: '', header: 'Fecha', format: (r) => formatFecha(r.created_at) },
    { key: '', header: 'Hora', format: (r) => formatHora(r.created_at) },
    { key: '', header: 'Paciente', format: (r) => r.pacientes ? `${r.pacientes.nombres} ${r.pacientes.apellidos}` : 'Venta directa' },
    { key: '', header: 'Productos', format: (r) => (r.items || []).map(i => `${i.nombre} x${i.cantidad}`).join(', ') },
    { key: '', header: 'Subtotal', format: (r) => `S/ ${r.subtotal.toFixed(2)}` },
    { key: '', header: 'Descuento', format: (r) => `S/ ${r.descuento.toFixed(2)}` },
    { key: '', header: 'Total', format: (r) => `S/ ${r.total.toFixed(2)}` },
    { key: 'metodo_pago', header: 'Método Pago' },
    { key: 'notas', header: 'Notas' },
  ];

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-4 md:p-5 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 p-1.5">
              <DatePicker value={fechaDesde} onChange={(v) => { setFechaDesde(v); if (v > fechaHasta) setFechaHasta(v); }} />
              <span className="text-xs font-bold text-gray-400">a</span>
              <DatePicker value={fechaHasta} onChange={(v) => { setFechaHasta(v); if (v < fechaDesde) setFechaDesde(v); }} />
            </div>
            {!isRangeToday && (
              <button onClick={() => { setFechaDesde(todayStr); setFechaHasta(todayStr); }}
                className="text-[11px] font-black text-[#00C288] uppercase tracking-wider bg-[#00C288]/10 hover:bg-[#00C288]/20 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Hoy
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isDueno && (
              <button onClick={() => setIsExportOpen(true)}
                className="bg-white hover:bg-gray-50 text-[#004975] px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm border border-gray-200 shadow-sm transition-colors">
                <Download className="w-4 h-4" /> Exportar
              </button>
            )}
            <button onClick={() => setIsDrawerOpen(true)}
              className="bg-[#00C288] hover:bg-[#00ab78] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-black tracking-wide shadow-md transition-all hover:-translate-y-0.5">
              <Plus className="w-5 h-5" /> NUEVA VENTA
            </button>
          </div>
        </div>

        {/* Search + method filter */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Buscar por paciente o producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#00C288] outline-none transition-all placeholder:text-gray-400" />
          </div>
          <select value={filterMetodo} onChange={(e) => setFilterMetodo(e.target.value)}
            className="md:w-52 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-[#00C288]">
            <option value="">Todos los métodos</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Yape">Yape</option>
            <option value="Plin">Plin</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Transferencia">Transferencia</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Ventas</span>
          <p className="text-2xl font-black text-[#004975] tabular-nums mt-1">{ventasFiltradas.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Productos Vendidos</span>
          <p className="text-2xl font-black text-[#004975] tabular-nums mt-1">{ventasFiltradas.reduce((sum, v) => sum + (v.items || []).reduce((s, i) => s + i.cantidad, 0), 0)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Total Recaudado</span>
          <p className="text-2xl font-black text-[#00C288] tabular-nums mt-1">{formatCurrency(totalVentas)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#00C288] rounded-full animate-spin" />
          </div>
        ) : ventasFiltradas.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="w-16 h-16 text-gray-200 mx-auto mb-5" />
            <h3 className="text-lg font-black text-[#004975] mb-2">Sin ventas en el período</h3>
            <p className="text-gray-400 font-bold text-sm max-w-sm mx-auto">
              {searchTerm || filterMetodo ? 'Ninguna venta coincide con los filtros.' : 'Registra tu primera venta con el botón verde.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Fecha</th>
                  <th className="text-left px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Paciente</th>
                  <th className="text-left px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Productos</th>
                  <th className="text-center px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Método</th>
                  <th className="text-right px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Total</th>
                  <th className="text-center px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] w-20">Ver</th>
                </tr>
              </thead>
              <tbody>
                {ventasFiltradas.map((venta, index) => (
                  <tr key={venta.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors group ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#004975] text-sm">{formatFecha(venta.created_at)}</p>
                      <p className="text-[11px] font-bold text-gray-400">{formatHora(venta.created_at)}</p>
                    </td>
                    <td className="px-6 py-4">
                      {venta.pacientes ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-[#004975]/5 rounded-full flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-[#004975]" />
                          </div>
                          <p className="font-bold text-[#004975] text-sm truncate">{venta.pacientes.nombres} {venta.pacientes.apellidos}</p>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-gray-400">Venta directa</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(venta.items || []).slice(0, 2).map((item, i) => (
                          <span key={i} className="bg-[#00C288]/10 text-[#004975] border border-[#00C288]/20 px-2 py-0.5 rounded text-[11px] font-bold truncate max-w-[150px]">
                            {item.nombre} ×{item.cantidad}
                          </span>
                        ))}
                        {(venta.items || []).length > 2 && (
                          <span className="text-[10px] font-bold text-gray-400">+{venta.items.length - 2} más</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-600">{venta.metodo_pago}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-[#004975] tabular-nums">{formatCurrency(venta.total)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => setVentaDetalle(venta)}
                        className="p-2 text-gray-300 hover:text-[#004975] hover:bg-[#004975]/5 rounded-xl transition-all group-hover:text-gray-400">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && ventasFiltradas.length > 0 && (
          <div className="px-6 py-3.5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">{ventasFiltradas.length} venta{ventasFiltradas.length !== 1 ? 's' : ''}</span>
            <span className="text-xs font-black text-[#00C288]">Total: {formatCurrency(totalVentas)}</span>
          </div>
        )}
      </div>

      {/* Drawer Nueva Venta */}
      <VentaDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onSuccess={fetchVentas} />

      {/* Modal Detalle Venta */}
      {ventaDetalle && (
        <div className="fixed inset-0 bg-[#004975]/40 backdrop-blur-sm z-[20050] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-black text-[#004975]">Detalle de Venta</h3>
              <button onClick={() => setVentaDetalle(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 font-bold">Fecha</span>
                <span className="font-bold text-[#004975]">{formatFecha(ventaDetalle.created_at)} · {formatHora(ventaDetalle.created_at)}</span>
              </div>
              {ventaDetalle.pacientes && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-bold">Paciente</span>
                  <span className="font-bold text-[#004975]">{ventaDetalle.pacientes.nombres} {ventaDetalle.pacientes.apellidos}</span>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-100/50 border-b border-gray-200">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Productos</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {(ventaDetalle.items || []).map((item, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-[#004975] text-sm">{item.nombre}</p>
                        <p className="text-[11px] text-gray-400 font-bold">{formatCurrency(item.precio_unitario)} × {item.cantidad}</p>
                      </div>
                      <span className="font-black text-[#004975] text-sm tabular-nums">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1 pt-2 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-bold">Subtotal</span>
                  <span className="font-bold text-gray-600 tabular-nums">{formatCurrency(ventaDetalle.subtotal)}</span>
                </div>
                {ventaDetalle.descuento > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-500 font-bold">Descuento</span>
                    <span className="font-bold text-orange-500 tabular-nums">- {formatCurrency(ventaDetalle.descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-bold">Método</span>
                  <span className="font-bold text-gray-600">{ventaDetalle.metodo_pago}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="font-black text-[#004975] text-lg">Total</span>
                  <span className="font-black text-[#00C288] text-xl tabular-nums">{formatCurrency(ventaDetalle.total)}</span>
                </div>
              </div>
              {ventaDetalle.notas && (
                <div className="bg-yellow-50/50 rounded-lg p-3 border border-yellow-100/50">
                  <p className="text-xs font-bold text-yellow-800">{ventaDetalle.notas}</p>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100">
              <button onClick={() => setVentaDetalle(null)}
                className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-xl border border-gray-200 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Exportar Ventas"
        columns={ventaCsvColumns}
        fetchData={async () => ventasFiltradas}
        filename={`ventas_${fechaDesde}_${fechaHasta}`}
      >
        <p className="text-xs font-bold text-gray-500">
          Se exportarán las <span className="text-[#004975] font-black">{ventasFiltradas.length}</span> ventas que coinciden con los filtros actuales.
        </p>
      </ExportModal>
    </>
  );
}
