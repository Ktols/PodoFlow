import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Building2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { sucursalSchema, type SucursalFormValues } from '../schemas/sucursalSchema';
import toast from 'react-hot-toast';

interface SucursalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sucursal: any | null;
}

export function SucursalDrawer({ isOpen, onClose, onSuccess, sucursal }: SucursalDrawerProps) {
  const isEditing = !!sucursal;
  
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SucursalFormValues>({
    resolver: zodResolver(sucursalSchema),
    defaultValues: {
      nombre_comercial: '',
      razon_social: '',
      ruc: '',
      direccion: '',
      telefono: '',
      whatsapp: '',
      activa: true,
    },
  });

  useEffect(() => {
    if (sucursal) {
      reset({
        nombre_comercial: sucursal.nombre_comercial || '',
        razon_social: sucursal.razon_social || '',
        ruc: sucursal.ruc || '',
        direccion: sucursal.direccion || '',
        telefono: sucursal.telefono || '',
        whatsapp: sucursal.whatsapp || '',
        activa: sucursal.activa ?? true,
      });
    } else {
      reset({
        nombre_comercial: '',
        razon_social: '',
        ruc: '',
        direccion: '',
        telefono: '',
        whatsapp: '',
        activa: true,
      });
    }
  }, [sucursal, reset, isOpen]);

  const onSubmit = async (values: SucursalFormValues) => {
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('sucursales')
          .update(values)
          .eq('id', sucursal.id);
        if (error) throw error;
        toast.success('Sucursal actualizada correctamente');
      } else {
        const { error } = await supabase
          .from('sucursales')
          .insert([values]);
        if (error) throw error;
        toast.success('Sucursal creada correctamente');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar la sucursal');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl h-full overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-secondary">
              {isEditing ? 'Editar Sucursal' : 'Nueva Sucursal'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Nombre Comercial */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nombre Comercial <span className="text-red-500">*</span>
            </label>
            <input
              {...register('nombre_comercial')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Ej: G&C Podología - Sede San Isidro"
            />
            {errors.nombre_comercial && (
              <p className="text-red-500 text-xs mt-1">{errors.nombre_comercial.message}</p>
            )}
          </div>

          {/* Razón Social */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Razón Social</label>
            <input
              {...register('razon_social')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Ej: G&C Podología SAC"
            />
          </div>

          {/* RUC */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">RUC</label>
            <input
              {...register('ruc')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="20123456789"
              maxLength={11}
            />
            {errors.ruc && (
              <p className="text-red-500 text-xs mt-1">{errors.ruc.message}</p>
            )}
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Dirección</label>
            <input
              {...register('direccion')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Av. Principal 123, Lima"
            />
          </div>

          {/* Teléfono y WhatsApp */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Teléfono</label>
              <input
                {...register('telefono')}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="01-1234567"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">WhatsApp</label>
              <input
                {...register('whatsapp')}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="51987654321"
              />
            </div>
          </div>

          {/* Estado */}
          {isEditing && (
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-gray-700">Estado de la Sucursal</p>
                <p className="text-xs text-gray-400">Desactivar oculta la sucursal del sistema</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" {...register('activa')} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
            >
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Sucursal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
