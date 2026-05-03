import { useState, useEffect } from 'react';
import { Clock, User, Stethoscope, CheckCircle2, Receipt, Calendar, Printer, Download, Search, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CobroDrawer } from './CobroDrawer';
import { TicketPrint } from './TicketPrint';
import { ExportModal } from '../../../components/ExportModal';
import { useAuthStore } from '../../../stores/authStore';
import type { CsvColumn } from '../../../lib/exportCsv';
import { useBranchStore } from '../../../stores/branchStore';
import type { CitaCaja, PagoRegistrado } from '../../../types/entities';
import { DatePicker } from '../../../components/DatePicker';

export function CobrosPendientesTab() {
  const { sucursalActiva } = useBranchStore();
  const [citas, setCitas] = useState<CitaCaja[]>([]);
  const [pagos, setPagos] = useState<PagoRegistrado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaCaja | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportDesde, setExportDesde] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [exportHasta, setExportHasta] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [exportCobro, setExportCobro] = useState('');
  const [exportFilterTrigger, setExportFilterTrigger] = useState(0);

  const { perfil } = useAuthStore();
  const isDueno = perfil?.rol_nombre === 'dueno';

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [fechaDesde, setFechaDesde] = useState(todayStr);
  const [fechaHasta, setFechaHasta] = useState(todayStr);
  const isRangeToday = fechaDesde === todayStr && fechaHasta === todayStr;

  // Filtros multiples
  const [filterPagoEstado, setFilterPagoEstado] = useState<'todos' | 'pendientes' | 'pagados'>('todos');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterEspecialista, setFilterEspecialista] = useState('');
  const [filterEstadoCita, setFilterEstadoCita] = useState('');
  const [filterMetodoPago, setFilterMetodoPago] = useState('');
  const [podologos, setPodologos] = useState<{ id: string; nombres: string }[]>([]);

  useEffect(() => {
    const fetchPodologos = async () => {
      if (!sucursalActiva?.id) return;
      const { data } = await supabase
        .from('podologos')
        .select('id, nombres, sucursal_podologos!inner(sucursal_id)')
        .eq('sucursal_podologos.sucursal_id', sucursalActiva.id)
        .order('nombres');
      if (data) setPodologos(data);
    };
    fetchPodologos();
  }, [sucursalActiva?.id]);

  const limpiarFiltros = () => {
    setFilterPagoEstado('todos');
    setFilterSearch('');
    setFilterEspecialista('');
    setFilterEstadoCita('');
    setFilterMetodoPago('');
  };

  const hayFiltrosActivos = filterPagoEstado !== 'todos' || filterSearch !== '' || filterEspecialista !== '' || filterEstadoCita !== '' || filterMetodoPago !== '';

  interface CobroExportRow {
    fecha: string;
    hora: string;
    paciente: string;
    documento: string;
    especialista: string;
    estado_cita: string;
    monto: string;
    metodo_pago: string;
    estado_pago: string;
    ticket: string;
  }

  const cobroCsvColumns: CsvColumn<CobroExportRow>[] = [
    { key: 'fecha', header: 'Fecha' },
    { key: 'hora', header: 'Hora' },
    { key: 'paciente', header: 'Paciente' },
    { key: 'documento', header: 'Documento' },
    { key: 'especialista', header: 'Especialista' },
    { key: 'estado_cita', header: 'Estado Cita' },
    { key: 'monto', header: 'Monto' },
    { key: 'metodo_pago', header: 'Método Pago' },
    { key: 'estado_pago', header: 'Estado Pago' },
    { key: 'ticket', header: 'Nro. Ticket' },
  ];

  const fetchExportCobros = async (): Promise<CobroExportRow[]> => {
    const { data: citasData } = await supabase
      .from('citas')
      .select(`id, fecha_cita, hora_cita, estado, pacientes (nombres, apellidos, numero_documento), podologos (nombres)`)
      .gte('fecha_cita', exportDesde)
      .lte('fecha_cita', exportHasta)
      .not('estado', 'in', '("Cancelada","No Asistió")')
      .order('fecha_cita')
      .order('hora_cita');

    if (!citasData) return [];

    const citaIds = citasData.map((c: any) => c.id);
    const { data: pagosData } = await supabase
      .from('pagos')
      .select('cita_id, monto_total, metodo_pago, estado, numero_ticket')
      .in('cita_id', citaIds);

    const pagosMap = new Map((pagosData || []).map((p: any) => [p.cita_id, p]));

    const rows: CobroExportRow[] = citasData.map((c: any) => {
      const pago = pagosMap.get(c.id) as any;
      return {
        fecha: c.fecha_cita,
        hora: formatearHora(c.hora_cita),
        paciente: `${c.pacientes.nombres} ${c.pacientes.apellidos}`,
        documento: c.pacientes.numero_documento || '',
        especialista: c.podologos?.nombres || '',
        estado_cita: c.estado,
        monto: pago ? `S/ ${Number(pago.monto_total).toFixed(2)}` : '',
        metodo_pago: pago?.metodo_pago || '',
        estado_pago: pago ? 'Pagado' : 'Pendiente',
        ticket: pago?.numero_ticket ? `TKT-${String(pago.numero_ticket).padStart(6, '0')}` : '',
      };
    });

    if (exportCobro === 'pagado') return rows.filter(r => r.estado_pago === 'Pagado');
    if (exportCobro === 'pendiente') return rows.filter(r => r.estado_pago === 'Pendiente');
    return rows;
  };

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch citas, excluyendo Cancelada y No Asistió
    let citasQuery = supabase
      .from('citas')
      .select(`
        id,
        paciente_id,
        podologo_id,
        fecha_cita,
        hora_cita,
        motivo,
        estado,
        adelanto,
        adelanto_metodo_pago,
        pacientes (
          nombres,
          apellidos,
          numero_documento,
          telefono
        ),
        podologos (
          nombres,
          color_etiqueta
        )
      `)
      .not('estado', 'in', '("Cancelada","No Asistió")')
      .order('fecha_cita', { ascending: true })
      .order('hora_cita', { ascending: true });

    if (fechaDesde) citasQuery = citasQuery.gte('fecha_cita', fechaDesde);
    if (fechaHasta) citasQuery = citasQuery.lte('fecha_cita', fechaHasta);

    if (sucursalActiva?.id) {
      citasQuery = citasQuery.eq('sucursal_id', sucursalActiva.id);
    }

    const { data: citasData, error: citasError } = await citasQuery;

    if (citasError) {
      toast.error('Error cargando citas del día');
      console.error(citasError);
    } else {
      setCitas((citasData as unknown as CitaCaja[]) || []);
    }

    // Fetch pagos asociados a citas de hoy
    const { data: pagosData, error: pagosError } = await supabase
      .from('pagos')
      .select('id, cita_id, monto_total, metodo_pago, estado, codigo_referencia, fecha_pago, numero_ticket');

    if (pagosError) {
      console.error('Error cargando pagos:', pagosError);
    } else {
      setPagos((pagosData as PagoRegistrado[]) || []);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [fechaDesde, fechaHasta, sucursalActiva?.id]);

  const getPagoByCitaId = (citaId: string) => {
    return pagos.find(p => p.cita_id === citaId);
  };

  const formatearHora = (horaFull: string) => {
    if (!horaFull) return '';
    const [hourStr, minStr] = horaFull.split(':');
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${minStr} ${ampm}`;
  };

  const formatCurrency = (amount: number) => `S/ ${amount.toFixed(2)}`;

  const handleRegistrarCobro = (cita: CitaCaja) => {
    setCitaSeleccionada(cita);
    setIsDrawerOpen(true);
  };

  const handlePrintTicket = async (cita: CitaCaja, pago: PagoRegistrado) => {
    // Fetch servicios de la atención vinculada para listar en ticket
    let serviciosTicket: { nombre: string; precio: number }[] = [];
    const { data: atencionData } = await supabase
      .from('atenciones')
      .select('tratamientos_realizados')
      .eq('cita_id', cita.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (atencionData?.tratamientos_realizados && Array.isArray(atencionData.tratamientos_realizados)) {
      const { data: serviciosData } = await supabase
        .from('servicios')
        .select('nombre, precio_base')
        .eq('sucursal_id', sucursalActiva?.id)
        .in('nombre', atencionData.tratamientos_realizados);

      if (serviciosData) {
        serviciosTicket = serviciosData.map(s => ({ nombre: s.nombre, precio: s.precio_base }));
      }
    }

    // Fallback: si no hay servicios vinculados, mostrar genérico
    if (serviciosTicket.length === 0) {
      serviciosTicket = [{ nombre: 'Servicio Podológico', precio: pago.monto_total }];
    }

    setTicketData({
      numeroTicket: pago.numero_ticket,
      pacienteNombre: `${cita.pacientes.nombres} ${cita.pacientes.apellidos}`,
      pacienteDocumento: cita.pacientes.numero_documento,
      pacienteTelefono: cita.pacientes.telefono,
      fechaPago: pago.fecha_pago || new Date().toISOString(),
      servicios: serviciosTicket,
      montoTotal: pago.monto_total,
      metodoPago: pago.metodo_pago,
      codigoReferencia: pago.codigo_referencia,
      especialista: cita.podologos?.nombres,
    });
    setTicketOpen(true);
  };

  const ESTADOS_MAP: Record<string, { color: string; border: string }> = {
    'Programada': { color: 'bg-gray-100 text-gray-600', border: 'border-gray-200' },
    'Confirmada': { color: 'bg-[#00C288]/10 text-[#00C288]', border: 'border-[#00C288]/30' },
    'En Sala de Espera': { color: 'bg-orange-50 text-orange-600', border: 'border-orange-200' },
    'Atendida': { color: 'bg-[#004975]/10 text-[#004975]', border: 'border-[#004975]/30' },
  };

  // Lista filtrada (todos los criterios combinados con AND)
  const citasFiltradas = citas.filter(cita => {
    const pago = getPagoByCitaId(cita.id);
    if (filterPagoEstado === 'pagados' && !pago) return false;
    if (filterPagoEstado === 'pendientes' && pago) return false;
    if (filterEspecialista && cita.podologo_id !== filterEspecialista) return false;
    if (filterEstadoCita && cita.estado !== filterEstadoCita) return false;
    if (filterMetodoPago && pago?.metodo_pago !== filterMetodoPago) return false;
    if (filterSearch) {
      const term = filterSearch.toLowerCase();
      const fullName = `${cita.pacientes.nombres} ${cita.pacientes.apellidos}`.toLowerCase();
      const doc = (cita.pacientes.numero_documento || '').toLowerCase();
      if (!fullName.includes(term) && !doc.includes(term)) return false;
    }
    return true;
  });

  // Stats sobre el conjunto filtrado
  const totalCitas = citasFiltradas.length;
  const totalPagadas = citasFiltradas.filter(c => getPagoByCitaId(c.id)).length;
  const totalPendientes = totalCitas - totalPagadas;
  const montoRecaudado = citasFiltradas.reduce((sum, c) => {
    const pago = getPagoByCitaId(c.id);
    return sum + (pago ? pago.monto_total : 0);
  }, 0);

  // Conteos para los pills (sobre el dataset completo, sin filtro de estado de pago aplicado)
  const conteosPago = (() => {
    const baseFiltered = citas.filter(cita => {
      const pago = getPagoByCitaId(cita.id);
      if (filterEspecialista && cita.podologo_id !== filterEspecialista) return false;
      if (filterEstadoCita && cita.estado !== filterEstadoCita) return false;
      if (filterMetodoPago && pago?.metodo_pago !== filterMetodoPago) return false;
      if (filterSearch) {
        const term = filterSearch.toLowerCase();
        const fullName = `${cita.pacientes.nombres} ${cita.pacientes.apellidos}`.toLowerCase();
        const doc = (cita.pacientes.numero_documento || '').toLowerCase();
        if (!fullName.includes(term) && !doc.includes(term)) return false;
      }
      return true;
    });
    const pagadas = baseFiltered.filter(c => getPagoByCitaId(c.id)).length;
    return { todos: baseFiltered.length, pendientes: baseFiltered.length - pagadas, pagados: pagadas };
  })();

  return (
    <>
      {/* Date range filter + Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 shadow-sm p-1.5">
            <div className="flex items-center gap-1.5">
              <DatePicker value={fechaDesde} onChange={(v) => {
                setFechaDesde(v);
                if (v && fechaHasta && v > fechaHasta) setFechaHasta(v);
              }} />
              <span className="text-xs font-bold text-gray-400">a</span>
              <DatePicker value={fechaHasta} onChange={(v) => {
                setFechaHasta(v);
                if (v && fechaDesde && v < fechaDesde) setFechaDesde(v);
              }} />
            </div>
          </div>
          {!isRangeToday && (
            <button onClick={() => { setFechaDesde(todayStr); setFechaHasta(todayStr); }}
              className="text-[11px] font-black text-[#00C288] uppercase tracking-wider bg-[#00C288]/10 hover:bg-[#00C288]/20 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Hoy
            </button>
          )}
        </div>

        {isDueno && (
          <button
            onClick={() => setIsExportOpen(true)}
            className="bg-white hover:bg-gray-50 text-[#004975] px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm border border-gray-200 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar Cobros
          </button>
        )}
      </div>

      {/* Filtros multiples */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-4 md:p-5 mb-6 space-y-4">
        {/* Pills de estado de pago */}
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { key: 'todos', label: 'Todos', count: conteosPago.todos, color: 'text-[#004975]', activeColor: 'bg-[#004975] text-white border-[#004975]' },
            { key: 'pendientes', label: 'Pendientes', count: conteosPago.pendientes, color: 'text-orange-600', activeColor: 'bg-orange-500 text-white border-orange-500' },
            { key: 'pagados', label: 'Pagados', count: conteosPago.pagados, color: 'text-[#00C288]', activeColor: 'bg-[#00C288] text-white border-[#00C288]' },
          ] as const).map(pill => {
            const isActive = filterPagoEstado === pill.key;
            return (
              <button
                key={pill.key}
                onClick={() => setFilterPagoEstado(pill.key)}
                className={`px-4 py-2 rounded-xl border font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm ${
                  isActive ? pill.activeColor + ' shadow-md' : `bg-white border-gray-200 ${pill.color} hover:border-gray-300`
                }`}
              >
                {pill.label}
                <span className={`tabular-nums px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                  {pill.count}
                </span>
              </button>
            );
          })}
          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="ml-auto text-xs font-bold text-[#004975] hover:text-[#00C288] transition-colors flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Limpiar filtros
            </button>
          )}
        </div>

        {/* Filtros adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar paciente o DNI..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00C288] focus:bg-white outline-none transition-all placeholder:text-gray-400 font-medium"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <select
            value={filterEspecialista}
            onChange={(e) => setFilterEspecialista(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-[#00C288] transition-colors"
          >
            <option value="">Todos los especialistas</option>
            {podologos.map(p => (
              <option key={p.id} value={p.id}>{p.nombres}</option>
            ))}
          </select>
          <select
            value={filterEstadoCita}
            onChange={(e) => setFilterEstadoCita(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-[#00C288] transition-colors"
          >
            <option value="">Todos los estados</option>
            <option value="Programada">Programada</option>
            <option value="Confirmada">Confirmada</option>
            <option value="En Sala de Espera">En Sala de Espera</option>
            <option value="Atendida">Atendida</option>
          </select>
          <select
            value={filterMetodoPago}
            onChange={(e) => setFilterMetodoPago(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-[#00C288] transition-colors"
          >
            <option value="">Todos los métodos</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Yape">Yape</option>
            <option value="Plin">Plin</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Transferencia">Transferencia</option>
          </select>
        </div>
      </div>

      {/* Resumen del Día */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#004975]/5 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#004975]" />
            </div>
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">
              {!fechaDesde && !fechaHasta ? 'Histórico' : isRangeToday ? 'Hoy' : 'Período'}
            </span>
          </div>
          <p className="text-xs font-bold text-[#004975] capitalize">
            {!fechaDesde && !fechaHasta
              ? 'Todos los registros'
              : !fechaDesde
                ? `Hasta ${format(new Date(fechaHasta + 'T12:00:00'), "d MMM yyyy", { locale: es })}`
                : !fechaHasta
                  ? `Desde ${format(new Date(fechaDesde + 'T12:00:00'), "d MMM yyyy", { locale: es })}`
                  : fechaDesde === fechaHasta
                    ? format(new Date(fechaDesde + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })
                    : `${format(new Date(fechaDesde + 'T12:00:00'), "d MMM", { locale: es })} — ${format(new Date(fechaHasta + 'T12:00:00'), "d MMM yyyy", { locale: es })}`}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Atenciones</span>
          </div>
          <p className="text-2xl font-black text-[#004975] tabular-nums">{totalCitas}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Pendientes</span>
          </div>
          <p className="text-2xl font-black text-orange-500 tabular-nums">{totalPendientes}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#00C288]/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-[#00C288]" />
            </div>
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Recaudado</span>
          </div>
          <p className="text-2xl font-black text-[#00C288] tabular-nums">{formatCurrency(montoRecaudado)}</p>
        </div>
      </div>

      {/* Lista de Citas */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#00C288] rounded-full animate-spin" />
          </div>
        ) : citasFiltradas.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Calendar className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-black text-[#004975] mb-2">
              {hayFiltrosActivos ? 'Sin coincidencias' : 'Sin citas en el período'}
            </h3>
            <p className="text-gray-400 font-bold text-sm max-w-sm mx-auto">
              {hayFiltrosActivos
                ? 'Ninguna cita coincide con los filtros aplicados. Prueba ajustando los criterios.'
                : 'No hay atenciones en este rango de fechas. Las citas aparecerán aquí automáticamente desde la agenda.'}
            </p>
            {hayFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-bold text-sm transition-colors inline-flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Limpiar Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Hora
                  </th>
                  <th className="text-left px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Paciente
                  </th>
                  <th className="text-left px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Especialista
                  </th>
                  <th className="text-center px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Estado Cita
                  </th>
                  <th className="text-center px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Cobro
                  </th>
                </tr>
              </thead>
              <tbody>
                {citasFiltradas.map((cita, index) => {
                  const pago = getPagoByCitaId(cita.id);
                  const style = ESTADOS_MAP[cita.estado] || ESTADOS_MAP['Programada'];
                  const isPagado = !!pago;

                  return (
                    <tr
                      key={cita.id}
                      className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors group relative ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      } ${isPagado ? 'opacity-70' : ''} ${
                        isPagado
                          ? 'border-l-4 border-l-[#00C288]'
                          : 'border-l-4 border-l-orange-400'
                      }`}
                    >
                      {/* Hora */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg ${style.color}`}>
                            <Clock className="w-4 h-4" />
                          </div>
                          <span className="font-black text-[#004975] text-sm tabular-nums whitespace-nowrap">
                            {formatearHora(cita.hora_cita)}
                          </span>
                        </div>
                      </td>

                      {/* Paciente */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-[#004975]/5 rounded-full flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-[#004975]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#004975] text-sm truncate">
                              {cita.pacientes.nombres} {cita.pacientes.apellidos}
                            </p>
                            {cita.pacientes.numero_documento && (
                              <p className="text-[11px] font-bold text-gray-400 mt-0.5">
                                DOC: {cita.pacientes.numero_documento}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Especialista */}
                      <td className="px-6 py-4">
                        {cita.podologos && (
                          <div
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border shadow-sm"
                            style={{
                              backgroundColor: `${cita.podologos.color_etiqueta}12`,
                              color: cita.podologos.color_etiqueta,
                              borderColor: `${cita.podologos.color_etiqueta}30`,
                            }}
                          >
                            <Stethoscope className="w-3.5 h-3.5" />
                            {cita.podologos.nombres}
                          </div>
                        )}
                      </td>

                      {/* Estado Cita */}
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border shadow-sm ${style.color} ${style.border}`}
                        >
                          {cita.estado}
                        </span>
                      </td>

                      {/* Cobro */}
                      <td className="px-6 py-4 text-center">
                        {isPagado ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] bg-[#00C288]/10 text-[#00C288] border border-[#00C288]/20 shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Pagado
                            </span>
                            {pago!.numero_ticket && (
                              <span className="text-[10px] font-black text-[#004975]/50 tabular-nums tracking-wider">
                                TKT-{String(pago!.numero_ticket).padStart(6, '0')}
                              </span>
                            )}
                            <span className="text-xs font-black text-[#004975] tabular-nums">
                              {formatCurrency(pago!.monto_total)}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                              {pago!.metodo_pago}
                            </span>
                            <button
                              onClick={() => handlePrintTicket(cita, pago!)}
                              className="mt-1 text-[10px] font-black text-[#004975] hover:text-[#00C288] uppercase tracking-wider inline-flex items-center gap-1 hover:underline transition-colors"
                            >
                              <Printer className="w-3 h-3" />
                              Imprimir Ticket
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRegistrarCobro(cita)}
                            className="bg-[#00C288] hover:bg-[#00ab78] text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg inline-flex items-center gap-2"
                          >
                            <Receipt className="w-4 h-4" />
                            Registrar Cobro
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        {!isLoading && citasFiltradas.length > 0 && (
          <div className="px-6 py-3.5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">
              {totalCitas} cita{totalCitas !== 1 ? 's' : ''}{isRangeToday ? ' hoy' : ''}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-orange-500">
                {totalPendientes} pendiente{totalPendientes !== 1 ? 's' : ''}
              </span>
              <span className="text-xs font-bold text-[#00C288]">
                {totalPagadas} cobrada{totalPagadas !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Drawer de Cobro */}
      <CobroDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={fetchData}
        cita={citaSeleccionada}
      />

      {/* Ticket de Impresión */}
      <TicketPrint
        isOpen={ticketOpen}
        onClose={() => setTicketOpen(false)}
        data={ticketData}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Exportar Cobros"
        columns={cobroCsvColumns}
        fetchData={fetchExportCobros}
        filename={`cobros_${exportDesde}_${exportHasta}`}
        onFiltersChanged={exportFilterTrigger}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#004975] mb-1.5">Desde</label>
            <DatePicker value={exportDesde} onChange={(v) => { setExportDesde(v); setExportFilterTrigger(n => n + 1); }} />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#004975] mb-1.5">Hasta</label>
            <DatePicker value={exportHasta} onChange={(v) => { setExportHasta(v); setExportFilterTrigger(n => n + 1); }} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-[#004975] mb-1.5">Estado de cobro</label>
          <select value={exportCobro} onChange={(e) => { setExportCobro(e.target.value); setExportFilterTrigger(n => n + 1); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium bg-gray-50 focus:ring-2 focus:ring-[#00C288] outline-none">
            <option value="">Todos</option>
            <option value="pagado">Solo pagados</option>
            <option value="pendiente">Solo pendientes</option>
          </select>
        </div>
      </ExportModal>
    </>
  );
}
