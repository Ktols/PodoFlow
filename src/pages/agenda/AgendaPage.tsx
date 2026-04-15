import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, User, Stethoscope, Edit, AlertTriangle, X, Search, Download, Gift } from 'lucide-react';
import { WhatsAppIcon } from '../../components/WhatsAppIcon';
import { supabase } from '../../lib/supabase';
import { format, addDays, subDays, addMonths, subMonths, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { CitaDrawer } from './components/CitaDrawer';
import { ExportModal } from '../../components/ExportModal';
import { CLINIC_INFO, SELLOS_PARA_GRATIS } from '../../config/clinicData';
import type { CsvColumn } from '../../lib/exportCsv';

export interface CitaList {
  id: string;
  paciente_id: string;
  podologo_id: string;
  fecha_cita: string;
  hora_cita: string;
  motivo: string;
  estado: string;
  pacientes: {
    nombres: string;
    apellidos: string;
    telefono: string | null;
    numero_documento: string | null;
    sellos?: number;
  };
  podologos: {
    nombres: string;
    color_etiqueta: string;
  };
  adelanto?: number;
  adelanto_metodo_pago?: string | null;
}

const ESTADOS_MAP: Record<string, { color: string, border: string }> = {
  'Programada': { color: 'bg-gray-100 text-gray-600', border: 'border-gray-200' },
  'Confirmada': { color: 'bg-[#00C288]/10 text-[#00C288]', border: 'border-[#00C288]/30' },
  'En Sala de Espera': { color: 'bg-orange-50 text-orange-600', border: 'border-orange-200' },
  'Atendida': { color: 'bg-[#004975]/10 text-[#004975]', border: 'border-[#004975]/30' },
  'Cancelada': { color: 'bg-red-50 text-red-600', border: 'border-red-200' },
  'No Asistió': { color: 'bg-slate-100 text-slate-600', border: 'border-slate-300' },
};

const ESTADOS_OPCIONES = ['Programada', 'Confirmada', 'En Sala de Espera', 'Cancelada', 'No Asistió'];

export function AgendaPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [citas, setCitas] = useState<CitaList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [citaEnEdicion, setCitaEnEdicion] = useState<CitaList | null>(null);
  const [citaAConfirmar, setCitaAConfirmar] = useState<{id: string, nuevoEstado: string} | null>(null);

  const [podologos, setPodologos] = useState<{id: string, nombres: string}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEspecialista, setSelectedEspecialista] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);

  // Export state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportDesde, setExportDesde] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [exportHasta, setExportHasta] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [exportEspecialista, setExportEspecialista] = useState('');
  const [exportEstado, setExportEstado] = useState('');
  const [exportFilterTrigger, setExportFilterTrigger] = useState(0);

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
      const { data } = await supabase.from('podologos').select('id, nombres').order('nombres');
      if (data) setPodologos(data);
    };
    fetchPodologos();
  }, []);

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
    fetchCitas();
  }, [selectedDate, isGlobalSearch]);

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

  const formatearHora = (horaFull: string) => {
    if (!horaFull) return '';
    const [hourStr, minStr] = horaFull.split(':');
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    const h12Pad = String(h12).padStart(2, '0');
    return `${h12Pad}:${minStr} ${ampm}`;
  };
  
  const formatPhone = (phone: string | null) => {
    if (!phone) return null;
    let p = phone.replace(/\D/g, '');
    if (p.length === 9) return `51${p}`;
    return p;
  };

  const enviarWhatsApp = (cita: CitaList) => {
    const wafmt = formatPhone(cita.pacientes.telefono);
    if (!wafmt) return;
    
    const nombre = cita.pacientes.nombres.split(' ')[0];
    const hora = formatearHora(cita.hora_cita);
    
    let mensaje = "";
    
    if (cita.estado === 'Cancelada') {
      mensaje = `Hola ${nombre}, te escribimos de ${CLINIC_INFO.nombre}.

Te confirmamos que tu cita de hoy a las ${hora} hrs ha sido cancelada en nuestro sistema.

Si deseas reprogramarla para otra fecha, puedes contactarnos al ${CLINIC_INFO.telefono}.

¡Gracias por avisarnos!`;
    } else {
      mensaje = `Hola ${nombre}, te saludamos de ${CLINIC_INFO.nombre}.

Queremos recordarte tu cita para hoy a las ${hora} hrs.

Ubicación: ${CLINIC_INFO.direccion}
Contacto: ${CLINIC_INFO.telefono}

${CLINIC_INFO.mensaje_pie}

¡Te esperamos!`;
    }

    const whatsappUrl = `https://wa.me/${wafmt}?text=${encodeURIComponent(mensaje)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header Calendario Activo */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-4 lg:p-6 flex flex-col lg:flex-row justify-between items-center gap-4 lg:gap-6">
        
        {/* Date Navigator */}
        <div className="flex flex-col w-full lg:w-auto lg:min-w-0 lg:flex-1 bg-gray-50/80 rounded-2xl p-2 border border-gray-100 overflow-hidden gap-2">
          {/* Month selector */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setSelectedDate(subMonths(selectedDate, 1))}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-[#004975]"
              title="Mes Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-black text-[#004975] capitalize tracking-wide">
              {format(selectedDate, "MMMM yyyy", { locale: es })}
            </span>
            <button
              onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-[#004975]"
              title="Mes Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Hoy shortcut */}
          {!isSameDay(selectedDate, new Date()) && (
            <button
              onClick={() => setSelectedDate(new Date())}
              className="self-center text-[11px] font-black text-[#00C288] uppercase tracking-wider bg-[#00C288]/10 hover:bg-[#00C288]/20 px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Ir a hoy
            </button>
          )}

          {/* Week day strip */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(subDays(selectedDate, 7))}
              className="p-3 bg-white hover:bg-[#004975] hover:text-white hover:shadow-md hover:scale-105 rounded-xl border border-gray-200 transition-all text-gray-400 group shrink-0"
              title="Semana Anterior"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            <div className="flex flex-1 items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {Array.from({ length: 7 }, (_, i) => {
                const day = addDays(startOfDay(selectedDate), i - 3);
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`flex flex-col items-center flex-1 py-2 rounded-xl border transition-all min-w-[44px] ${
                      isSelected
                        ? 'bg-[#00C288] text-white border-[#00C288] shadow-md shadow-[#00C288]/20 scale-105'
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
              className="p-3 bg-white hover:bg-[#004975] hover:text-white hover:shadow-md hover:scale-105 rounded-xl border border-gray-200 transition-all text-gray-400 group shrink-0"
              title="Semana Siguiente"
            >
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsExportOpen(true)}
            className="p-3.5 bg-white hover:bg-gray-50 text-[#004975] rounded-xl border border-gray-200 shadow-sm transition-colors"
            title="Exportar Agenda"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setCitaEnEdicion(null);
              setIsDrawerOpen(true);
            }}
            className="w-full lg:w-auto bg-[#00C288] hover:bg-[#00ab78] text-white px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 font-black tracking-wide shadow-md transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            NUEVO TURNO
          </button>
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

      {/* Grid Iterador de Citas Diarias */}
      {isLoading ? (
        <div className="flex justify-center py-32">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#00C288] rounded-full animate-spin" />
        </div>
      ) : (() => {
        // Shared Time Context for Filters & Render
        const now = new Date();
        const minHoy = now.getHours() * 60 + now.getMinutes();
        const todayDateStr = format(now, 'yyyy-MM-dd');
        const isToday = format(selectedDate, 'yyyy-MM-dd') === todayDateStr;

        const citasFiltradas = citas.filter(cita => {
          const searchMatch = searchTerm === '' || 
            `${cita.pacientes.nombres} ${cita.pacientes.apellidos} ${cita.pacientes.numero_documento || ''}`
            .toLowerCase().includes(searchTerm.toLowerCase());
          const espMatch = selectedEspecialista === '' || cita.podologo_id === selectedEspecialista;
          
          let estMatch = true;
          if (selectedEstado === 'Sin Resolver') {
              const esEstadoFinal = cita.estado === 'Atendida' || cita.estado === 'Cancelada' || cita.estado === 'No Asistió';
              const [cY, cM, cD] = cita.fecha_cita.split('-').map(Number);
              const fechaCita = new Date(cY, cM - 1, cD);
              const isOldDay = fechaCita < new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const isTodayAccurate = fechaCita.getTime() === new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
              const [hC, mC] = cita.hora_cita.split(':').map(Number);
              const minutosCita = hC * 60 + mC;
              const isExpiredHour = isTodayAccurate && (minutosCita + 60 < minHoy);
              const esTurnoFantasma = (isOldDay || isExpiredHour) && !esEstadoFinal;
              estMatch = esTurnoFantasma;
          } else {
              estMatch = selectedEstado === '' || cita.estado === selectedEstado;
          }

          return searchMatch && espMatch && estMatch;
        });
        
        const isFiltering = searchTerm !== '' || selectedEspecialista !== '' || selectedEstado !== '';
        
        let renderCitas = [...citasFiltradas];
        
        if (!isGlobalSearch && isToday) {
          const grupoA = renderCitas.filter(c => {
            const [h, m] = c.hora_cita.split(':').map(Number);
            return (h * 60 + m) >= minHoy - 30; // En curso o futuras
          });
          const grupoB = renderCitas.filter(c => {
            const [h, m] = c.hora_cita.split(':').map(Number);
            return (h * 60 + m) < minHoy - 30; // Pasadas
          });
          renderCitas = [...grupoA, ...grupoB];
        }

        if (citasFiltradas.length === 0) {
          return (
            <div className="text-center py-24 bg-white/50 rounded-3xl border border-gray-200 shadow-sm border-dashed">
              <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-5 opacity-50" />
              <h3 className="text-2xl font-black text-[#004975] mb-2 tracking-tight">Sin coincidencias</h3>
              <p className="text-gray-500 font-bold max-w-sm mx-auto">No hay citas que coincidan con los filtros de búsqueda aplicados.</p>
              {isFiltering && (
                <button 
                  onClick={() => { setSearchTerm(''); setSelectedEspecialista(''); setSelectedEstado(''); }}
                  className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-bold transition-colors inline-flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Limpiar Filtros
                </button>
              )}
            </div>
          );
        }

        return (
          <>
            {isFiltering && (
              <div className="flex justify-between items-center px-2">
                <span className="text-sm font-bold text-gray-500">Mostrando {citasFiltradas.length} resultados filtrados</span>
                <button 
                  onClick={() => { setSearchTerm(''); setSelectedEspecialista(''); setSelectedEstado(''); }}
                  className="text-sm font-bold text-[#004975] hover:text-[#00C288] transition-colors flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Limpiar filtros
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 gap-5">
              {renderCitas.map((cita) => {
                const wafmt = formatPhone(cita.pacientes.telefono);
                const style = ESTADOS_MAP[cita.estado] || ESTADOS_MAP['Programada'];
                const esEstadoFinal = cita.estado === 'Atendida' || cita.estado === 'Cancelada' || cita.estado === 'No Asistió';
                
                const [hC, mC] = cita.hora_cita.split(':').map(Number);
                const minutosCita = hC * 60 + mC;
                const isPasada = isToday && !isGlobalSearch && (minutosCita < minHoy - 30) && !esEstadoFinal;
                const enCurso = isToday && !isGlobalSearch && (minHoy >= minutosCita && minHoy < minutosCita + 30) && !esEstadoFinal;

                // Phantom Turn Logic
                const [cY, cM, cD] = cita.fecha_cita.split('-').map(Number);
                const fechaCita = new Date(cY, cM - 1, cD);
                const isOldDay = fechaCita < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const isTodayAccurate = fechaCita.getTime() === new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                const isExpiredHour = isTodayAccurate && (minutosCita + 60 < minHoy);
                const esTurnoFantasma = (isOldDay || isExpiredHour) && !esEstadoFinal;

                return (
                  <div 
                    key={cita.id} 
                    className={`rounded-2xl border shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] p-5 lg:p-6 hover:shadow-lg transition-all relative overflow-hidden flex flex-col xl:flex-row gap-4 xl:gap-8 items-start xl:items-center ${esEstadoFinal ? 'opacity-75 bg-gray-50 ' + style.border : esTurnoFantasma ? 'bg-red-50 border-red-500 ring-1 ring-red-500' : isPasada ? ('opacity-60 bg-gray-50 grayscale-[0.3] ' + style.border) : ('bg-white ' + style.border)} ${enCurso ? 'ring-2 ring-[#00C288] ring-offset-2' : ''}`}
                  >
                {/* Timeline Color bar */}
                <div className={`absolute left-0 inset-y-0 w-2.5 ${style.color.split(' ')[0]}`} />

                {/* Hora Analógica */}
                <div className="flex flex-row items-center gap-3 ml-3 xl:w-36 shrink-0">
                  <div className={`p-2.5 rounded-xl ${style.color}`}>
                    <Clock className="w-6 h-6 border-transparent" />
                  </div>
                  <div className="flex flex-col justify-center">
                    {esTurnoFantasma && (
                      <span className="text-[10px] font-black text-white bg-red-500 uppercase tracking-wider mb-1 px-2 py-0.5 rounded-full w-fit shadow-sm flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Sin Resolver
                      </span>
                    )}
                    {enCurso && (
                      <span className="text-[10px] font-black text-white bg-[#00C288] uppercase tracking-wider mb-1 px-2 py-0.5 rounded-full w-fit animate-pulse shadow-sm">
                        En Curso
                      </span>
                    )}
                    {isGlobalSearch && (
                      <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                        {(() => {
                          const [year, month, day] = cita.fecha_cita.split('-');
                          const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                          return format(d, "EEE d MMM", { locale: es });
                        })()}
                      </span>
                    )}
                    <span className="text-2xl font-black text-[#004975] tracking-tighter whitespace-nowrap leading-none">{formatearHora(cita.hora_cita)}</span>
                  </div>
                </div>

                {/* Patient Context Bundle */}
                <div className="flex-1 min-w-0 bg-gray-50/50 p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-2">
                    <User className="w-5 h-5 text-[#00C288]" />
                    <h4 className="text-lg font-black text-[#004975] truncate">
                      {cita.pacientes.nombres} {cita.pacientes.apellidos}
                    </h4>
                  </div>
                  <p className="text-sm font-bold text-gray-500 pl-7 truncate pr-4">{cita.motivo}</p>
                  
                  {cita.podologos && (
                    <div className="flex items-center gap-1.5 mt-3 pl-7 flex-wrap">
                      <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border shadow-sm"
                        style={{
                          backgroundColor: `${cita.podologos.color_etiqueta}12`,
                          color: cita.podologos.color_etiqueta,
                          borderColor: `${cita.podologos.color_etiqueta}30`
                        }}
                      >
                        <Stethoscope className="w-4 h-4" />
                        <span>Atiende: {cita.podologos.nombres}</span>
                      </div>
                      {Number(cita.adelanto || 0) > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border shadow-sm bg-[#00C288]/10 text-[#00C288] border-[#00C288]/20">
                          Adelanto: S/ {Number(cita.adelanto).toFixed(2)}
                          {cita.adelanto_metodo_pago && <span className="text-[9px] font-bold text-[#004975]/50 normal-case">({cita.adelanto_metodo_pago})</span>}
                        </div>
                      )}
                      {Number(cita.pacientes.sellos || 0) >= SELLOS_PARA_GRATIS && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border shadow-sm bg-gradient-to-r from-[#00C288] to-[#00ab78] text-white border-[#00C288] animate-pulse">
                          <Gift className="w-3.5 h-3.5" />
                          Visita Gratis Disponible
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Native Actions (WhatsApp) */}
                <div className="flex items-center gap-3 shrink-0">
                  <button 
                    onClick={() => {
                      setCitaEnEdicion(cita);
                      setIsDrawerOpen(true);
                    }}
                    disabled={esEstadoFinal}
                    className={`flex justify-center items-center w-11 h-11 rounded-xl border shadow-sm transition-all ${
                      esEstadoFinal 
                        ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed' 
                        : 'bg-gray-50 text-gray-400 hover:text-[#004975] hover:bg-blue-50 border-gray-200 hover:border-blue-100 hover:-translate-y-0.5'
                    }`}
                    title={esEstadoFinal ? "Edición bloqueada" : "Editar Turno"}
                  >
                    <Edit className="w-5 h-5" />
                  </button>

                  {cita.estado === 'En Sala de Espera' ? (
                    <button 
                      onClick={() => navigate(`/pacientes/${cita.paciente_id}/historia?action=new_atencion&cita_id=${cita.id}`)}
                      className="flex items-center justify-center gap-2 bg-[#00C288] text-white hover:bg-[#00ab78] px-5 py-2.5 hover:-translate-y-0.5 rounded-xl transition-all font-black tracking-wide shadow-md"
                      title="Atender Paciente"
                    >
                      <Stethoscope className="w-5 h-5" />
                      Atender
                    </button>
                  ) : cita.estado === 'Atendida' ? (
                    <span className="text-[10px] font-black text-gray-400 px-5 py-3 bg-gray-50 rounded-xl border border-gray-200 shadow-sm uppercase tracking-widest text-center" title="Paciente Atendido">
                      En Clínica
                    </span>
                  ) : wafmt ? (
                    <button 
                      onClick={() => enviarWhatsApp(cita)}
                      className="flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#075E54] hover:bg-[#25D366]/20 border border-[#25D366]/20 px-5 py-2.5 hover:-translate-y-0.5 rounded-xl transition-all font-black tracking-wide shadow-sm"
                    >
                      <WhatsAppIcon className="w-5 h-5 text-[#25D366] group-hover:scale-110 transition-transform" />
                      Notificar
                    </button>
                  ) : (
                    <span className="text-[10px] font-black text-gray-400 px-5 py-3 bg-gray-50 rounded-xl border border-gray-200 shadow-sm uppercase tracking-widest">Sin Celular</span>
                  )}
                </div>

                {/* Native Dropdown Fases */}
                <div className="relative shrink-0 w-full xl:w-56" onClick={(e) => e.stopPropagation()}>
                  <div className={`relative rounded-xl border shadow-sm ${style.color} ${style.border} ${!esEstadoFinal ? 'transition-all hover:scale-[1.02]' : 'opacity-80'}`}>
                    <select
                      value={cita.estado}
                      disabled={esEstadoFinal}
                      onChange={(e) => updateEstadoCita(cita.id, e.target.value)}
                      className={`w-full appearance-none bg-transparent px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] outline-none ${esEstadoFinal ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {ESTADOS_OPCIONES.map((opc) => (
                        <option key={opc} value={opc} className="text-gray-900 bg-white font-bold">
                          {opc}
                        </option>
                      ))}
                      {cita.estado === 'Atendida' && (
                        <option value="Atendida" className="text-gray-900 bg-white font-bold">
                          Atendida
                        </option>
                      )}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5">
                      <span className="text-xs opacity-70 divide-x divide-transparent">▼</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    )})()}

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
            <input type="date" value={exportDesde} onChange={(e) => { setExportDesde(e.target.value); setExportFilterTrigger(n => n + 1); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium bg-gray-50 focus:ring-2 focus:ring-[#00C288] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#004975] mb-1.5">Hasta</label>
            <input type="date" value={exportHasta} onChange={(e) => { setExportHasta(e.target.value); setExportFilterTrigger(n => n + 1); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium bg-gray-50 focus:ring-2 focus:ring-[#00C288] outline-none" />
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
