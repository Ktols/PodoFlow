import { useState, useEffect, useRef } from 'react';
import { X, Search, AlertTriangle, Plus } from 'lucide-react';
import { PacienteDrawer } from '../../pacientes/components/PacienteDrawer';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { citaSchema, type CitaFormValues } from '../schemas/citaSchema';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useBranchStore } from '../../../stores/branchStore';
import type { CitaList } from '../AgendaPage';

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

const TIME_OPTIONS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", 
  "20:00", "20:30", "21:00", "21:30", "22:00"
].map(time => {
  const [h, m] = time.split(':');
  const hNum = parseInt(h, 10);
  const ampm = hNum >= 12 ? 'PM' : 'AM';
  const h12 = (hNum % 12) || 12;
  return { value: time, label: `${h12.toString().padStart(2, '0')}:${m} ${ampm}` };
});

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
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch, reset } = useForm<CitaFormValues>({
    resolver: zodResolver(citaSchema),
  });
  const { sucursalActiva } = useBranchStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [pacientes, setPacientes] = useState<PacienteMin[]>([]);
  const [podologos, setPodologos] = useState<PodologoMin[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const selectedPacienteId = watch('paciente_id');
  const selectedPaciente = pacientes.find(p => p.id === selectedPacienteId);
  const watchedFechaCita = watch('fecha_cita');

  // Mantiene sincronizada la hora cuando cambia la fecha
  useEffect(() => {
    if (isOpen && !citaEnEdicion && watchedFechaCita) {
      setValue('hora_cita', getSmartInitialTime(watchedFechaCita), { shouldValidate: true });
    }
  }, [watchedFechaCita, isOpen, citaEnEdicion, setValue]);

  const handleNewPatientCreated = (newPatientData: any) => {
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
          podologo_id: citaEnEdicion.podologo_id, // Could be empty string if any podologist removed, handled correctly by RHF validation if empty
          // Actually podologo is in relation, so we have it
          fecha_cita: citaEnEdicion.fecha_cita,
          hora_cita: citaEnEdicion.hora_cita.substring(0, 5),
          motivo: citaEnEdicion.motivo,
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
        });
        setPacientes([]);
      }
      setSearchTerm('');
      setValidationError(null);

      const fetchPodologos = async () => {
        const { data } = await supabase.from('podologos').select('id, nombres, especialidad, color_etiqueta').eq('estado', true);
        if (data) setPodologos(data);
      };
      
      fetchPodologos();
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
        setPacientes([]);
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

      // 2. Regla Concurrente (Sólo Especialista, se permite a paciente agendar dos turnos)
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

      // Evaluar conflictos de concurrencia
      if (resEspecialista && resEspecialista.length > 0) {
        setValidationError("Error: El especialista asignado ya tiene un turno a esa hora. Elija otra hora u otro especialista.");
        return;
      }

      if (citaEnEdicion) {
        const { error } = await supabase.from('citas').update({
          podologo_id: data.podologo_id,
          fecha_cita: data.fecha_cita,
          hora_cita: data.hora_cita,
          motivo: data.motivo,
          sucursal_id: sucursalActiva?.id,
        }).eq('id', citaEnEdicion.id);

        if (error) throw error;
        toast.success('Turno actualizado de manera exitosa');
      } else {
        const { error } = await supabase.from('citas').insert([{
          paciente_id: data.paciente_id,
          podologo_id: data.podologo_id,
          fecha_cita: data.fecha_cita,
          hora_cita: data.hora_cita,
          motivo: data.motivo,
          estado: 'Programada',
          sucursal_id: sucursalActiva?.id,
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
      <div className="fixed inset-0 z-[9999]">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full md:w-[500px] lg:max-w-lg bg-white shadow-2xl z-[10000] transform transition-transform duration-300 flex flex-col animate-in slide-in-from-right">
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
              {errors.paciente_id && <p className="text-red-500 text-xs mt-2 font-bold px-1">{errors.paciente_id.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-[#004975] mb-2">Especialista Asignado <span className="text-red-500">*</span></label>
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

            <div className="grid grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-sm font-bold text-[#004975] mb-2">Fecha Exacta <span className="text-red-500">*</span></label>
                <input 
                  type="date"
                  className={`w-full border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#00C288] outline-none font-medium transition-colors shadow-sm ${errors.fecha_cita ? 'border-red-500' : 'border-gray-200'}`}
                  {...register('fecha_cita')}
                />
                {errors.fecha_cita && <p className="text-red-500 text-xs mt-1.5 font-bold px-1">{errors.fecha_cita.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-[#004975] mb-2">Hora (Inicio) <span className="text-red-500">*</span></label>
                <select 
                  className={`w-full border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#00C288] outline-none font-medium transition-colors shadow-sm cursor-pointer ${errors.hora_cita ? 'border-red-500' : 'border-gray-200'}`}
                  {...register('hora_cita')}
                >
                  <option value="">Seleccione...</option>
                  {TIME_OPTIONS.map(time => (
                    <option key={time.value} value={time.value}>{time.label}</option>
                  ))}
                </select>
                {errors.hora_cita && <p className="text-red-500 text-xs mt-1.5 font-bold px-1">{errors.hora_cita.message}</p>}
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-bold text-[#004975] mb-2">Motivo Reservado <span className="text-red-500">*</span></label>
              <textarea 
                rows={4}
                placeholder="Ej: Evaluación general de podiatría, atención a domicilio..."
                className={`w-full border border-gray-200 bg-gray-50 focus:bg-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#00C288] resize-none transition-colors shadow-sm ${errors.motivo ? 'border-red-500' : 'border-gray-200'}`}
                {...register('motivo')}
              />
              {errors.motivo && <p className="text-red-500 text-xs mt-1.5 font-bold px-1">{errors.motivo.message}</p>}
            </div>
            
          </form>
        </div>
        
        <div className="p-6 border-t border-gray-100 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.02)] flex justify-end gap-3 rounded-bl-lg">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-3 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-bold shadow-sm"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="cita-form"
            disabled={isSubmitting}
            className="px-8 py-3 bg-[#00C288] disabled:opacity-70 disabled:cursor-not-allowed text-white font-black rounded-xl hover:bg-[#00ab78] transition-all shadow-md flex items-center justify-center min-w-[170px]"
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
      />
    </>
  );
}
