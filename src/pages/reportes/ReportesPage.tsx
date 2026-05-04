import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useBranchStore } from '../../stores/branchStore';
import { DatePicker } from '../../components/DatePicker';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  FileBarChart, 
  Download, 
  TrendingUp, 
  CreditCard, 
  Wallet, 
  Smartphone,
  Banknote,
  Search,
  Stethoscope,
  ShoppingBag
} from 'lucide-react';
import { exportToExcel } from '../../lib/exportCsv';
import { toast } from 'react-hot-toast';

interface TransaccionRow {
  id: string;
  fecha: string;
  tipo: string;
  monto: number;
  metodo_pago: string;
  operacion: string;
  paciente: string;
  documento: string;
  especialista: string;
}

export function ReportesPage() {
  const { sucursalActiva } = useBranchStore();
  const [isLoading, setIsLoading] = useState(true);
  
  // Date Filters (default to current month)
  const today = new Date();
  const [fechaDesde, setFechaDesde] = useState(() => format(startOfMonth(today), 'yyyy-MM-dd'));
  const [fechaHasta, setFechaHasta] = useState(() => format(endOfMonth(today), 'yyyy-MM-dd'));
  
  const [transacciones, setTransacciones] = useState<TransaccionRow[]>([]);

  useEffect(() => {
    fetchData();
  }, [fechaDesde, fechaHasta, sucursalActiva?.id]);

  const fetchData = async () => {
    if (!sucursalActiva?.id) return;
    setIsLoading(true);

    try {
      // 1. Fetch Pagos (Servicios Clínicos)
      const { data: pagosData } = await supabase
        .from('pagos')
        .select(`
          id,
          fecha_pago,
          monto_total,
          metodo_pago,
          codigo_referencia,
          citas (
            pacientes (nombres, apellidos, numero_documento),
            podologos (nombres)
          )
        `)
        .eq('sucursal_id', sucursalActiva.id)
        .eq('estado', 'Pagado')
        .gte('fecha_pago', fechaDesde + 'T00:00:00.000Z')
        .lte('fecha_pago', fechaHasta + 'T23:59:59.999Z');

      // 2. Fetch Ventas (Productos)
      const { data: ventasData } = await supabase
        .from('ventas')
        .select(`
          id,
          created_at,
          total,
          metodo_pago,
          codigo_referencia,
          estado,
          pacientes (nombres, apellidos, numero_documento)
        `)
        .eq('sucursal_id', sucursalActiva.id)
        .in('estado', ['Completada', 'Pagado']) // or just Completada
        .gte('created_at', fechaDesde + 'T00:00:00.000Z')
        .lte('created_at', fechaHasta + 'T23:59:59.999Z');

      // 3. Normalize and combine
      const combined: TransaccionRow[] = [];

      if (pagosData) {
        pagosData.forEach((p: any) => {
          combined.push({
            id: p.id,
            fecha: p.fecha_pago,
            tipo: 'Servicio Clínico',
            monto: Number(p.monto_total),
            metodo_pago: p.metodo_pago,
            operacion: p.codigo_referencia,
            paciente: p.citas?.pacientes ? `${p.citas.pacientes.nombres} ${p.citas.pacientes.apellidos}` : 'No registrado',
            documento: p.citas?.pacientes?.numero_documento || '',
            especialista: p.citas?.podologos?.nombres || 'N/A'
          });
        });
      }

      if (ventasData) {
        ventasData.forEach((v: any) => {
          combined.push({
            id: v.id,
            fecha: v.created_at,
            tipo: 'Producto (Venta)',
            monto: Number(v.total),
            metodo_pago: v.metodo_pago,
            operacion: v.codigo_referencia,
            paciente: v.pacientes ? `${v.pacientes.nombres} ${v.pacientes.apellidos}` : 'Venta General',
            documento: v.pacientes?.numero_documento || '',
            especialista: 'Tienda'
          });
        });
      }

      // 4. Sort by date descending
      combined.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      
      setTransacciones(combined);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Error al cargar los reportes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (transacciones.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const columns = [
      { key: 'fecha', header: 'Fecha', format: (r: any) => format(new Date(r.fecha), 'yyyy-MM-dd') },
      { key: 'hora', header: 'Hora', format: (r: any) => format(new Date(r.fecha), 'HH:mm') },
      { key: 'tipo', header: 'Tipo de Ingreso' },
      { key: 'paciente', header: 'Paciente' },
      { key: 'documento', header: 'DNI/Documento' },
      { key: 'especialista', header: 'Especialista' },
      { key: 'metodo_pago', header: 'Método Pago' },
      { key: 'operacion', header: 'Nro. Operación', format: (r: any) => r.operacion || '-' },
      { key: 'monto', header: 'Monto (S/)', format: (r: any) => r.monto.toFixed(2) },
    ];

    await exportToExcel(
      transacciones, 
      columns, 
      `Reporte_Financiero_${fechaDesde}_al_${fechaHasta}`,
      `Reporte Financiero Consolidado - ${(sucursalActiva as any)?.nombre || 'G&C'}`
    );
  };

  // KPIs
  const totalIngresos = transacciones.reduce((sum, t) => sum + t.monto, 0);
  const totalServicios = transacciones.filter(t => t.tipo === 'Servicio Clínico').reduce((sum, t) => sum + t.monto, 0);
  const totalProductos = transacciones.filter(t => t.tipo === 'Producto (Venta)').reduce((sum, t) => sum + t.monto, 0);

  // Group by payment method
  const metodosPago = transacciones.reduce((acc, t) => {
    acc[t.metodo_pago] = (acc[t.metodo_pago] || 0) + t.monto;
    return acc;
  }, {} as Record<string, number>);

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'Efectivo': return <Banknote className="w-4 h-4" />;
      case 'Tarjeta': return <CreditCard className="w-4 h-4" />;
      case 'Yape': 
      case 'Plin': return <Smartphone className="w-4 h-4" />;
      default: return <Wallet className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#004975] flex items-center gap-2">
            <FileBarChart className="w-7 h-7 text-[#00C288]" />
            Reportes Financieros
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Consolidado de ventas y servicios por sucursal</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm">
            <DatePicker value={fechaDesde} onChange={setFechaDesde} />
            <span className="text-gray-400 font-bold px-2">a</span>
            <DatePicker value={fechaHasta} onChange={setFechaHasta} />
          </div>
          <button
            onClick={handleExport}
            disabled={isLoading || transacciones.length === 0}
            className="bg-[#107c41] hover:bg-[#0c6b37] disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-black text-sm transition-all shadow-md flex items-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1">Total Ingresos</p>
              <h3 className="text-3xl font-black text-[#004975] tabular-nums">S/ {totalIngresos.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-[#00C288]/10 rounded-xl">
              <TrendingUp className="w-6 h-6 text-[#00C288]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-sm font-bold text-gray-600">Servicios Clínicos</span>
            </div>
            <span className="text-lg font-black text-[#004975] tabular-nums">S/ {totalServicios.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-purple-500" />
              </div>
              <span className="text-sm font-bold text-gray-600">Venta de Productos</span>
            </div>
            <span className="text-lg font-black text-[#004975] tabular-nums">S/ {totalProductos.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-3">Por Método de Pago</p>
          <div className="space-y-2.5">
            {Object.entries(metodosPago)
              .sort((a, b) => b[1] - a[1])
              .map(([metodo, monto]) => (
              <div key={metodo} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                  {getMethodIcon(metodo)}
                  {metodo}
                </div>
                <span className="text-sm font-black text-[#004975] tabular-nums">
                  S/ {monto.toFixed(2)}
                </span>
              </div>
            ))}
            {Object.keys(metodosPago).length === 0 && (
              <div className="text-sm text-gray-400 font-medium py-2">No hay datos</div>
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-bold text-[#004975]">Detalle de Transacciones</h3>
          <span className="text-xs font-bold text-gray-400">{transacciones.length} registros</span>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#00C288] rounded-full animate-spin"></div>
          </div>
        ) : transacciones.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#004975]">Sin Movimientos</h3>
            <p className="text-gray-500 text-sm mt-1">No hay cobros ni ventas en este rango de fechas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Fecha / Hora</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Paciente</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Método</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transacciones.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#004975] text-sm">{format(new Date(t.fecha), 'dd MMM yyyy', { locale: es })}</div>
                      <div className="text-xs text-gray-400 font-medium">{format(new Date(t.fecha), 'hh:mm a')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        t.tipo === 'Servicio Clínico' 
                          ? 'bg-blue-50 text-blue-600' 
                          : 'bg-purple-50 text-purple-600'
                      }`}>
                        {t.tipo === 'Servicio Clínico' ? <Stethoscope className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                        {t.tipo === 'Servicio Clínico' ? 'Clínica' : 'Tienda'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-700 text-sm">{t.paciente}</div>
                      {t.operacion && (
                        <div className="text-[10px] text-gray-400 font-bold mt-0.5">OPE: {t.operacion}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                        {getMethodIcon(t.metodo_pago)}
                        {t.metodo_pago}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-black text-[#00C288] tabular-nums">S/ {t.monto.toFixed(2)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
