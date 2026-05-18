import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Search, Download, X, AlertTriangle, Package, Repeat } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, addDays, subDays, addMonths, subMonths, isSameDay, startOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { CitaDrawer } from './components/CitaDrawer';
import { CitasListPanel } from './components/CitasListPanel';
import { formatearHora } from '../../lib/formatters';
import { ExportModal } from '../../components/ExportModal';
import { useBranchStore } from '../../stores/branchStore';
import { useAuthStore } from '../../stores/authStore';
import type { CsvColumn } from '../../lib/exportCsv';
import type { CitaList, Pack } from '../../types/entities';
import { DatePicker } from '../../components/DatePicker';

// Re-export for CitasListPanel
export type { CitaList } from '../../types/entities';

export function AgendaPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [citas, setCitas] = useState<CitaList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { sucursalActiva } = useBranchStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [citaEnEdicion, setCitaEnEdicion] = useState<CitaList | null>(null);
  const [citaAConfirmar, setCitaAConfirmar] = useState<{id: string, nuevoEstado: string} | null>(null);

  const [podologos, setPodologos] = useState<{id: string, nombres: string}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEspecialista, setSelectedEspecialista] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const [visibleDays, setVisibleDays] = useState(7);
  const stripRef = useRef<HTMLDivElement>(null);
  const [promosActivas, setPromosActivas] = useState<Pack[]>([]);

  const calcVisibleDays = useCallback(() => {
    if (stripRef.current) {
      const width = stripRef.current.offsetWidth;
      const isMd = window.innerWidth >= 768;
      const dayWidth = (isMd ? 68 : 60) + 6; // day width + gap
      setVisibleDays(Math.max(1, Math.min(7, Math.floor(width / dayWidth))));
    }
  }, []);

  useEffect(() => {
    calcVisibleDays();
    window.addEventListener('resize', calcVisibleDays);
    return () => window.removeEventListener('resize', calcVisibleDays);
  }, [calcVisibleDays]);

  // Recalcular cuando cambia el layout (ej: action buttons aparecen/desaparecen)
  useEffect(() => { calcVisibleDays(); }, [selectedDate, calcVisibleDays]);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Export state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportDesde, setExportDesde] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [exportHasta, setExportHasta] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [exportEspecialista, setExportEspecialista] = useState('');
  const [exportEstado, setExportEstado] = useState('');
  const [exportFilterTrigger, setExportFilterTrigger] = useState(0);

  const { perfil } = useAuthStore();
  const isPodologo = perfil?.rol_nombre === 'podologo';
  const isDueno = perfil?.rol_nombre === 'dueno';
  const [miPodoId, setMiPodoId] = useState<string | null>(null);

  useEffect(() => {
    if (isPodologo && perfil?.email) {
      supabase.from('podologos').select('id').eq('correo', perfil.email).single()
        .then(({ data }) => {
          if (data) setMiPodoId(data.id);
          else setMiPodoId('00000000-0000-0000-0000-000000000000');
        });
    }
  }, [isPodologo, perfil?.email]);

  const citaCsvColumns: CsvColumn<CitaList>[] = [
    { key: 'fecha_cita', header: 'Fecha' },
    { key: 'hora_cita', header: 'Hora', format: (r) => formatearHora(r.hora_cita) },
    { key: '', header: 'Paciente', format: (r) => `${r.pacientes.nombres} ${r.pacientes.apellidos}` },
    { key: 'pacientes.numero_documento', header: 'Documento' },
    { key: 'pacientes.telefono', header: 'Teléfono' },
    { key: 'motivo', header: 'Motivo' },
    { key: '', header: 'Especialista', format: (r) => r.podologos?.nombres || '' },
    { key: 'estado', header: 'Estado' },
  ];

  const fetchExportCitas = async (): Promise<CitaList[]> => {
    let query = supabase
      .from('citas')
      .select(`*, pacientes (nombres, apellidos, telefono, numero_documento), podologos (nombres, color_etiqueta)`)
      .gte('fecha_cita', exportDesde)
      .lte('fecha_cita', exportHasta)
      .order('fecha_cita')
      .order('hora_cita');

    if (exportEspecialista) query = query.eq('podologo_id', exportEspecialista);
    if (exportEstado) query = query.eq('estado', exportEstado);

    const { data, error } = await query;
    if (error || !data) return [];
    return data as unknown as CitaList[];
  };

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

  // Fetch promos/packs activos para la fecha seleccionada
  useEffect(() => {
    const fetchPromos = async () => {
      if (!sucursalActiva?.id) return;
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const { data } = await supabase
        .from('packs_promociones')
        .select('id, nombre, tipo, precio_pack, total_sesiones, fecha_inicio, fecha_fin, stock_total, stock_usado, estado')
        .eq('sucursal_id', sucursalActiva.id)
        .eq('estado', true);

      if (data) {
        const vigentes = (data as Pack[]).filter(p => {
          if (p.fecha_inicio && p.fecha_inicio > dateStr) return false;
          if (p.fecha_fin && p.fecha_fin < dateStr) return false;
          if (p.stock_total && (p.stock_usado || 0) >= p.stock_total) return false;
          return true;
        });
        setPromosActivas(vigentes);
      }
    };
    fetchPromos();
  }, [selectedDate, sucursalActiva?.id]);

  const fetchCitas = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    
    let query = supabase
      .from('citas')
      .select(`
        *,
        pacientes (
          nombres,
          apellidos,
          telefono,
          numero_documento,
          sellos
        ),
        podologos (
          nombres,
          color_etiqueta
        )
      `);

    if (!isGlobalSearch) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      query = query.eq('fecha_cita', dateStr);
    }

    if (sucursalActiva?.id) {
      query = query.eq('sucursal_id', sucursalActiva.id);
    }

    if (isPodologo) {
      if (!miPodoId) return; // Wait until we have the ID
      query = query.eq('podologo_id', miPodoId);
    }

    const { data, error } = await query
      .order('fecha_cita', { ascending: !isGlobalSearch })
      .order('hora_cita', { ascending: true });

    if (error) {
      toast.error('Error cargando la agenda del día');
      console.error(error);
    } else {
      setCitas(data as unknown as CitaList[]);
    }
    
    if (showLoader) setIsLoading(false);
  };

  useEffect(() => {
    if (isPodologo && !miPodoId) return; // Esperar a tener el ID
    fetchCitas();
  }, [selectedDate, isGlobalSearch, sucursalActiva?.id, isPodologo, miPodoId]);

  const updateEstadoCita = async (id: string, nuevoEstado: string, skipConfirm = false) => {
    if ((nuevoEstado === 'Cancelada' || nuevoEstado === 'No Asistió') && !skipConfirm) {
      setCitaAConfirmar({ id, nuevoEstado });
      setCitas(prev => [...prev]); // Forzar render para que el select vuelva a su estado anterior en el DOM
      return; // Detener ejecución
    }

    setCitaAConfirmar(null);
    // Actualización local optimista instantánea
    setCitas(prev => prev.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c));
    
    const { error } = await supabase.from('citas').update({ estado: nuevoEstado }).eq('id', id);
    if (!error) {
      toast.success(`Cita marcada como: ${nuevoEstado}`);
    } else {
      toast.error('Error procesando actualización de estado');
      fetchCitas(false); // Revertir en caso de de-sincronización DB
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedEspecialista('');
    setSelectedEstado('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header Calendario Activo */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-4 lg:p-6 flex flex-col lg:flex-row justify-between items-center gap-4 lg:gap-6">
        
        {/* Date Navigator */}
        <div className="flex flex-col w-full lg:w-auto lg:min-w-0 lg:flex-1 bg-gray-50/80 rounded-2xl p-2 border border-gray-100 gap-2">
          {/* Month selector + date picker */}
          <div className="flex items-center justify-between px-1">
            <div className="relative flex items-center gap-2">
              <button
                onClick={() => {
                  setCalendarViewDate(selectedDate);
                  setIsCalendarOpen(!isCalendarOpen);
                  setShowYearPicker(false);
                  setShowMonthPicker(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white rounded-xl transition-colors group"
              >
                <CalendarIcon className="w-4 h-4 text-[#00C288]" />
                <span className="text-sm font-black text-[#004975] capitalize tracking-wide">
                  {format(selectedDate, "MMMM yyyy", { locale: es })}
                </span>
                <ChevronLeft className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isCalendarOpen ? 'rotate-90' : '-rotate-90'}`} />
              </button>

              {/* Mini Calendar Dropdown */}
              {isCalendarOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsCalendarOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-[280px] animate-in zoom-in-95 fade-in duration-150">
                    {/* Calendar header */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => setCalendarViewDate(subMonths(calendarViewDate, 1))}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      <div className="flex items-center gap-1 relative">
                        <button 
                          type="button"
                          onClick={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false); }}
                          className={`text-xs font-black px-2 py-1 rounded-lg capitalize transition-colors ${showMonthPicker ? 'bg-[#00C288] text-white' : 'text-[#004975] hover:bg-gray-50'}`}
                        >
                          {format(calendarViewDate, 'MMMM', { locale: es })}
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false); }}
                          className={`text-xs font-black px-2 py-1 rounded-lg transition-colors ${showYearPicker ? 'bg-[#00C288] text-white' : 'text-[#004975] hover:bg-gray-50'}`}
                        >
                          {calendarViewDate.getFullYear()}
                        </button>

                        {/* Custom Year Picker Overlay */}
                        {showYearPicker && (
                          <div className="absolute top-full left-0 mt-1 w-28 max-h-48 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-2xl z-[51] scrollbar-thin scrollbar-thumb-gray-200 p-1">
                            {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                              <button
                                key={y}
                                type="button"
                                onClick={() => {
                                  const d = new Date(calendarViewDate);
                                  d.setFullYear(y);
                                  setCalendarViewDate(d);
                                  setShowYearPicker(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-[11px] font-bold rounded-lg transition-colors ${y === calendarViewDate.getFullYear() ? 'text-white bg-[#00C288]' : 'text-[#004975] hover:bg-gray-50'}`}
                              >
                                {y}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Custom Month Picker Overlay */}
                        {showMonthPicker && (
                          <div className="absolute top-full left-0 mt-1 w-32 max-h-48 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-2xl z-[51] scrollbar-thin scrollbar-thumb-gray-200 p-1">
                            {Array.from({ length: 12 }, (_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  const d = new Date(calendarViewDate);
                                  d.setMonth(i);
                                  setCalendarViewDate(d);
                                  setShowMonthPicker(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-[11px] font-bold rounded-lg transition-colors capitalize ${i === calendarViewDate.getMonth() ? 'text-white bg-[#00C288]' : 'text-[#004975] hover:bg-gray-50'}`}
                              >
                                {format(new Date(2024, i, 1), 'MMMM', { locale: es })}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setCalendarViewDate(addMonths(calendarViewDate, 1))}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Day names */}
                    <div className="grid grid-cols-7 mb-2">
                      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => (
                        <div key={d} className="text-center text-[10px] font-black text-gray-300 uppercase">{d}</div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const monthStart = startOfMonth(calendarViewDate);
                        const monthEnd = endOfMonth(calendarViewDate);
                        const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
                        const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
                        const days = eachDayOfInterval({ start: calStart, end: calEnd });

                        return days.map(day => {
                          const isCurrentMonth = isSameMonth(day, calendarViewDate);
                          const isSelected = isSameDay(day, selectedDate);
                          const isTodayDay = isSameDay(day, new Date());

                          return (
                            <button
                              key={day.toISOString()}
                              onClick={() => {
                                setSelectedDate(day);
                                setIsCalendarOpen(false);
                              }}
                              className={`h-8 w-full rounded-lg text-xs font-bold transition-all ${
                                isSelected
                                  ? 'bg-[#00C288] text-white shadow-lg shadow-[#00C288]/30'
                                  : isTodayDay
                                    ? 'bg-[#00C288]/10 text-[#00C288] hover:bg-[#00C288]/20'
                                    : isCurrentMonth
                                      ? 'text-[#004975] hover:bg-gray-50'
                                      : 'text-gray-200'
                              }`}
                            >
                              {format(day, 'd')}
                            </button>
                          );
                        });
                      })()}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDate(new Date());
                        setIsCalendarOpen(false);
                      }}
                      className="mt-4 w-full py-2 bg-[#00C288]/10 text-[#00C288] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#00C288]/20 transition-colors"
                    >
                      Hoy
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Hoy shortcut (visible when not today) */}
            {!isSameDay(selectedDate, new Date()) && (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="text-[11px] font-black text-[#00C288] uppercase tracking-wider bg-[#00C288]/10 hover:bg-[#00C288]/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                Hoy
              </button>
            )}
          </div>

          {/* Week day strip */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => setSelectedDate(subDays(selectedDate, 7))}
              className="p-2 md:p-3 bg-white hover:bg-[#004975] hover:text-white hover:shadow-md rounded-xl border border-gray-200 transition-all text-gray-400 group shrink-0"
              title="Semana Anterior"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            <div ref={stripRef} className="flex flex-1 items-center gap-1.5 justify-center overflow-hidden">
              {Array.from({ length: visibleDays }, (_, i) => {
                const offset = Math.floor(visibleDays / 2);
                const day = addDays(startOfDay(selectedDate), i - offset);
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`flex flex-col items-center w-[60px] md:w-[68px] shrink-0 py-2 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-[#00C288] text-white border-[#00C288] shadow-md shadow-[#00C288]/20'
                        : isToday
                          ? 'bg-white text-[#004975] border-[#00C288]/40 hover:border-[#00C288] hover:shadow-sm'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-white/80' : isToday ? 'text-[#00C288]' : 'text-gray-400'}`}>
                      {format(day, "EEE", { locale: es })}
                    </span>
                    <span className={`text-lg font-black leading-tight ${isSelected ? 'text-white' : ''}`}>
                      {format(day, "d")}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                      {format(day, "MMM", { locale: es })}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              className="p-2 md:p-3 bg-white hover:bg-[#004975] hover:text-white hover:shadow-md rounded-xl border border-gray-200 transition-all text-gray-400 group shrink-0"
              title="Semana Siguiente"
            >
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {isDueno && (
            <button
              onClick={() => setIsExportOpen(true)}
              className="p-2.5 md:p-3.5 bg-white hover:bg-gray-50 text-[#004975] rounded-xl border border-gray-200 shadow-sm transition-colors"
              title="Exportar Agenda"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          {!isPodologo && (
            <button
              onClick={() => {
                setCitaEnEdicion(null);
                setIsDrawerOpen(true);
              }}
              className="w-full lg:w-auto bg-[#00C288] hover:bg-[#00ab78] text-white px-4 py-2.5 md:px-8 md:py-3.5 rounded-xl flex items-center justify-center gap-2 font-black text-xs md:text-sm tracking-wide shadow-md transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              NUEVO TURNO
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder="Buscar paciente o DNI..." 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00C288] outline-none transition-all placeholder:text-gray-400 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        {!isPodologo && (
          <select 
            className="w-full md:w-64 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#00C288] transition-colors font-medium text-gray-700"
            value={selectedEspecialista}
            onChange={(e) => setSelectedEspecialista(e.target.value)}
          >
            <option value="">Todos los especialistas</option>
            {podologos.map(p => (
              <option key={p.id} value={p.id}>{p.nombres}</option>
            ))}
          </select>
        )}
        <select 
          className="w-full md:w-64 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#00C288] transition-colors font-medium text-gray-700"
          value={selectedEstado}
          onChange={(e) => setSelectedEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="Programada">Programada</option>
          <option value="Confirmada">Confirmada</option>
          <option value="En Sala de Espera">En Sala de Espera</option>
          <option value="Atendida">Atendida</option>
          <option value="Cancelada">Cancelada</option>
          <option value="No Asistió">No Asistió</option>
          <option value="Sin Resolver">⚠️ Sin Resolver</option>
        </select>
      </div>

      {/* Promos activas para la fecha */}
      {promosActivas.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-1 -mt-4">
          {promosActivas.map(promo => {
            const Icon = promo.tipo.startsWith('pack_sesiones') ? Repeat : Package;
            const label = promo.precio_pack ? `S/ ${promo.precio_pack.toFixed(2)}` : '';
            const dateRange = promo.fecha_inicio && promo.fecha_fin
              ? `${format(new Date(promo.fecha_inicio + 'T12:00:00'), "d MMM", { locale: es })} - ${format(new Date(promo.fecha_fin + 'T12:00:00'), "d MMM", { locale: es })}`
              : promo.fecha_fin ? `Hasta ${format(new Date(promo.fecha_fin + 'T12:00:00'), "d MMM", { locale: es })}` : '';

            return (
              <div
                key={promo.id}
                className="flex items-center gap-2.5 bg-gradient-to-r from-[#00C288]/5 to-[#004975]/5 border border-[#00C288]/20 rounded-xl px-3 py-2 shrink-0"
              >
                <Icon className="w-4 h-4 text-[#00C288] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-[#004975] truncate">{promo.nombre}</p>
                  <p className="text-[9px] font-bold text-gray-400">
                    {label}{dateRange ? ` · ${dateRange}` : ''}
                    {promo.total_sesiones ? ` · ${promo.total_sesiones} sesiones` : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center px-2">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={isGlobalSearch}
              onChange={(e) => setIsGlobalSearch(e.target.checked)} 
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#00C288]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00C288] border border-gray-300 peer-checked:border-[#00C288]"></div>
          </div>
          <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors">Búsqueda Global (Mostrar historial y próximos turnos)</span>
        </label>
      </div>

      {/* Lista de Citas del Día */}
      {isLoading ? (
        <div className="flex justify-center py-32">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#00C288] rounded-full animate-spin" />
        </div>
      ) : (
        <CitasListPanel
          citas={citas}
          searchTerm={searchTerm}
          selectedEspecialista={selectedEspecialista}
          selectedEstado={selectedEstado}
          isGlobalSearch={isGlobalSearch}
          selectedDate={selectedDate}
          sucursalActiva={sucursalActiva}
          onEditCita={(cita) => {
            setCitaEnEdicion(cita);
            setIsDrawerOpen(true);
          }}
          onUpdateEstado={updateEstadoCita}
          onNavigateToAtender={(pacienteId, citaId) =>
            navigate(`/pacientes/${pacienteId}/historia?action=new_atencion&cita_id=${citaId}`)
          }
          onClearFilters={clearFilters}
        />
      )}


      <CitaDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onSuccess={fetchCitas}
        selectedDate={selectedDate}
        citaEnEdicion={citaEnEdicion}
      />

      {/* Modal Confirmar Cambio de Estado Irreversible */}
      {citaAConfirmar && (
        <div className="fixed inset-0 bg-[#004975]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setCitaAConfirmar(null)} 
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border ${citaAConfirmar.nuevoEstado === 'Cancelada' ? 'bg-red-50 border-red-100' : 'bg-slate-100 border-slate-200'}`}>
                <AlertTriangle className={`w-8 h-8 ${citaAConfirmar.nuevoEstado === 'Cancelada' ? 'text-red-500' : 'text-slate-600'}`} />
              </div>
              <h3 className="text-xl font-black text-[#004975] mb-2">
                ¿Marcar como '{citaAConfirmar.nuevoEstado}'?
              </h3>
              <p className="text-gray-500 font-bold text-sm mb-8">
                {citaAConfirmar.nuevoEstado === 'Cancelada' 
                  ? 'Esta acción liberará el horario del especialista para que pueda ser ocupado por otro paciente.'
                  : 'Esta acción dará por concluida la cita y cerrará el horario indicando que el paciente no se presentó.'}
              </p>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setCitaAConfirmar(null)}
                  className="flex-1 py-3.5 bg-gray-50 text-gray-600 hover:bg-gray-100 font-black rounded-xl border border-gray-200 transition-colors"
                >
                  Mantener
                </button>
                <button 
                  onClick={() => updateEstadoCita(citaAConfirmar.id, citaAConfirmar.nuevoEstado, true)}
                  className={`flex-1 py-3.5 text-white font-black rounded-xl shadow-md transition-all hover:-translate-y-0.5 ${citaAConfirmar.nuevoEstado === 'Cancelada' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-slate-700 hover:bg-slate-800 shadow-slate-900/20'}`}
                >
                  Sí, confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Exportar Agenda"
        columns={citaCsvColumns}
        fetchData={fetchExportCitas}
        filename={`agenda_${exportDesde}_${exportHasta}`}
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
          <label className="block text-xs font-bold text-[#004975] mb-1.5">Especialista</label>
          <select value={exportEspecialista} onChange={(e) => { setExportEspecialista(e.target.value); setExportFilterTrigger(n => n + 1); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium bg-gray-50 focus:ring-2 focus:ring-[#00C288] outline-none">
            <option value="">Todos</option>
            {podologos.map(p => <option key={p.id} value={p.id}>{p.nombres}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-[#004975] mb-1.5">Estado</label>
          <select value={exportEstado} onChange={(e) => { setExportEstado(e.target.value); setExportFilterTrigger(n => n + 1); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium bg-gray-50 focus:ring-2 focus:ring-[#00C288] outline-none">
            <option value="">Todos</option>
            <option value="Programada">Programada</option>
            <option value="Confirmada">Confirmada</option>
            <option value="En Sala de Espera">En Sala de Espera</option>
            <option value="Atendida">Atendida</option>
            <option value="Cancelada">Cancelada</option>
            <option value="No Asistió">No Asistió</option>
          </select>
        </div>
      </ExportModal>
    </div>
  );
}
