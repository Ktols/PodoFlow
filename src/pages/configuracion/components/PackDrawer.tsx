import { useState, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useBranchStore } from '../../../stores/branchStore';
import type { Pack, PackTipo } from '../../../types/entities';
import { PACK_TYPES } from '../../../constants';
import { DatePicker } from '../../../components/DatePicker';

interface PackDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  packEnEdicion: Pack | null;
}

interface ServicioOption { id: string; nombre: string; precio_base: number }
interface ProductoOption { id: string; nombre: string; precio: number }

export function PackDrawer({ isOpen, onClose, onSuccess, packEnEdicion }: PackDrawerProps) {
  const { sucursalActiva } = useBranchStore();
  const isEditing = !!packEnEdicion;

  // Form state
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<PackTipo>('pack_servicios');
  const [precioPack, setPrecioPack] = useState('');
  const [totalSesiones, setTotalSesiones] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [stockTotal, setStockTotal] = useState('');
  const [selectedServicios, setSelectedServicios] = useState<Set<string>>(new Set());
  const [selectedProductos, setSelectedProductos] = useState<Map<string, number>>(new Map());

  // Options from DB
  const [serviciosOptions, setServiciosOptions] = useState<ServicioOption[]>([]);
  const [productosOptions, setProductosOptions] = useState<ProductoOption[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch options
  useEffect(() => {
    if (!isOpen || !sucursalActiva?.id) return;
    const fetchOptions = async () => {
      const [srvRes, prodRes] = await Promise.all([
        supabase.from('servicios').select('id, nombre, precio_base').eq('estado', true).eq('sucursal_id', sucursalActiva.id).order('nombre'),
        supabase.from('productos').select('id, nombre, precio').eq('estado', true).eq('sucursal_id', sucursalActiva.id).order('nombre'),
      ]);
      if (srvRes.data) setServiciosOptions(srvRes.data);
      if (prodRes.data) setProductosOptions(prodRes.data);
    };
    fetchOptions();
  }, [isOpen, sucursalActiva?.id]);

  // Populate form on edit
  useEffect(() => {
    if (!isOpen) return;
    if (packEnEdicion) {
      setNombre(packEnEdicion.nombre);
      setDescripcion(packEnEdicion.descripcion || '');
      setTipo(packEnEdicion.tipo);
      setPrecioPack(packEnEdicion.precio_pack?.toString() || '');
      setTotalSesiones(packEnEdicion.total_sesiones?.toString() || '');
      setFechaInicio(packEnEdicion.fecha_inicio || '');
      setFechaFin(packEnEdicion.fecha_fin || '');
      setStockTotal(packEnEdicion.stock_total?.toString() || '');

      const srvIds = new Set<string>();
      const prodMap = new Map<string, number>();
      (packEnEdicion.pack_items || []).forEach(item => {
        if (item.servicio_id) srvIds.add(item.servicio_id);
        if (item.producto_id) prodMap.set(item.producto_id, item.cantidad);
      });
      setSelectedServicios(srvIds);
      setSelectedProductos(prodMap);
    } else {
      setNombre('');
      setDescripcion('');
      setTipo('pack_servicios');
      setPrecioPack('');
      setTotalSesiones('');
      setFechaInicio('');
      setFechaFin('');
      setStockTotal('');
      setSelectedServicios(new Set());
      setSelectedProductos(new Map());
    }
    setErrors({});
  }, [isOpen, packEnEdicion]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!nombre.trim()) errs.nombre = 'Requerido';
    if (!precioPack || parseFloat(precioPack) <= 0) {
      errs.precio = 'El precio es requerido';
    }
    if (tipo.startsWith('pack_sesiones') && (!totalSesiones || parseInt(totalSesiones) < 2)) {
      errs.sesiones = 'Minimo 2 sesiones';
    }
    if (fechaFin && fechaInicio && fechaFin < fechaInicio) errs.fechaFin = 'Debe ser posterior a fecha inicio';
    if (selectedServicios.size === 0 && selectedProductos.size === 0) errs.items = 'Seleccione al menos un servicio o producto';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        tipo,
        precio_pack: parseFloat(precioPack),
        descuento_porcentaje: null,
        descuento_monto: null,
        total_sesiones: tipo.startsWith('pack_sesiones') ? parseInt(totalSesiones) : null,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        stock_total: stockTotal ? parseInt(stockTotal) : null,
        estado: true,
        sucursal_id: sucursalActiva?.id,
      };

      let packId: string;

      if (isEditing) {
        const { error } = await supabase.from('packs_promociones').update(payload).eq('id', packEnEdicion.id);
        if (error) throw error;
        packId = packEnEdicion.id;

        // Delete old items and re-insert
        await supabase.from('pack_items').delete().eq('pack_id', packId);
      } else {
        const { data, error } = await supabase.from('packs_promociones').insert([payload]).select('id').single();
        if (error) throw error;
        packId = data.id;
      }

      // Insert items
      const items: { pack_id: string; servicio_id: string | null; producto_id: string | null; cantidad: number }[] = [];
      selectedServicios.forEach(srvId => {
        items.push({ pack_id: packId, servicio_id: srvId, producto_id: null, cantidad: 1 });
      });
      selectedProductos.forEach((cant, prodId) => {
        items.push({ pack_id: packId, servicio_id: null, producto_id: prodId, cantidad: cant });
      });

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from('pack_items').insert(items);
        if (itemsError) throw itemsError;
      }

      toast.success(isEditing ? 'Pack actualizado' : 'Pack creado exitosamente');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error('Error al guardar el pack');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleServicio = (id: string) => {
    setSelectedServicios(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleProducto = (id: string) => {
    setSelectedProductos(prev => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, 1);
      return next;
    });
  };

  const updateProductoCantidad = (id: string, cant: number) => {
    setSelectedProductos(prev => {
      const next = new Map(prev);
      next.set(id, Math.max(1, cant));
      return next;
    });
  };

  // Calculate price summary
  const precioNormal = (() => {
    let total = 0;
    selectedServicios.forEach(id => {
      const srv = serviciosOptions.find(s => s.id === id);
      if (srv) total += srv.precio_base;
    });
    selectedProductos.forEach((cant, id) => {
      const prod = productosOptions.find(p => p.id === id);
      if (prod) total += prod.precio * cant;
    });
    return total;
  })();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] !m-0">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={onClose} />

      <div className="absolute right-0 inset-y-0 w-full md:w-[540px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100">
          <h2 className="text-xl font-black text-[#004975]">
            {isEditing ? 'Editar Pack' : 'Nuevo Pack / Promocion'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <form id="pack-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-bold text-[#004975] mb-2">Nombre <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Pack Completo, Promo Julio..."
                className={`w-full border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#00C288] outline-none font-medium text-sm ${errors.nombre ? 'border-red-500' : 'border-gray-200'}`}
              />
              {errors.nombre && <p className="text-red-500 text-xs mt-1 font-bold">{errors.nombre}</p>}
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-bold text-[#004975] mb-2">Tipo <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {PACK_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipo(t.value as PackTipo)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      tipo === t.value
                        ? 'bg-[#004975] text-white border-[#004975] shadow-md'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xs font-black block">{t.label}</span>
                    <span className={`text-[10px] ${tipo === t.value ? 'text-white/70' : 'text-gray-400'}`}>{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Servicios */}
            <div>
              <label className="block text-sm font-bold text-[#004975] mb-2">Servicios incluidos</label>
              {serviciosOptions.length === 0 ? (
                <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-200 text-center">No hay servicios activos</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {serviciosOptions.map(srv => {
                    const isSelected = selectedServicios.has(srv.id);
                    return (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => toggleServicio(srv.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                          isSelected ? 'bg-[#00C288]/5 border-[#00C288]/30' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-[#00C288] border-[#00C288]' : 'border-gray-300'}`}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-xs font-bold ${isSelected ? 'text-[#004975]' : 'text-gray-600'}`}>{srv.nombre}</span>
                        </div>
                        <span className={`text-xs font-black tabular-nums ${isSelected ? 'text-[#00C288]' : 'text-gray-400'}`}>
                          S/ {srv.precio_base.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Productos */}
            <div>
              <label className="block text-sm font-bold text-[#004975] mb-2">Productos incluidos (opcional)</label>
              {productosOptions.length === 0 ? (
                <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-200 text-center">No hay productos activos</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {productosOptions.map(prod => {
                    const isSelected = selectedProductos.has(prod.id);
                    const cant = selectedProductos.get(prod.id) || 1;
                    return (
                      <div key={prod.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isSelected ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <button
                          type="button"
                          onClick={() => toggleProducto(prod.id)}
                          className="flex items-center gap-2.5 text-left"
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300'}`}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-xs font-bold ${isSelected ? 'text-[#004975]' : 'text-gray-600'}`}>{prod.nombre}</span>
                        </button>
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <input
                              type="number"
                              min="1"
                              value={cant}
                              onChange={e => updateProductoCantidad(prod.id, parseInt(e.target.value) || 1)}
                              className="w-14 text-center border border-gray-200 rounded-lg py-1 text-xs font-bold outline-none focus:ring-1 focus:ring-[#00C288]"
                            />
                          )}
                          <span className={`text-xs font-black tabular-nums ${isSelected ? 'text-purple-600' : 'text-gray-400'}`}>
                            S/ {prod.precio.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {errors.items && <p className="text-red-500 text-xs mt-1 font-bold">{errors.items}</p>}
            </div>

            {/* Price summary: precio normal de items seleccionados */}
            {precioNormal > 0 && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500">Precio normal ({selectedServicios.size} srv{selectedProductos.size > 0 ? ` + ${selectedProductos.size} prod` : ''})</span>
                  <span className="text-lg font-black text-[#004975] tabular-nums">S/ {precioNormal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Pack Price */}
            <div>
              <label className="block text-sm font-bold text-[#004975] mb-2">
                Precio del Pack (S/) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">S/</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={precioPack}
                  onChange={e => setPrecioPack(e.target.value)}
                  placeholder="0.00"
                  className={`w-full pl-12 pr-4 border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#00C288] outline-none font-black text-lg tabular-nums ${errors.precio ? 'border-red-500' : 'border-gray-200'}`}
                />
              </div>
              {precioNormal > 0 && precioPack && parseFloat(precioPack) < precioNormal && (
                <p className="text-[11px] font-bold text-[#00C288] mt-1">
                  Ahorro: S/ {(precioNormal - parseFloat(precioPack)).toFixed(2)} ({((1 - parseFloat(precioPack) / precioNormal) * 100).toFixed(0)}% OFF)
                </p>
              )}
              {errors.precio && <p className="text-red-500 text-xs mt-1 font-bold">{errors.precio}</p>}
            </div>

            {/* Sessions count */}
            {tipo.startsWith('pack_sesiones') && (
              <div>
                <label className="block text-sm font-bold text-[#004975] mb-2">Total de Sesiones <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="2"
                  value={totalSesiones}
                  onChange={e => setTotalSesiones(e.target.value)}
                  placeholder="Ej: 5"
                  className={`w-full border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#00C288] outline-none font-bold text-sm ${errors.sesiones ? 'border-red-500' : 'border-gray-200'}`}
                />
                {totalSesiones && precioPack && parseInt(totalSesiones) > 0 && (
                  <p className="text-[11px] font-bold text-gray-400 mt-1">
                    Precio por sesion: S/ {(parseFloat(precioPack) / parseInt(totalSesiones)).toFixed(2)}
                  </p>
                )}
                {errors.sesiones && <p className="text-red-500 text-xs mt-1 font-bold">{errors.sesiones}</p>}
              </div>
            )}

            {/* Date range */}
            <div>
              <label className="block text-sm font-bold text-[#004975] mb-2">Vigencia (opcional)</label>
              <div className="flex items-center gap-2">
                <DatePicker value={fechaInicio} onChange={setFechaInicio} />
                <span className="text-xs font-bold text-gray-400">a</span>
                <DatePicker value={fechaFin} onChange={setFechaFin} />
              </div>
              {errors.fechaFin && <p className="text-red-500 text-xs mt-1 font-bold">{errors.fechaFin}</p>}
            </div>

            {/* Stock limite */}
            <div>
              <label className="block text-sm font-bold text-[#004975] mb-2">Cantidad límite (opcional)</label>
              <input
                type="number"
                min="1"
                value={stockTotal}
                onChange={e => setStockTotal(e.target.value)}
                placeholder="Ej: 50 (dejar vacío = ilimitado)"
                className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#00C288] outline-none font-bold text-sm"
              />
              <p className="text-[10px] font-bold text-gray-400 mt-1">
                {stockTotal ? `Se podrá usar ${stockTotal} veces en total` : 'Sin límite de uso'}
                {isEditing && packEnEdicion?.stock_usado ? ` · ${packEnEdicion.stock_usado} usados` : ''}
              </p>
            </div>

            {/* Descripcion */}
            <div>
              <label className="block text-sm font-bold text-[#004975] mb-2">Descripcion (opcional)</label>
              <textarea
                rows={2}
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Detalle de la oferta..."
                className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#00C288] outline-none text-sm font-medium resize-none"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-gray-100 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.02)] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-bold shadow-sm text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="pack-form"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-[#00C288] disabled:opacity-70 disabled:cursor-not-allowed text-white font-black rounded-xl hover:bg-[#00ab78] transition-all shadow-md flex items-center justify-center gap-2 text-sm"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              isEditing ? 'Actualizar Pack' : 'Crear Pack'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
