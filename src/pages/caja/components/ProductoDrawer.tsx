import { useState, useEffect } from 'react';
import { X, Package, Hash, Boxes } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
<<<<<<< HEAD
import { useBranchStore } from '../../../stores/branchStore';
=======
>>>>>>> origin/main
import type { Producto } from '../../../types/entities';
import { CATEGORIAS_PRODUCTO } from '../../../constants';

interface ProductoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  productoEnEdicion?: Producto | null;
}

interface ProductoForm {
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: string;
  stock: string;
  stock_minimo: string;
  estado: boolean;
}

export function ProductoDrawer({ isOpen, onClose, onSuccess, productoEnEdicion }: ProductoDrawerProps) {
  const { sucursalActiva } = useBranchStore();
  const [form, setForm] = useState<ProductoForm>({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: 'Otros',
    precio: '',
    stock: '0',
    stock_minimo: '0',
    estado: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (productoEnEdicion) {
        setForm({
          codigo: productoEnEdicion.codigo || '',
          nombre: productoEnEdicion.nombre,
          descripcion: productoEnEdicion.descripcion || '',
          categoria: productoEnEdicion.categoria || 'Otros',
          precio: productoEnEdicion.precio.toString(),
          stock: productoEnEdicion.stock.toString(),
          stock_minimo: productoEnEdicion.stock_minimo.toString(),
          estado: productoEnEdicion.estado,
        });
      } else {
        setForm({
          codigo: '',
          nombre: '',
          descripcion: '',
          categoria: 'Otros',
          precio: '',
          stock: '0',
          stock_minimo: '0',
          estado: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, productoEnEdicion]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.nombre.trim()) {
      newErrors.nombre = 'El nombre del producto es obligatorio.';
    }

    const precio = parseFloat(form.precio);
    if (form.precio === '' || isNaN(precio) || precio < 0) {
      newErrors.precio = 'Ingrese un precio válido mayor o igual a 0.';
    }

    const stock = parseInt(form.stock, 10);
    if (form.stock === '' || isNaN(stock) || stock < 0) {
      newErrors.stock = 'El stock debe ser un número mayor o igual a 0.';
    }

    const stockMin = parseInt(form.stock_minimo, 10);
    if (form.stock_minimo === '' || isNaN(stockMin) || stockMin < 0) {
      newErrors.stock_minimo = 'El stock mínimo debe ser un número mayor o igual a 0.';
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
        codigo: form.codigo.trim() || null,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        categoria: form.categoria,
        precio: parseFloat(form.precio),
        stock: parseInt(form.stock, 10),
        stock_minimo: parseInt(form.stock_minimo, 10),
        estado: form.estado,
      };

      if (productoEnEdicion) {
        const { error } = await supabase
          .from('productos')
          .update(payload)
          .eq('id', productoEnEdicion.id);

        if (error) throw error;
        toast.success('Producto actualizado correctamente');
      } else {
        const { error } = await supabase
          .from('productos')
          .insert([{ ...payload, sucursal_id: sucursalActiva?.id }]);

        if (error) throw error;
        toast.success('Producto creado correctamente');
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      if (err?.code === '23505') {
        toast.error('Ya existe un producto con ese código.');
      } else {
        toast.error('Error al guardar el producto');
        console.error(err);
      }
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

      <div className="absolute right-0 top-0 h-full w-full md:w-[500px] lg:max-w-lg bg-white shadow-2xl z-[10000] transform transition-transform duration-300 flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-black text-[#004975]">
            {productoEnEdicion ? 'Editar Producto' : 'Nuevo Producto'}
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
          <form id="producto-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Codigo + Categoria */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#004975] mb-2">Código (SKU)</label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-[#00C288] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Ej: PROD-001"
                    className="w-full pl-10 pr-3 border border-gray-200 bg-gray-50 focus:bg-white rounded-xl py-3 outline-none focus:ring-2 focus:ring-[#00C288] transition-all shadow-sm font-medium"
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#004975] mb-2">Categoría</label>
                <select
                  className="w-full border border-gray-200 bg-gray-50 focus:bg-white rounded-xl py-3 px-3 outline-none focus:ring-2 focus:ring-[#00C288] transition-all shadow-sm font-medium"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                >
                  {CATEGORIAS_PRODUCTO.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-bold text-[#004975] mb-2">
                Nombre del Producto <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Package className="w-4 h-4 text-[#00C288] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Ej: Crema antimicótica 50ml"
                  className={`w-full pl-10 pr-3 border bg-gray-50 focus:bg-white rounded-xl py-3 outline-none focus:ring-2 focus:ring-[#00C288] transition-all shadow-sm font-medium ${
                    errors.nombre ? 'border-red-500' : 'border-gray-200'
                  }`}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              {errors.nombre && (
                <p className="text-red-500 text-xs mt-1.5 font-bold px-1">{errors.nombre}</p>
              )}
            </div>

            {/* Descripcion */}
            <div>
              <label className="block text-sm font-bold text-[#004975] mb-2">Descripción</label>
              <textarea
                rows={2}
                placeholder="Detalle adicional, presentación, marca..."
                className="w-full border border-gray-200 bg-gray-50 focus:bg-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#00C288] resize-none transition-all shadow-sm font-medium text-sm"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>

            {/* Precio */}
            <div>
              <label className="block text-sm font-bold text-[#004975] mb-2">
                Precio <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <span className="text-gray-400 font-black text-sm">
                    S/
                  </span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={`w-full pl-16 pr-4 border bg-gray-50 focus:bg-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#00C288] transition-all shadow-sm font-black text-lg tabular-nums ${
                    errors.precio ? 'border-red-500' : 'border-gray-200'
                  }`}
                  value={form.precio}
                  onChange={(e) => setForm({ ...form, precio: e.target.value })}
                />
              </div>
              {errors.precio && (
                <p className="text-red-500 text-xs mt-1.5 font-bold px-1">{errors.precio}</p>
              )}
            </div>

            {/* Stock + Stock Minimo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#004975] mb-2">
                  Stock Actual <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Boxes className="w-4 h-4 text-[#00C288] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    className={`w-full pl-10 pr-3 border bg-gray-50 focus:bg-white rounded-xl py-3 outline-none focus:ring-2 focus:ring-[#00C288] transition-all shadow-sm font-bold tabular-nums ${
                      errors.stock ? 'border-red-500' : 'border-gray-200'
                    }`}
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </div>
                {errors.stock && (
                  <p className="text-red-500 text-xs mt-1.5 font-bold px-1">{errors.stock}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-[#004975] mb-2">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  className={`w-full px-3 border bg-gray-50 focus:bg-white rounded-xl py-3 outline-none focus:ring-2 focus:ring-[#00C288] transition-all shadow-sm font-bold tabular-nums ${
                    errors.stock_minimo ? 'border-red-500' : 'border-gray-200'
                  }`}
                  value={form.stock_minimo}
                  onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                />
                {errors.stock_minimo && (
                  <p className="text-red-500 text-xs mt-1.5 font-bold px-1">{errors.stock_minimo}</p>
                )}
                <p className="text-[10px] font-bold text-gray-400 mt-1.5 px-1">Alerta cuando el stock baja de este valor</p>
              </div>
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
                    {form.estado ? 'Activo — Disponible para venta' : 'Inactivo — No disponible'}
                  </span>
                </div>
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
            form="producto-form"
            disabled={isSubmitting}
            className="px-8 py-3 bg-[#00C288] disabled:opacity-70 disabled:cursor-not-allowed text-white font-black rounded-xl hover:bg-[#00ab78] transition-all shadow-md flex items-center justify-center min-w-[170px]"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : productoEnEdicion ? (
              'Actualizar Producto'
            ) : (
              'Guardar Producto'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
