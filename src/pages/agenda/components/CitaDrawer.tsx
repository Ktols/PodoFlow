import { useState, useEffect, useRef } from 'react';
import { X, Search, AlertTriangle, Plus, Clock, DollarSign, History, Package, Repeat } from 'lucide-react';
import { PacienteDrawer } from '../../pacientes/components/PacienteDrawer';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { citaSchema, type CitaFormValues } from '../schemas/citaSchema';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CitaList, Paciente, Pack } from '../../../types/entities';
import { useBranchStore } from '../../../stores/branchStore';
import type { AtencionRow } from '../../../types/agenda';
import { TIME_OPTIONS } from '../../../constants';
import { DatePicker } from '../../../components/DatePicker';
import { PaymentMethodPicker } from '../../../components/PaymentMethodPicker';

interface PacienteMin {
  id: string;
  nombres: string;
  apellidos: string;
  numero_documento: string;
}

interface PodologoMin {
  id: string;
  nombres: string;
  color_etiqueta: string;
  especialidad?: string;
}

interface CitaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  selectedDate?: Date;
  citaEnEdicion?: CitaList | null;
}

const getSmartInitialTime = (dateStr: string) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (dateStr === todayStr) {
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    for (const option of TIME_OPTIONS) {
      const [h, m] = option.value.split(':').map(Number);
      const optTotalMinutes = h * 60 + m;
      if (optTotalMinutes > currentTotalMinutes) {
        return option.value;
      }
    }
    return ''; // Pasada la última hora de operación
  }
  return '09:00'; // Futuro o por defecto
};

export function CitaDrawer({ isOpen, onClose, onSuccess, selectedDate, citaEnEdicion }: CitaDrawerProps) {
  const { sucursalActiva } = useBranchStore();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, control, reset } = useForm<CitaFormValues>({
    resolver: zodResolver(citaSchema),
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [pacientes, setPacientes] = useState<PacienteMin[]>([]);
  const [podologos, setPodologos] = useState<PodologoMin[]>([]);
  const [serviciosList, setServiciosList] = useState<{ id: string, nombre: string }[]>([]);

  // Patient history context
  interface VisitaResumen {
    created_at: string;
    motivo_consulta: string;
    tratamientos_realizados: string[];
    especialista: string;
  }
  interface PatientHistoryData {
    totalVisitas: number;
    ultimaVisita: string | null;
    tratamientosFrecuentes: string[];
    ultimasVisitas: VisitaResumen[];
    alertas: { diabetes?: boolean; hipertension?: boolean; enfermedad_vascular?: boolean; tratamiento_oncologico?: boolean; alergias_detalle?: string | null };
  }
  const [patientHistory, setPatientHistory] = useState<PatientHistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [adelantoReferencia, setAdelantoReferencia] = useState('');
  const [packsDisponibles, setPacksDisponibles] = useState<Pack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [pacienteCreditos, setPacienteCreditos] = useState<Record<string, { usadas: number; total: number }>>({});
  const wrapperRef = useRef<HTMLDivElement>(null);

  // useWatch en lugar de watch() → re-render aislado por campo (sub-usewatch-over-watch)
  const selectedPacienteId = useWatch({ control, name: 'paciente_id', defaultValue: '' });
  const watchedFechaCita = useWatch({ control, name: 'fecha_cita', defaultValue: '' });
  const watchedAdelantoMetodo = useWatch({ control, name: 'adelanto_metodo_pago', defaultValue: '' });
  const watchedServicios = useWatch({ control, name: 'servicios_preseleccionados' }) as string[] | undefined;
  const selectedPaciente = pacientes.find(p => p.id === selectedPacienteId);

  // Fetch patient history when selected
  useEffect(() => {
    if (!selectedPacienteId) { setPatientHistory(null); return; }
    const fetchHistory = async () => {
      setHistoryLoading(true);
      // Fetch patient alerts
      const { data: pacData } = await supabase
        .from('pacientes')
        .select('diabetes, hipertension, enfermedad_vascular, tratamiento_oncologico, alergias_detalle')
        .eq('id', selectedPacienteId)
        .single();

      // Fetch atenciones with specialist info
      const { data: atencionesData } = await supabase
        .from('atenciones')
        .select('created_at, motivo_consulta, tratamientos_realizados, podologos(nombres)')
        .eq('paciente_id', selectedPacienteId)
        .order('created_at', { ascending: false })
        .limit(20);

      const totalVisitas = atencionesData?.length || 0;
      const ultimaVisita = atencionesData?.[0]?.created_at || null;

      // Count tratamientos frequency
      const freq: Record<string, number> = {};
      (atencionesData as AtencionRow[] | null)?.forEach((a) => {
        (a.tratamientos_realizados || []).forEach((t: string) => { freq[t] = (freq[t] || 0) + 1; });
      });
      const tratamientosFrecuentes = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);

      const ultimasVisitas: VisitaResumen[] = ((atencionesData as AtencionRow[] | null) || []).slice(0, 5).map((a) => ({
        created_at: a.created_at,
        motivo_consulta: a.motivo_consulta,
        tratamientos_realizados: a.tratamientos_realizados || [],
        especialista: a.podologos?.nombres || '',
      }));

      setPatientHistory({
        totalVisitas,
        ultimaVisita,
        tratamientosFrecuentes,
        ultimasVisitas,
        alertas: pacData || {},
      });
      setHistoryLoading(false);
    };
    fetchHistory();
  }, [selectedPacienteId]);

  // Fetch créditos activos del paciente seleccionado
  useEffect(() => {
    if (!selectedPacienteId || !sucursalActiva?.id) { setPacienteCreditos({}); return; }
    const fetchCreditos = async () => {
      const { data } = await supabase
        .from('pack_creditos')
        .select('pack_id, sesiones_usadas, sesiones_total')
        .eq('paciente_id', selectedPacienteId)
        .eq('estado', 'activo')
        .eq('sucursal_id', sucursalActiva.id);
      if (data) {
        const map: Record<string, { usadas: number; total: number }> = {};
        data.forEach((c: { pack_id: string; sesiones_usadas: number; sesiones_total: number }) => {
          map[c.pack_id] = { usadas: c.sesiones_usadas, total: c.sesiones_total };
        });
        setPacienteCreditos(map);
      }
    };
    fetchCreditos();
  }, [selectedPacienteId, sucursalActiva?.id]);

  // Mantiene sincronizada la hora cuando cambia la fecha
  useEffect(() => {
    if (isOpen && !citaEnEdicion && watchedFechaCita) {
      setValue('hora_cita', getSmartInitialTime(watchedFechaCita), { shouldValidate: true });
    }
  }, [watchedFechaCita, isOpen, citaEnEdicion, setValue]);

  const handleNewPatientCreated = (newPatientData: Paciente) => {
    // Add to pacientes list so it resolves selectedPaciente correctly
    setPacientes([{
      id: newPatientData.id,
      nombres: newPatientData.nombres,
      apellidos: newPatientData.apellidos,
      numero_documento: newPatientData.numero_documento
    }]);

    // Set form value and clear search input
    setValue('paciente_id', newPatientData.id, { shouldValidate: true });
    setSearchTerm('');
    setShowResults(false);
    setIsNewPatientModalOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      if (citaEnEdicion) {
        reset({
          paciente_id: citaEnEdicion.paciente_id,
          podologo_id: citaEnEdicion.podologo_id,
          fecha_cita: citaEnEdicion.fecha_cita,
          hora_cita: citaEnEdicion.hora_cita.substring(0, 5),
          motivo: citaEnEdicion.motivo,
          servicios_preseleccionados: (citaEnEdicion as CitaList & { servicios_preseleccionados?: string[] }).servicios_preseleccionados ?? [],
          adelanto: (citaEnEdicion as CitaList & { adelanto?: number }).adelanto != null
            ? String((citaEnEdicion as CitaList & { adelanto?: number }).adelanto)
            : '',
          adelanto_metodo_pago: (citaEnEdicion as CitaList & { adelanto_metodo_pago?: string }).adelanto_metodo_pago ?? '',
        });

        // Add to pacientes mock to resolve selected state instantly
        setPacientes([{
          id: citaEnEdicion.paciente_id,
          nombres: citaEnEdicion.pacientes.nombres,
          apellidos: citaEnEdicion.pacientes.apellidos,
          numero_documento: 'En Edición'
        }]);
      } else {
        const d = selectedDate || new Date();
        const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        reset({
          paciente_id: '',
          podologo_id: '',
          fecha_cita: localDate,
          hora_cita: getSmartInitialTime(localDate),
          motivo: '',
          servicios_preseleccionados: [],
          adelanto: '',
          adelanto_metodo_pago: '',
        });
        setPacientes([]);
      }
      setSearchTerm('');
      setValidationError(null);
      setAdelantoReferencia('');
      setSelectedPackId((citaEnEdicion as CitaList & { pack_id?: string })?.pack_id || null);

      const fetchPodologos = async () => {
        if (!sucursalActiva?.id) return;
        const { data } = await supabase
          .from('podologos')
          .select('id, nombres, especialidad, color_etiqueta, sucursal_podologos!inner(sucursal_id)')
          .eq('sucursal_podologos.sucursal_id', sucursalActiva.id)
          .eq('estado', true);
        if (data) setPodologos(data as PodologoMin[]);
      };
      const fetchServicios = async () => {
        if (!sucursalActiva?.id) return;
        const { data } = await supabase.from('servicios').select('id, nombre').eq('estado', true).eq('sucursal_id', sucursalActiva.id).order('nombre');
        if (data) setServiciosList(data);
      };

      const fetchPacks = async () => {
        if (!sucursalActiva?.id) return;
        const { data } = await supabase
          .from('packs_promociones')
          .select(`id, nombre, tipo, precio_pack, descuento_porcentaje, descuento_monto, total_sesiones, fecha_inicio, fecha_fin, stock_total, stock_usado, pack_items (id, servicio_id, producto_id, cantidad, servicios:servicio_id (id, nombre, precio_base), productos:producto_id (id, nombre, precio))`)
          .eq('sucursal_id', sucursalActiva.id)
          .eq('estado', true);
        if (data) {
          const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
          const vigentes = (data as unknown as Pack[]).filter(p => {
            if (p.fecha_inicio && p.fecha_inicio > dateStr) return false;
            if (p.fecha_fin && p.fecha_fin < dateStr) return false;
            if (p.stock_total && (p.stock_usado || 0) >= p.stock_total) return false;
            return true;
          });
          setPacksDisponibles(vigentes);
        }
      };

      fetchPodologos();
      fetchServicios();
      fetchPacks();
    }
  }, [isOpen, selectedDate, reset, citaEnEdicion]);

  // Cerrar Autocomplete de Pacientes onClick outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Buscador asíncrono Supabase (Debounce)
  useEffect(() => {
    const fetchPacientes = async () => {
      if (searchTerm.length < 2) {
        if (!selectedPacienteId) setPacientes([]);
        return;
      }
      setIsSearching(true);
      const { data, error } = await supabase
        .from('pacientes')
        .select('id, nombres, apellidos, numero_documento')
        .or(`nombres.ilike.%${searchTerm}%,apellidos.ilike.%${searchTerm}%,numero_documento.ilike.%${searchTerm}%`)
        .limit(10);

      if (!error && data) {
        setPacientes(data);
      }
      setIsSearching(false);
    };

    const debounce = setTimeout(fetchPacientes, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const onSubmit = async (data: CitaFormValues) => {
    try {
      setValidationError(null); // Clear previous errors

      // 1. Time Travel Validation (Sólo nuevos turnos)
      if (!citaEnEdicion) {
        const [year, month, day] = data.fecha_cita.split('-').map(Number);
        const [hours, minutes] = data.hora_cita.split(':').map(Number);
        const citaDate = new Date(year, month - 1, day, hours, minutes);

        if (citaDate < new Date()) {
          setValidationError("No puedes agendar nuevos turnos en horarios que ya pasaron.");
          return; // Stop execution
        }
      }

      // 2. Regla Concurrente (Sólo si hay especialista asignado)
      if (data.podologo_id) {
        let qEspecialista = supabase.from('citas').select('id')
          .eq('fecha_cita', data.fecha_cita)
          .eq('hora_cita', data.hora_cita)
          .eq('podologo_id', data.podologo_id)
          .neq('estado', 'Cancelada')
          .neq('estado', 'CANCELADA');

        if (citaEnEdicion) {
          qEspecialista = qEspecialista.neq('id', citaEnEdicion.id);
        }

        const { data: resEspecialista, error: especialistaError } = await qEspecialista;

        if (especialistaError) throw especialistaError;

        if (resEspecialista && resEspecialista.length > 0) {
          setValidationError("Error: El especialista asignado ya tiene un turno a esa hora. Elija otra hora u otro especialista.");
          return;
        }
      }

      if (citaEnEdicion) {
        const adelantoVal = parseFloat(data.adelanto || '0') || 0;
        const { error } = await supabase.from('citas').update({
          podologo_id: data.podologo_id || null,
          fecha_cita: data.fecha_cita,
          hora_cita: data.hora_cita,
          motivo: data.motivo || '',
          servicios_preseleccionados: data.servicios_preseleccionados || [],
          adelanto: adelantoVal,
          adelanto_metodo_pago: adelantoVal > 0 ? (data.adelanto_metodo_pago || 'Efectivo') : null,
          sucursal_id: sucursalActiva?.id,
          pack_id: selectedPackId || null,
        }).eq('id', citaEnEdicion.id);

        if (error) throw error;
        toast.success('Turno actualizado de manera exitosa');
      } else {
        const adelantoVal = parseFloat(data.adelanto || '0') || 0;
        const { error } = await supabase.from('citas').insert([{
          paciente_id: data.paciente_id,
          podologo_id: data.podologo_id || null,
          fecha_cita: data.fecha_cita,
          hora_cita: data.hora_cita,
          motivo: data.motivo || '',
          estado: 'Programada',
          servicios_preseleccionados: data.servicios_preseleccionados || [],
          adelanto: adelantoVal,
          adelanto_metodo_pago: adelantoVal > 0 ? (data.adelanto_metodo_pago || 'Efectivo') : null,
          sucursal_id: sucursalActiva?.id,
          pack_id: selectedPackId || null,
        }]);

        if (error) throw error;
        toast.success('Cita programada con éxito en la Agenda');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error('Ocurrió un error al agendar la cita');
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9999] !m-0">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={onClose} />

        <div className="absolute right-0 inset-y-0 w-full md:w-[500px] lg:max-w-lg bg-white shadow-2xl z-[10000] transform transition-transform duration-300 flex flex-col animate-in slide-in-from-right">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-xl font-black text-[#004975]">{citaEnEdicion ? 'Editar Turno' : 'Nuevo Turno Agenda'}</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors group">
              <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">
            {validationError && (
              <div className="mb-6 bg-orange-50/80 border border-orange-200 text-orange-800 p-4 rounded-xl flex items-start gap-3 animate-in zoom-in-95 duration-200 shadow-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-orange-500" />
                <p className="text-[13px] font-bold leading-relaxed">{validationError}</p>
              </div>
            )}
            <form id="cita-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              {/* Buscador Autocompletado Supabase */}
              <div className="relative" ref={wrapperRef}>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-[#004975]">Seleccionar Paciente <span className="text-red-500">*</span></label>
                  {!citaEnEdicion && (
                    <button
                      type="button"
                      onClick={() => setIsNewPatientModalOpen(true)}
                      className="text-[11px] font-black uppercase text-[#00C288] hover:text-white bg-[#00C288]/10 hover:bg-[#00C288] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nuevo Paciente
                    </button>
                  )}
                </div>

                {!selectedPacienteId ? (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="w-full pl-10 pr-3 py-3 object-contain bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00C288] focus:bg-white outline-none transition-all shadow-sm"
                      placeholder="Escriba Documento, Nombres o Apellidos..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowResults(true);
                        setValue('paciente_id', ''); // Reset on retab
                      }}
                      onFocus={() => setShowResults(true)}
                    />

                    {showResults && searchTerm.length >= 2 && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                        {isSearching ? (
                          <div className="p-4 text-center text-sm font-bold text-gray-400 animate-pulse">Consultando base de datos...</div>
                        ) : pacientes.length === 0 ? (
                          <div className="p-4 text-center text-sm font-bold text-gray-500 bg-gray-50">
                            Sin coincidencias. Vaya a Pacientes y regístrelo primero.
                          </div>
                        ) : (
                          pacientes.map((p) => (
                            <button
                              type="button"
                              key={p.id}
                              className="w-full text-left px-5 py-3.5 hover:bg-[#00C288]/5 border-b border-gray-50 last:border-0 transition-colors"
                              onClick={() => {
                                setValue('paciente_id', p.id, { shouldValidate: true });
                                setShowResults(false);
                              }}
                            >
                              <p className="font-bold text-[#004975] text-sm">{p.nombres} {p.apellidos}</p>
                              <p className="text-xs text-gray-400 font-bold mt-0.5">DOC: <span className="text-[#00C288]">{p.numero_documento}</span></p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <div>
                      <p className="font-bold text-[#004975] text-sm">{selectedPaciente?.nombres} {selectedPaciente?.apellidos}</p>
                      <p className="text-xs text-blue-600 mt-1 font-bold">Documento Validado: {selectedPaciente?.numero_documento}</p>
                    </div>
                    {!citaEnEdicion && (
                      <button
                        type="button"
                        onClick={() => {
                          setValue('paciente_id', '');
                          setSearchTerm('');
                          setPacientes([]);
                        }}
                        className="text-xs text-[#004975] hover:text-white bg-white hover:bg-[#004975] font-bold px-3 py-1.5 rounded border border-gray-200 shadow-sm transition-colors"
                      >
                        Reseleccionar
                      </button>
                    )}
                  </div>
                )}

                {/* Patient History Context */}
                {selectedPacienteId && (
                  historyLoading ? (
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-[#00C288] rounded-full animate-spin" />
                      <span className="text-xs font-bold text-gray-400">Cargando historial...</span>
                    </div>
                  ) : patientHistory && (
                    <div className="mt-3 bg-[#004975]/5 rounded-xl border border-[#004975]/10 p-3.5 space-y-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <History className="w-3.5 h-3.5 text-[#004975]" />
                        <span className="text-[11px] font-black text-[#004975] uppercase tracking-wider">Contexto del Paciente</span>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[11px] font-bold text-gray-500 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-sm">
                          {patientHistory.totalVisitas} visita{patientHistory.totalVisitas !== 1 ? 's' : ''}
                        </span>
                        {patientHistory.ultimaVisita && (
                          <span className="text-[11px] font-bold text-gray-500 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-sm">
                            Última: {format(new Date(patientHistory.ultimaVisita), "d MMM yyyy", { locale: es })}
                          </span>
                        )}
                      </div>

                      {/* Alertas médicas */}
                      {(patientHistory.alertas.diabetes || patientHistory.alertas.hipertension || patientHistory.alertas.enfermedad_vascular || patientHistory.alertas.tratamiento_oncologico || patientHistory.alertas.alergias_detalle) && (
                        <div className="flex items-start gap-2 bg-red-50 rounded-lg p-2.5 border border-red-100">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                          <div className="flex flex-wrap gap-1.5">
                            {patientHistory.alertas.diabetes && <span className="text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Diabetes</span>}
                            {patientHistory.alertas.hipertension && <span className="text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Hipertensión</span>}
                            {patientHistory.alertas.enfermedad_vascular && <span className="text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Enf. Vascular</span>}
                            {patientHistory.alertas.tratamiento_oncologico && <span className="text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Trat. Oncológico</span>}
                            {patientHistory.alertas.alergias_detalle && <span className="text-[10px] font-bold text-red-600">{patientHistory.alertas.alergias_detalle}</span>}
                          </div>
                        </div>
                      )}

                      {/* Tratamientos frecuentes */}
                      {patientHistory.tratamientosFrecuentes.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tratamientos frecuentes</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {patientHistory.tratamientosFrecuentes.map(t => (
                              <span key={t} className="text-[10px] font-bold text-[#004975] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mini timeline de últimas visitas */}
                      {patientHistory.ultimasVisitas.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Últimas visitas</span>
                          <div className="mt-1.5 space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                            {patientHistory.ultimasVisitas.map((v, i) => (
                              <div key={i} className="bg-white rounded-lg border border-gray-200 p-2.5 shadow-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-black text-[#004975]">
                                    {format(new Date(v.created_at), "d MMM yyyy", { locale: es })}
                                  </span>
                                  {v.especialista && (
                                    <span className="text-[9px] font-bold text-gray-400">{v.especialista}</span>
                                  )}
                                </div>
                                <p className="text-[11px] font-bold text-gray-600 leading-tight">{v.motivo_consulta}</p>
                                {v.tratamientos_realizados.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {v.tratamientos_realizados.map(t => (
                                      <span key={t} className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">{t}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {patientHistory.totalVisitas === 0 && (
                        <p className="text-[11px] font-bold text-gray-400">Primera vez en el centro — sin historial previo.</p>
                      )}
                    </div>
                  )
                )}

                {errors.paciente_id && <p className="text-red-500 text-xs mt-2 font-bold px-1">{errors.paciente_id.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-[#004975] mb-2">Especialista Asignado</label>
                <select
                  className={`w-full border bg-gray-50 focus:bg-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#00C288] transition-colors shadow-sm font-medium ${errors.podologo_id ? 'border-red-500' : 'border-gray-200'}`}
                  {...register('podologo_id')}
                >
                  <option value="">-- Seleccione Profesional --</option>
                  {podologos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombres} ({p.especialidad || 'Podología'})</option>
                  ))}
                </select>
                {errors.podologo_id && <p className="text-red-500 text-xs mt-1.5 font-bold px-1">{errors.podologo_id.message}</p>}
              </div>

              <div className="space-y-4 pt-2">
                {/* Fecha */}
                <div className="flex-1">
                  <label className="block text-sm font-bold text-[#004975] mb-2 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#00C288]" />
                    Fecha de Cita <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={watchedFechaCita || ''}
                    onChange={(v) => setValue('fecha_cita', v, { shouldValidate: true })}
                    className={errors.fecha_cita ? '[&>div>input]:border-red-500' : ''}
                  />
                  {/* Hint: day name */}
                  {watchedFechaCita && (() => {
                    const [y, m, d] = watchedFechaCita.split('-').map(Number);
                    const dateObj = new Date(y, m - 1, d);
                    const todayStr = new Date().toLocaleDateString('en-CA');
                    const isToday = watchedFechaCita === todayStr;
                    return (
                      <p className={`text-[11px] font-bold mt-2 px-1 flex items-center gap-1.5 ${isToday ? 'text-[#00C288]' : 'text-gray-400'}`}>
                        {isToday && <span className="w-1.5 h-1.5 bg-[#00C288] rounded-full animate-pulse" />}
                        {format(dateObj, "EEEE d 'de' MMMM", { locale: es })}
                      </p>
                    );
                  })()}
                  {errors.fecha_cita && <p className="text-red-500 text-xs mt-1.5 font-bold px-1">{errors.fecha_cita.message}</p>}
                </div>

                {/* Hora */}
                <div className="flex-1">
                  <label className="block text-sm font-bold text-[#004975] mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#00C288]" />
                    Hora Programada <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      className={`w-full appearance-none border rounded-xl py-3 pl-4 pr-10 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#00C288] outline-none font-bold text-[#004975] transition-all shadow-sm cursor-pointer ${errors.hora_cita ? 'border-red-500' : 'border-gray-200'}`}
                      {...register('hora_cita')}
                    >
                      <option value="">Seleccione una hora...</option>
                      <optgroup label="☀️ Mañana">
                        {TIME_OPTIONS.filter(t => parseInt(t.value) < 12).map(time => (
                          <option key={time.value} value={time.value}>{time.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="🌤️ Tarde">
                        {TIME_OPTIONS.filter(t => { const h = parseInt(t.value); return h >= 12 && h < 18; }).map(time => (
                          <option key={time.value} value={time.value}>{time.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="🌙 Noche">
                        {TIME_OPTIONS.filter(t => parseInt(t.value) >= 18).map(time => (
                          <option key={time.value} value={time.value}>{time.label}</option>
                        ))}
                      </optgroup>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                      <Clock className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                  {errors.hora_cita && <p className="text-red-500 text-xs mt-1.5 font-bold px-1">{errors.hora_cita.message}</p>}
                </div>
              </div>

              {/* Pack / Promoción */}
              {packsDisponibles.length > 0 && (
                <div className="bg-gradient-to-r from-[#00C288]/5 to-[#004975]/5 p-4 rounded-xl border border-[#00C288]/20 shadow-sm">
                  <label className="block text-sm font-bold text-[#004975] mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#00C288]" />
                    Aplicar Pack (opcional)
                  </label>
                  <div className="space-y-1.5">
                    {selectedPackId && (
                      <button
                        type="button"
                        onClick={() => setSelectedPackId(null)}
                        className="text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors mb-1"
                      >
                        ✕ Quitar oferta
                      </button>
                    )}
                    {packsDisponibles.map(pack => {
                      const isSelected = selectedPackId === pack.id;
                      const Icon = pack.tipo.startsWith('pack_sesiones') ? Repeat : Package;
                      const credito = pacienteCreditos[pack.id];
                      const hasActiveCredit = !!credito;
                      const priceLabel = pack.precio_pack ? `S/ ${pack.precio_pack.toFixed(2)}` : '';
                      const items = pack.pack_items || [];

                      return (
                        <div key={pack.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedPackId(isSelected ? null : pack.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                              isSelected
                                ? 'bg-[#00C288]/10 border-[#00C288] shadow-sm'
                                : hasActiveCredit
                                  ? 'bg-purple-50 border-purple-300 hover:border-purple-400'
                                  : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#00C288] border-[#00C288]' : hasActiveCredit ? 'bg-purple-500 border-purple-500' : 'border-gray-300'}`}>
                                {isSelected && <span className="text-white text-[8px]">✓</span>}
                                {!isSelected && hasActiveCredit && <Repeat className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <div>
                                <span className={`text-xs font-bold block ${isSelected ? 'text-[#004975]' : hasActiveCredit ? 'text-purple-700' : 'text-gray-600'}`}>{pack.nombre}</span>
                                <span className={`text-[10px] flex items-center gap-1 ${hasActiveCredit ? 'text-purple-500 font-bold' : 'text-gray-400'}`}>
                                  <Icon className="w-3 h-3" />
                                  {hasActiveCredit
                                    ? `${credito.usadas}/${credito.total} sesiones usadas`
                                    : pack.tipo === 'pack_servicios' ? 'Pack' : `${pack.total_sesiones} sesiones`
                                  }
                                </span>
                              </div>
                            </div>
                            <span className={`text-xs font-black tabular-nums ${isSelected ? 'text-[#00C288]' : 'text-gray-400'}`}>
                              {priceLabel}
                            </span>
                          </button>
                          {isSelected && items.length > 0 && (
                            <div className="ml-7 mt-1.5 space-y-1 animate-in fade-in duration-200">
                              {items.map(item => (
                                <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-100 text-[11px]">
                                  <div>
                                    <span className="font-bold text-gray-600">
                                      {item.servicios?.nombre || item.productos?.nombre}
                                    </span>
                                    {item.cantidad > 1 && <span className="text-gray-400 ml-1">x{item.cantidad}</span>}
                                    {item.productos && <span className="ml-1.5 text-[9px] font-bold text-purple-500 bg-purple-50 px-1 py-0.5 rounded">Producto</span>}
                                  </div>
                                  <span className="font-bold text-gray-400 tabular-nums">
                                    S/ {((item.servicios?.precio_base || item.productos?.precio || 0) * item.cantidad).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Servicios / Tratamientos preseleccionados */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <label className="block text-sm font-bold text-[#004975] mb-3">Tratamientos Previstos</label>
                {serviciosList.length === 0 ? (
                  <p className="text-sm font-bold text-gray-400 bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
                    No hay servicios activos.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4">
                    {serviciosList.map(srv => (
                      <label key={srv.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 p-2 -ml-2 rounded-lg transition-colors group">
                        <input type="checkbox" value={srv.nombre} className="w-4 h-4 rounded text-[#00C288] focus:ring-[#00C288] border-gray-300" {...register('servicios_preseleccionados')} />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-[#004975] transition-colors uppercase tracking-tight">{srv.nombre}</span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-[10px] font-bold text-gray-400 mt-2">Opcional. Se pre-cargarán al registrar la atención.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#004975] mb-2">Motivo Reservado</label>
                <textarea
                  rows={3}
                  placeholder="Ej: Evaluación general de podiatría, atención a domicilio..."
                  className={`w-full border border-gray-200 bg-gray-50 focus:bg-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#00C288] resize-none transition-colors shadow-sm ${errors.motivo ? 'border-red-500' : 'border-gray-200'}`}
                  {...register('motivo')}
                />
                {errors.motivo && <p className="text-red-500 text-xs mt-1.5 font-bold px-1">{errors.motivo.message}</p>}
              </div>

              {/* Pago Adelantado (opcional) - ocultar si pack prepago con crédito y sin extras */}
              {(() => {
                const selPack = packsDisponibles.find(p => p.id === selectedPackId);
                if (selPack?.tipo === 'pack_sesiones_prepago' && selectedPackId && pacienteCreditos[selectedPackId]) {
                  // Pack prepago cubierto - verificar si hay servicios extra fuera del pack
                  const packItemNames = new Set(
                    (selPack.pack_items || []).map(i =>
                      (i.servicios as unknown as { nombre: string } | null)?.nombre
                    ).filter(Boolean)
                  );
                  const selectedServices = watchedServicios || [];
                  const hasExtras = selectedServices.some(s => !packItemNames.has(s));
                  if (!hasExtras) return false;
                }
                return true;
              })() && <div className="bg-[#00C288]/5 rounded-xl border border-[#00C288]/20 p-4 space-y-3">
                <label className="block text-sm font-bold text-[#004975] flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#00C288]" />
                  Pago Adelantado (opcional)
                </label>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5">Monto (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full border border-gray-200 bg-white rounded-xl py-2.5 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#00C288] tabular-nums shadow-sm"
                    {...register('adelanto')}
                  />
                </div>
                <PaymentMethodPicker
                  compact
                  value={watchedAdelantoMetodo || ''}
                  onChange={(v) => setValue('adelanto_metodo_pago', v)}
                  referencia={adelantoReferencia}
                  onReferenciaChange={setAdelantoReferencia}
                />
                <p className="text-[10px] font-bold text-[#00C288]/70">Si el paciente realiza un pago por adelantado, se descontará del total al momento del cobro.</p>
              </div>}

            </form>
          </div>

          <div className="p-4 md:p-6 border-t border-gray-100 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.02)] flex justify-end gap-3 rounded-bl-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-bold shadow-sm text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="cita-form"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#00C288] disabled:opacity-70 disabled:cursor-not-allowed text-white font-black rounded-xl hover:bg-[#00ab78] transition-all shadow-md flex items-center justify-center text-sm"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Guardar en Agenda'
              )}
            </button>
          </div>

        </div>

      </div>

      <PacienteDrawer
        isOpen={isNewPatientModalOpen}
        onClose={() => setIsNewPatientModalOpen(false)}
        onSuccessWithData={handleNewPatientCreated}
        defaultDocumento={searchTerm}
      />
    </>
  );
}
