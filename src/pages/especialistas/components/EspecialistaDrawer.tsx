import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { especialistaSchema, type EspecialistaFormValues } from '../schemas/especialistaSchema';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { Especialista } from '../../../types/entities';

interface EspecialistaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  especialista?: Especialista | null;
}

export function EspecialistaDrawer({ isOpen, onClose, onSuccess, especialista }: EspecialistaDrawerProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<EspecialistaFormValues>({
    resolver: zodResolver(especialistaSchema),
    defaultValues: {
      color_etiqueta: '#00C288',
      estado: true,
      especialidad: 'Podología'
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (especialista) {
        reset({
          nombres: especialista.nombres,
          dni: especialista.dni,
          especialidad: especialista.especialidad || 'Podología',
          telefono: especialista.telefono || '',
          correo: especialista.correo || '',
          color_etiqueta: especialista.color_etiqueta || '#00C288',
          estado: especialista.estado
        });
      } else {
        reset({
          nombres: '',
          dni: '',
          especialidad: 'Podología',
          telefono: '',
          correo: '',
          color_etiqueta: '#00C288',
          estado: true
        });
      }
    }
  }, [especialista, isOpen, reset]);

  const onSubmit = async (data: EspecialistaFormValues) => {
    try {
      if (especialista?.id && data.estado === false && especialista.estado === true) {
        const { count, error: countError } = await supabase
          .from('citas')
          .select('id', { count: 'exact', head: true })
          .eq('podologo_id', especialista.id)
          .in('estado', ['Programada', 'Confirmada', 'En Sala de Espera']);

        if (countError) throw countError;

        if (count && count > 0) {
          toast.error(
            'No es posible desactivar al especialista porque tiene citas pendientes de atención en la agenda. Por favor, reasigne o cancele sus turnos primero antes de darlo de baja.',
            { duration: 6000 }
          );
          return;
        }
      }

      const dbData = {
        ...data,
      };

      if (especialista?.id) {
        const { error } = await supabase.from('podologos').update(dbData).eq('id', especialista.id);
        if (error) throw error;
        toast.success('Especialista actualizado exitosamente');
      } else {
        const { error } = await supabase.from('podologos').insert([dbData]);
        if (error) throw error;
        toast.success('Especialista registrado exitosamente');
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      if (err.code === '23505') {
        toast.error('Ocurrió un error. El DNI o Correo ya podrían estar en uso.');
      } else {
        toast.error('Ocurrió un error al guardar');
      }
      console.error(err);
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
            {especialista ? `Editar: ${especialista.nombres}` : 'Nuevo Especialista'}
          </h2>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body Form */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">
          <form id="especialista-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-secondary mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  placeholder="Ej: Dra. Gabriela"
                  className={`w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-colors ${errors.nombres ? 'border-red-500' : 'border-gray-200'}`}
                  {...register('nombres')}
                />
                {errors.nombres && <p className="text-red-500 text-xs mt-1">{errors.nombres.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">DNI <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  className={`w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-colors ${errors.dni ? 'border-red-500' : 'border-gray-200'}`}
                  {...register('dni')}
                />
                {errors.dni && <p className="text-red-500 text-xs mt-1">{errors.dni.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Especialidad</label>
                <input 
                  type="text"
                  className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-colors"
                  {...register('especialidad')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Teléfono</label>
                <input 
                  type="tel"
                  className="w-full border border-gray-200 bg-gray-50 focus:bg-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary transition-colors"
                  {...register('telefono')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Correo Electrónico</label>
                <input 
                  type="email"
                  className="w-full border border-gray-200 bg-gray-50 focus:bg-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary transition-colors"
                  {...register('correo')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <label className="block text-sm font-bold text-secondary mb-2">Color Agenda</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color"
                    className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                    {...register('color_etiqueta')}
                  />
                  <span className="text-xs text-gray-500 font-medium">Marcador visual</span>
                </div>
              </div>
              
              <div className="flex flex-col justify-center">
                <label className="block text-sm font-bold text-secondary mb-2">Estado del Perfil</label>
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <div className="relative">
                    <input type="checkbox" className="sr-only peer" {...register('estado')} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-gray-300 peer-checked:border-primary"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Activo (Visible)</span>
                </label>
              </div>
            </div>
            
          </form>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-background flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="especialista-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-primary disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium rounded-lg hover:bg-[#00ab78] transition-colors shadow-md flex items-center justify-center min-w-[160px]"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Guardar Personal'
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
}
