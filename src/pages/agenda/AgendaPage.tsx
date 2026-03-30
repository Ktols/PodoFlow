import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, User, Stethoscope, Edit } from 'lucide-react';
import { WhatsAppIcon } from '../../components/WhatsAppIcon';
import { supabase } from '../../lib/supabase';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { CitaDrawer } from './components/CitaDrawer';
import { CLINIC_INFO } from '../../config/clinicData';

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
  };
  podologos: {
    nombres: string;
    color_etiqueta: string;
  };
}

const ESTADOS_MAP: Record<string, { color: string, border: string }> = {
  'Programada': { color: 'bg-gray-100 text-gray-600', border: 'border-gray-200' },
  'Confirmada': { color: 'bg-[#00C288]/10 text-[#00C288]', border: 'border-[#00C288]/30' },
  'En Sala de Espera': { color: 'bg-orange-50 text-orange-600', border: 'border-orange-200' },
  'Atendida': { color: 'bg-[#004975]/10 text-[#004975]', border: 'border-[#004975]/30' },
  'Cancelada': { color: 'bg-red-50 text-red-600', border: 'border-red-200' },
};

const ESTADOS_OPCIONES = ['Programada', 'Confirmada', 'En Sala de Espera', 'Atendida', 'Cancelada'];

export function AgendaPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [citas, setCitas] = useState<CitaList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [citaEnEdicion, setCitaEnEdicion] = useState<CitaList | null>(null);

  const fetchCitas = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    // Cross join Citas with Pacientes via Supabase
    const { data, error } = await supabase
      .from('citas')
      .select(`
        *,
        pacientes (
          nombres,
          apellidos,
          telefono
        ),
        podologos (
          nombres,
          color_etiqueta
        )
      `)
      .eq('fecha_cita', dateStr)
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
  }, [selectedDate]);

  const updateEstadoCita = async (id: string, nuevoEstado: string) => {
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
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-4 md:p-6 flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Date Navigator */}
        <div className="flex w-full md:w-auto items-center justify-between md:justify-start gap-3 bg-gray-50/80 rounded-2xl p-2 border border-gray-100">
          <button 
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            className="p-3 bg-white hover:bg-[#004975] hover:text-white hover:shadow-md hover:scale-105 rounded-xl border border-gray-200 transition-all text-gray-400 group"
            title="Día Anterior"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          
          <div className="px-6 py-2.5 flex items-center justify-center gap-4 bg-white shadow-sm rounded-xl border border-gray-200 min-w-[200px]">
            <CalendarIcon className="w-6 h-6 text-[#00C288]" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[15px] font-black text-[#004975] uppercase tracking-wider">
                {format(selectedDate, "EEEE d", { locale: es })}
              </span>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                 {format(selectedDate, "MMMM, yyyy", { locale: es })}
              </span>
            </div>
          </div>

          <button 
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="p-3 bg-white hover:bg-[#004975] hover:text-white hover:shadow-md hover:scale-105 rounded-xl border border-gray-200 transition-all text-gray-400 group"
            title="Día Siguiente"
          >
            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Global Actions */}
        <button 
          onClick={() => {
            setCitaEnEdicion(null);
            setIsDrawerOpen(true);
          }}
          className="w-full md:w-auto bg-[#00C288] hover:bg-[#00ab78] text-white px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 font-black tracking-wide shadow-md transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          NUEVO TURNO
        </button>
      </div>

      {/* Grid Iterador de Citas Diarias */}
      {isLoading ? (
        <div className="flex justify-center py-32">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#00C288] rounded-full animate-spin" />
        </div>
      ) : citas.length === 0 ? (
        <div className="text-center py-24 bg-white/50 rounded-3xl border border-gray-200 shadow-sm border-dashed">
          <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-5 opacity-50" />
          <h3 className="text-2xl font-black text-[#004975] mb-2 tracking-tight">Agenda Diaria Vacía</h3>
          <p className="text-gray-500 font-bold max-w-sm mx-auto">No existen pacientes agendados para este turno horario específico.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {citas.map((cita) => {
            const wafmt = formatPhone(cita.pacientes.telefono);
            const style = ESTADOS_MAP[cita.estado] || ESTADOS_MAP['Programada'];

            return (
              <div 
                key={cita.id} 
                className={`bg-white rounded-2xl border ${style.border} shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] p-5 md:p-6 hover:shadow-lg transition-all relative overflow-hidden flex flex-col md:flex-row gap-5 md:gap-8 items-start md:items-center`}
              >
                {/* Timeline Color bar */}
                <div className={`absolute left-0 inset-y-0 w-2.5 ${style.color.split(' ')[0]}`} />

                {/* Hora Analógica */}
                <div className="flex flex-row items-center gap-3 ml-3 md:w-36 shrink-0">
                  <div className={`p-2.5 rounded-xl ${style.color}`}>
                    <Clock className="w-6 h-6 border-transparent" />
                  </div>
                  <span className="text-2xl font-black text-[#004975] tracking-tighter whitespace-nowrap">{formatearHora(cita.hora_cita)}</span>
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
                    <div className="flex items-center gap-1.5 mt-3 pl-7">
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
                    className="flex justify-center items-center w-11 h-11 rounded-xl bg-gray-50 text-gray-400 hover:text-[#004975] hover:bg-blue-50 border border-gray-200 hover:border-blue-100 shadow-sm transition-all hover:-translate-y-0.5"
                    title="Editar Turno"
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
                <div className="relative shrink-0 w-full md:w-56" onClick={(e) => e.stopPropagation()}>
                  <div className={`relative rounded-xl border transition-all hover:scale-[1.02] shadow-sm ${style.color} ${style.border}`}>
                    <select
                      value={cita.estado}
                      onChange={(e) => updateEstadoCita(cita.id, e.target.value)}
                      className="w-full appearance-none bg-transparent px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] outline-none cursor-pointer"
                    >
                      {ESTADOS_OPCIONES.map((opc) => (
                        <option key={opc} value={opc} className="text-gray-900 bg-white font-bold">
                          {opc}
                        </option>
                      ))}
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
      )}

      {/* Global Modals */}
      <CitaDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onSuccess={fetchCitas}
        selectedDate={selectedDate}
        citaEnEdicion={citaEnEdicion}
      />
    </div>
  );
}
