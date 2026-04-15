import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { Servicio } from './ListaPreciosTab';

interface ServicioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  servicioEnEdicion?: Servicio | null;
}

interface ServicioForm {
  nombre: string;
  precio_base: string;
  estado: boolean;
}

export function ServicioDrawer({ isOpen, onClose, onSuccess, servicioEnEdicion }: ServicioDrawerProps) {
  const [form, setForm] = useState<ServicioForm>({
    nombre: '',
    precio_base: '',
    estado: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (servicioEnEdicion) {
        setForm({
          nombre: servicioEnEdicion.nombre,
          precio_base: servicioEnEdicion.precio_base.toString(),
          estado: servicioEnEdicion.estado,
        });
      } else {
        setForm({ nombre: '', precio_base: '', estado: true });
      }
      setErrors({});
    }
  }, [isOpen, servicioEnEdicion]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.nombre.trim()) {
      newErrors.nombre = 'El nombre del servicio es obligatorio.';
    }

    const precio = parseFloat(form.precio_base);
    if (!form.precio_base || isNaN(precio) || precio < 0) {
      newErrors.precio_base = 'Ingrese un precio válido mayor o igual a 0.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        nombre: form.nombre.trim(),
        precio_base: parseFloat(form.precio_base),
        estado: form.estado,
      };

      if (servicioEnEdicion) {
        const { error } = await supabase
          .from('servicios')
          .update(payload)
          .eq('id', servicioEnEdicion.id);

        if (error) throw error;
        toast.success('Servicio actualizado correctamente');
      } else {
        const { error } = await supabase
          .from('servicios')
          .insert([payload]);

        if (error) throw error;
        toast.success('Servicio creado correctamente');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error('Error al guardar el servicio');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="absolute right-0 top-0 h-full w-full md:w-[460px] lg:max-w-lg bg-white shadow-2xl z-[10000] transform transition-transform duration-300 flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-black text-[#004975]">
            {servicioEnEdicion ? 'Editar Servicio' : 'Nuevo Servicio'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors group"
          >
            <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="servicio-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-bold text-[#004975] mb-2">
                Nombre del Servicio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Evaluación Podológica Integral"
                className={`w-full border bg-gray-50 focus:bg-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#00C288] transition-all shadow-sm font-medium ${
                  errors.nombre ? 'border-red-500' : 'border-gray-200'
                }`}
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
              {errors.nombre && (
                <p className="text-red-500 text-xs mt-1.5 font-bold px-1">{errors.nombre}</p>
              )}
            </div>

            {/* Precio Base */}
            <div>
              <label className="block text-sm font-bold text-[#004975] mb-2">
                Precio Base <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <span className="text-gray-400 font-black text-sm">S/</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={`w-full pl-16 pr-4 border bg-gray-50 focus:bg-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#00C288] transition-all shadow-sm font-black text-lg tabular-nums ${
                    errors.precio_base ? 'border-red-500' : 'border-gray-200'
                  }`}
                  value={form.precio_base}
                  onChange={(e) => setForm({ ...form, precio_base: e.target.value })}
                />
              </div>
              {errors.precio_base && (
                <p className="text-red-500 text-xs mt-1.5 font-bold px-1">{errors.precio_base}</p>
              )}
            </div>

            {/* Estado Switch */}
            <div>
              <label className="block text-sm font-bold text-[#004975] mb-3">Estado</label>
              <div
                className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                  form.estado
                    ? 'bg-[#00C288]/5 border-[#00C288]/20'
                    : 'bg-gray-50 border-gray-200'
                }`}
                onClick={() => setForm({ ...form, estado: !form.estado })}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      form.estado ? 'bg-[#00C288] shadow-lg shadow-[#00C288]/30' : 'bg-gray-300'
                    }`}
                  />
                  <span className={`text-sm font-bold ${form.estado ? 'text-[#00C288]' : 'text-gray-400'}`}>
                    {form.estado ? 'Activo — Visible en lista de cobros' : 'Inactivo — Oculto para nuevos cobros'}
                  </span>
                </div>

                {/* Toggle Switch Visual */}
                <div className="relative">
                  <div
                    className={`w-12 h-6 rounded-full transition-colors duration-200 ${
                      form.estado ? 'bg-[#00C288]' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                        form.estado ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
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
            form="servicio-form"
            disabled={isSubmitting}
            className="px-8 py-3 bg-[#00C288] disabled:opacity-70 disabled:cursor-not-allowed text-white font-black rounded-xl hover:bg-[#00ab78] transition-all shadow-md flex items-center justify-center min-w-[170px]"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : servicioEnEdicion ? (
              'Actualizar Servicio'
            ) : (
              'Guardar Servicio'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
