import { useEffect, useState } from 'react';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock, 
  ArrowUpRight, 
  Plus,
  Play,
  AlertCircle,
  Package,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { format, startOfDay, endOfDay, subDays, parseISO, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { useBranchStore } from '../stores/branchStore';
import { useNavigate } from 'react-router-dom';
import type { ProximaCitaRow } from '../types/agenda';

interface DashboardStats {
  todayAppointments: number;
  todayRevenue: number;
  todaySalesRevenue: number;
  newPatientsMonth: number;
  pendingPaymentsCount: number;
}

interface ChartData {
  date: string;
  revenue: number;
  label: string;
}

interface LowStockProduct {
  id: string;
  nombre: string;
  stock: number;
  stock_minimo: number;
}

export function Dashboard() {
  const { sucursalActiva } = useBranchStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    todayRevenue: 0,
    todaySalesRevenue: 0,
    newPatientsMonth: 0,
    pendingPaymentsCount: 0
  });
  const [last7DaysRevenue, setLast7DaysRevenue] = useState<ChartData[]>([]);
  const [nextAppointments, setNextAppointments] = useState<ProximaCitaRow[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!sucursalActiva?.id) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const startOfMonthDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');

    try {
      const [
        { count: appointmentsCount },
        { data: todayPayments },
        { data: todaySales },
        { count: patientsCount },
        { data: todayCitasAtendidas },
        { data: weekPayments },
        { data: weekSales },
        { data: nextCitas },
        { data: alertProducts }
      ] = await Promise.all([
        supabase
          .from('citas')
          .select('*', { count: 'exact', head: true })
          .eq('fecha_cita', today)
          .eq('sucursal_id', sucursalActiva.id)
          .not('estado', 'eq', 'Cancelada'),
        supabase
          .from('pagos')
          .select('monto_total')
          .eq('sucursal_id', sucursalActiva.id)
          .gte('fecha_pago', startOfDay(new Date()).toISOString())
          .lte('fecha_pago', endOfDay(new Date()).toISOString()),
        // Ventas de productos del día
        supabase
          .from('ventas')
          .select('total')
          .eq('sucursal_id', sucursalActiva.id)
          .gte('created_at', startOfDay(new Date()).toISOString())
          .lte('created_at', endOfDay(new Date()).toISOString()),
        supabase
          .from('pacientes')
          .select('*', { count: 'exact', head: true })
          .eq('sucursal_id', sucursalActiva.id)
          .gte('created_at', startOfMonthDate),
        supabase
          .from('citas')
          .select('id')
          .eq('fecha_cita', today)
          .eq('sucursal_id', sucursalActiva.id)
          .eq('estado', 'Atendida'),
        supabase
          .from('pagos')
          .select('monto_total, fecha_pago')
          .eq('sucursal_id', sucursalActiva.id)
          .gte('fecha_pago', subDays(new Date(), 7).toISOString()),
        // Ventas de productos de la última semana
        supabase
          .from('ventas')
          .select('total, created_at')
          .eq('sucursal_id', sucursalActiva.id)
          .gte('created_at', subDays(new Date(), 7).toISOString()),
        supabase
          .from('citas')
          .select(`
            id,
            hora_cita,
            motivo,
            estado,
            pacientes (nombres, apellidos),
            podologos (nombres)
          `)
          .eq('fecha_cita', today)
          .eq('sucursal_id', sucursalActiva.id)
          .in('estado', ['Programada', 'Confirmada', 'En Sala de Espera'])
          .order('hora_cita', { ascending: true })
          .limit(5),
        // Productos con stock bajo o agotado (filtrado client-side porque PostgREST no soporta comparar columna vs columna)
        supabase
          .from('productos')
          .select('id, nombre, stock, stock_minimo')
          .eq('estado', true)
          .eq('sucursal_id', sucursalActiva.id)
          .order('stock', { ascending: true })
      ]);

      const revenueToday = todayPayments?.reduce((sum, p) => sum + p.monto_total, 0) || 0;
      const salesRevenueToday = todaySales?.reduce((sum, v) => sum + v.total, 0) || 0;
      
      const atendidasIds = todayCitasAtendidas?.map(c => c.id) || [];
      let pendingCount = 0;
      if (atendidasIds.length > 0) {
        const { data: relatedPagos } = await supabase
          .from('pagos')
          .select('cita_id')
          .in('cita_id', atendidasIds);
        
        const pagadosIds = new Set(relatedPagos?.map(p => p.cita_id) || []);
        pendingCount = atendidasIds.filter(id => !pagadosIds.has(id)).length;
      }

      const chartMap = new Map();
      for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const key = format(d, 'yyyy-MM-dd');
        chartMap.set(key, { 
          date: key, 
          revenue: 0, 
          label: format(d, 'EEE', { locale: es }) 
        });
      }

      weekPayments?.forEach(p => {
        const key = format(parseISO(p.fecha_pago), 'yyyy-MM-dd');
        if (chartMap.has(key)) {
          const entry = chartMap.get(key);
          entry.revenue += p.monto_total;
        }
      });

      // Sumar ventas de productos a la gráfica semanal
      weekSales?.forEach(v => {
        const key = format(parseISO(v.created_at), 'yyyy-MM-dd');
        if (chartMap.has(key)) {
          const entry = chartMap.get(key);
          entry.revenue += v.total;
        }
      });

      setLast7DaysRevenue(Array.from(chartMap.values()));
      setNextAppointments((nextCitas as unknown as ProximaCitaRow[]) || []);
      // Filtrar productos con stock bajo o agotado (comparación columna vs columna)
      const filteredLowStock = (alertProducts as LowStockProduct[] || [])
        .filter(p => p.stock === 0 || (p.stock_minimo > 0 && p.stock <= p.stock_minimo))
        .slice(0, 5);
      setLowStockProducts(filteredLowStock);

      setStats({
        todayAppointments: appointmentsCount || 0,
        todayRevenue: revenueToday + salesRevenueToday,
        todaySalesRevenue: salesRevenueToday,
        newPatientsMonth: patientsCount || 0,
        pendingPaymentsCount: pendingCount
      });

    } catch (error) {
      console.error("Dashboard fetching error:", error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sucursalActiva?.id]);

  const formatCurrency = (val: number) => `S/ ${val.toFixed(2)}`;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-100 border-t-primary rounded-full animate-spin" />
          <p className="text-gray-400 font-bold animate-pulse">Cargando tablero...</p>
        </div>
      </div>
    );
  }

  const totalRevenue = stats.todayRevenue;
  const servicesRevenue = totalRevenue - stats.todaySalesRevenue;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#004975] tracking-tight">
            ¡Hola, {sucursalActiva?.nombre_comercial}!
          </h1>
          <p className="text-gray-500 font-medium mt-1">Aquí tienes un resumen de lo que sucede hoy en tu sede.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/agenda')}
            className="p-2.5 bg-white border border-gray-100 rounded-xl text-secondary hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2 font-bold text-sm"
          >
            <Calendar className="w-4 h-4 text-primary" />
            Ver Agenda
          </button>
          <button 
            onClick={() => navigate('/pacientes')}
            className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-md flex items-center gap-2 font-bold text-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo Paciente
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Appointments KPI */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
            <Calendar className="w-24 h-24 text-secondary" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Citas Hoy</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-[#004975]">{stats.todayAppointments}</p>
            <span className="text-xs font-bold text-gray-400">programadas</span>
          </div>
        </div>

        {/* Revenue KPI — Servicios + Ventas */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
            <TrendingUp className="w-24 h-24 text-secondary" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Ingresos Hoy</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-[#004975] tabular-nums">{formatCurrency(totalRevenue)}</p>
            {totalRevenue > 0 && <ArrowUpRight className="w-4 h-4 text-primary" />}
          </div>
          {(servicesRevenue > 0 || stats.todaySalesRevenue > 0) && (
            <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-gray-400">
              {servicesRevenue > 0 && <span>Servicios: {formatCurrency(servicesRevenue)}</span>}
              {servicesRevenue > 0 && stats.todaySalesRevenue > 0 && <span className="text-gray-200">·</span>}
              {stats.todaySalesRevenue > 0 && <span>Productos: {formatCurrency(stats.todaySalesRevenue)}</span>}
            </div>
          )}
        </div>

        {/* New Patients KPI */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
            <Users className="w-24 h-24 text-secondary" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Nuevos (Mes)</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-[#004975]">{stats.newPatientsMonth}</p>
            <span className="text-xs font-bold text-gray-400">pacientes</span>
          </div>
        </div>

        {/* Pending Payments KPI */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
            <AlertCircle className="w-24 h-24 text-secondary" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Por Cobrar</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-red-500">{stats.pendingPaymentsCount}</p>
            <span className="text-xs font-bold text-gray-400">atenciones</span>
          </div>
        </div>
      </div>

      {/* Middle Section: Chart & Next Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-[#004975]">Rendimiento Semanal</h3>
              <p className="text-gray-400 text-sm font-medium">Ingresos diarios: servicios + ventas (Soles)</p>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
              <span className="text-[10px] font-black text-[#004975] px-3 py-1 bg-white rounded-lg shadow-sm">Ingresos</span>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7DaysRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C288" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#00C288" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                  tickFormatter={(val) => `S/ ${val}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                  itemStyle={{ fontWeight: 800, color: '#004975' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}
                  formatter={(value: any) => [`S/ ${Number(value || 0).toFixed(2)}`, 'Recaudado']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#00C288" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Next Appointments Panel */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-[#004975]">Próximas Citas</h3>
            <button 
              onClick={() => navigate('/agenda')}
              className="text-[11px] font-black text-primary hover:underline uppercase tracking-wider"
            >
              Ver Todas
            </button>
          </div>

          <div className="flex-1 space-y-4">
            {nextAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm font-bold text-secondary">No hay citas pendientes</p>
                <p className="text-xs">¡Todo bajo control!</p>
              </div>
            ) : (
              nextAppointments.map((cita) => {
                const [h, m] = (cita.hora_cita || "00:00").split(':');
                const hourFormatted = `${h}:${m}`;
                return (
                  <div key={cita.id} className="group p-4 bg-gray-50 hover:bg-primary/5 rounded-2xl transition-all border border-transparent hover:border-primary/20">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center shadow-sm font-black text-[#004975] text-[13px] tabular-nums group-hover:text-primary transition-colors">
                          {hourFormatted}
                        </div>
                        <div>
                          <p className="font-black text-[#004975] text-sm leading-none transition-colors">
                            {cita.pacientes?.nombres} {cita.pacientes?.apellidos}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">
                            {cita.motivo || 'Servicio General'}
                          </p>
                        </div>
                      </div>
                      <div className={`p-1.5 rounded-lg ${
                        cita.estado === 'En Sala de Espera' ? 'bg-orange-100 text-orange-600' : 
                        cita.estado === 'Confirmada' ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {cita.estado === 'En Sala de Espera' ? <Play className="w-3.5 h-3.5 fill-current" /> : <Clock className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                    {cita.podologos && (
                      <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                        Podólogo: {cita.podologos.nombres}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          <button 
           onClick={() => navigate('/agenda')}
           className="mt-6 w-full py-4 bg-[#004975]/5 text-[#004975] hover:bg-[#004975]/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
          >
            Abrir Agenda Completa
          </button>
        </div>
      </div>

      {/* Bottom Section: Ticket Promedio + Inventario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ticket Promedio */}
        <div className="bg-gradient-to-br from-[#004975] to-[#003a5e] p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden self-start">
          <div className="absolute -bottom-6 -right-6 opacity-10">
            <TrendingUp className="w-48 h-48" />
          </div>
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Ticket Promedio</h4>
          <p className="text-3xl font-black tabular-nums">
            {formatCurrency(stats.todayRevenue / (stats.todayAppointments || 1))}
          </p>
          <p className="text-xs font-medium opacity-40 mt-3">Basado en citas e ingresos de hoy</p>
        </div>

        {/* Alertas de Inventario */}
        <div className="md:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h4 className="font-black text-[#004975] text-base">Alertas de Inventario</h4>
                <p className="text-[11px] text-gray-400 font-bold">Productos con stock bajo o agotado</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/inventario')}
              className="text-[11px] font-black text-primary hover:underline uppercase tracking-wider flex items-center gap-1"
            >
              Ver Todo <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="flex items-center gap-3 bg-[#00C288]/5 rounded-2xl p-4 border border-[#00C288]/10">
              <div className="w-8 h-8 bg-[#00C288]/10 rounded-lg flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-[#00C288]" />
              </div>
              <div>
                <p className="font-bold text-[#004975] text-sm">Todo en orden</p>
                <p className="text-[11px] text-gray-400 font-medium">No hay productos con stock bajo.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockProducts.map(product => {
                const isOut = product.stock === 0;
                return (
                  <div
                    key={product.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-colors ${
                      isOut 
                        ? 'bg-red-50/50 border-red-100' 
                        : 'bg-orange-50/50 border-orange-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isOut ? 'bg-red-100' : 'bg-orange-100'
                      }`}>
                        <AlertTriangle className={`w-4 h-4 ${isOut ? 'text-red-500' : 'text-orange-500'}`} />
                      </div>
                      <div>
                        <p className="font-bold text-[#004975] text-sm">{product.nombre}</p>
                        <p className={`text-[10px] font-black uppercase tracking-wider ${isOut ? 'text-red-500' : 'text-orange-500'}`}>
                          {isOut ? 'Agotado' : 'Stock Bajo'}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg text-sm font-black tabular-nums ${
                      isOut 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-orange-100 text-orange-600'
                    }`}>
                      {product.stock} / {product.stock_minimo}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
