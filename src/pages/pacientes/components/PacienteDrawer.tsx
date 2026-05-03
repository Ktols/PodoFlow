import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pacienteSchema, type PacienteFormValues } from '../schemas/pacienteSchema';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { Paciente } from '../../../types/entities';
import { DatePicker } from '../../../components/DatePicker';
import { useEffect } from 'react';

interface PacienteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onSuccessWithData?: (data: any) => void;
  patient?: Paciente | null;
  defaultDocumento?: string;
}

export function PacienteDrawer({ isOpen, onClose, onSuccess, onSuccessWithData, patient, defaultDocumento }: PacienteDrawerProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = useForm<PacienteFormValues>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      tipo_documento: 'DNI',
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (patient) {
        reset({
          tipo_documento: patient.tipo_documento as any,
          numero_documento: patient.numero_documento,
          nombres: patient.nombres,
          apellidos: patient.apellidos,
          telefono: patient.telefono || '',
          fecha_nacimiento: patient.fecha_nacimiento ? String(patient.fecha_nacimiento) : '',
          sexo: patient.sexo || '',
          alergias_alertas: patient.alergias_alertas || '',
          diabetes: patient.diabetes || false,
          hipertension: patient.hipertension || false,
          enfermedad_vascular: patient.enfermedad_vascular || false,
          tratamiento_oncologico: patient.tratamiento_oncologico || false,
          alergias_detalle: patient.alergias_detalle || ''
        });
      } else {
        reset({
          tipo_documento: 'DNI',
          numero_documento: defaultDocumento || '',
          nombres: '',
          apellidos: '',
          telefono: '',
          fecha_nacimiento: '',
          sexo: '',
          alergias_alertas: '',
          diabetes: false,
          hipertension: false,
          enfermedad_vascular: false,
          tratamiento_oncologico: false,
          alergias_detalle: ''
        });
      }
    }
  }, [patient, isOpen, reset]);

  const onSubmit = async (data: PacienteFormValues) => {
    try {
      const dbData = {
        ...data,
        fecha_nacimiento: data.fecha_nacimiento ? data.fecha_nacimiento : null,
      };

      let insertedPatient = null;

      if (patient?.id) {
        const { data: updated, error } = await supabase.from('pacientes').update(dbData).eq('id', patient.id).select().single();
        if (error) throw error;
        insertedPatient = updated;
        toast.success('Paciente actualizado exitosamente');
      } else {
        const { data: inserted, error } = await supabase.from('pacientes').insert([dbData]).select().single();
        if (error) throw error;
        insertedPatient = inserted;
        toast.success('Paciente registrado exitosamente');
      }

      onSuccess?.();
      if (onSuccessWithData && insertedPatient) onSuccessWithData(insertedPatient);
      onClose();
    } catch (err: any) {
      if (err.code === '23505') {
        toast.error('Ya existe un paciente con este documento.');
      } else {
        toast.error('Ocurrió un error inesperado');
        console.error(err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[20050]">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full md:w-[500px] lg:max-w-lg bg-background-container shadow-2xl z-[20051] transform transition-transform duration-300 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-secondary">
            {patient ? `Editar: ${patient.nombres} ${patient.apellidos}` : 'Nuevo Paciente'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body Form */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">
          <form id="paciente-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Doc. Identidad</label>
                <select 
                  className={`w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors ${errors.tipo_documento ? 'border-red-500' : 'border-gray-200'}`}
                  {...register('tipo_documento')}
                >
                  <option value="DNI">DNI</option>
                  <option value="CE">C. Extranjería</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
                {errors.tipo_documento && <p className="text-red-500 text-xs mt-1">{errors.tipo_documento.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Número</label>
                <input 
                  type="text"
                  placeholder="Ej: 12345678"
                  className={`w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-colors ${errors.numero_documento ? 'border-red-500' : 'border-gray-200'}`}
                  {...register('numero_documento')}
                />
                {errors.numero_documento && <p className="text-red-500 text-xs mt-1">{errors.numero_documento.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Nombres <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  className={`w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-colors ${errors.nombres ? 'border-red-500' : 'border-gray-200'}`}
                  {...register('nombres')}
                />
                {errors.nombres && <p className="text-red-500 text-xs mt-1">{errors.nombres.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Apellidos <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  className={`w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-colors ${errors.apellidos ? 'border-red-500' : 'border-gray-200'}`}
                  {...register('apellidos')}
                />
                {errors.apellidos && <p className="text-red-500 text-xs mt-1">{errors.apellidos.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Teléfono</label>
                <input 
                  type="tel"
                  placeholder="Ej: 999 888 777"
                  className="w-full border border-gray-200 bg-gray-50 focus:bg-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary transition-colors"
                  {...register('telefono')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">F. Nacimiento</label>
                <DatePicker
                  value={watch('fecha_nacimiento') || ''}
                  onChange={(v) => setValue('fecha_nacimiento', v)}
                  maxDate={new Date().toISOString().split('T')[0]}
                />
                {errors.fecha_nacimiento && <p className="text-red-500 text-xs mt-1">{errors.fecha_nacimiento.message}</p>}
              </div>
            </div>

            <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
              <div className="col-span-full mb-4">
                <label className="block text-sm font-bold text-red-800">Antecedentes Clínicos <span className="text-gray-500 font-medium ml-1 text-xs">(Marcar si presenta)</span></label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 shrink-0 rounded text-red-600 focus:ring-red-500" {...register('diabetes')} />
                  <span className="text-sm font-medium text-red-900 leading-tight">Diabetes</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 shrink-0 rounded text-red-600 focus:ring-red-500" {...register('hipertension')} />
                  <span className="text-sm font-medium text-red-900 leading-tight">Hipertensión</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 shrink-0 rounded text-red-600 focus:ring-red-500" {...register('enfermedad_vascular')} />
                  <span className="text-sm font-medium text-red-900 leading-tight">Enf. Vascular</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 shrink-0 rounded text-red-600 focus:ring-red-500" {...register('tratamiento_oncologico')} />
                  <span className="text-sm font-medium text-red-900 leading-tight">Trat. Oncológico</span>
                </label>
              </div>
              
              <div className="col-span-full mt-2">
                <label className="block text-sm font-medium text-red-800 mb-1">Detalle de Alergias</label>
                <input 
                  type="text"
                  placeholder="Ej: Alergia a la penicilina, yodo, anestesia..."
                  className="w-full border border-red-200 bg-white focus:bg-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500 transition-colors placeholder:text-red-300 text-red-900"
                  {...register('alergias_detalle')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Alertas o Notas Adicionales Varias</label>
              <textarea 
                rows={2}
                placeholder="Ej: Paciente asiste en silla de ruedas, fobia a las agujas..."
                className="w-full border border-gray-200 bg-gray-50 focus:bg-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary resize-none transition-colors"
                {...register('alergias_alertas')}
              />
            </div>
            
          </form>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-background flex justify-end gap-3 rounded-bl-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="paciente-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-primary disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium rounded-lg hover:bg-[#00ab78] transition-colors shadow-md flex items-center justify-center min-w-[160px]"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Guardar Paciente'
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
}
