import { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { VentaItem } from '../../../types/entities';
import { METODOS_PAGO_NOMBRES } from '../../../constants';
import { useBranchStore } from '../../../stores/branchStore';

interface PacienteMin {
  id: string;
  nombres: string;
  apellidos: string;
  numero_documento: string;
}

interface ProductoMin {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
}

interface VentaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function VentaDrawer({ isOpen, onClose, onSuccess }: VentaDrawerProps) {
  const [items, setItems] = useState<VentaItem[]>([]);
  const [descuento, setDescuento] = useState('0');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { sucursalActiva } = useBranchStore();

  // Paciente search
  const [pacienteSearch, setPacienteSearch] = useState('');
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [pacienteNombre, setPacienteNombre] = useState('');
  const [pacienteResults, setPacienteResults] = useState<PacienteMin[]>([]);
  const [showPacienteResults, setShowPacienteResults] = useState(false);
  const pacienteRef = useRef<HTMLDivElement>(null);

  // Producto search
  const [productoSearch, setProductoSearch] = useState('');
  const [productoResults, setProductoResults] = useState<ProductoMin[]>([]);
  const [showProductoResults, setShowProductoResults] = useState(false);
  const productoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setItems([]);
      setDescuento('0');
      setMetodoPago('Efectivo');
      setNotas('');
      setPacienteId(null);
      setPacienteNombre('');
      setPacienteSearch('');
      setProductoSearch('');
    }
  }, [isOpen]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pacienteRef.current && !pacienteRef.current.contains(e.target as Node)) setShowPacienteResults(false);
      if (productoRef.current && !productoRef.current.contains(e.target as Node)) setShowProductoResults(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Paciente search debounce
  useEffect(() => {
    if (pacienteSearch.length < 2) { setPacienteResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('pacientes')
        .select('id, nombres, apellidos, numero_documento')
        .or(`nombres.ilike.%${pacienteSearch}%,apellidos.ilike.%${pacienteSearch}%,numero_documento.ilike.%${pacienteSearch}%`)
        .limit(8);
      if (data) setPacienteResults(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [pacienteSearch]);

  // Producto search debounce
  useEffect(() => {
    if (productoSearch.length < 1) { setProductoResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('productos')
        .select('id, nombre, precio, stock')
        .eq('estado', true)
        .eq('sucursal_id', sucursalActiva?.id)
        .gt('stock', 0)
        .or(`nombre.ilike.%${productoSearch}%,codigo.ilike.%${productoSearch}%`)
        .order('nombre')
        .limit(10);
      if (data) setProductoResults(data);
    }, 250);
    return () => clearTimeout(timer);
  }, [productoSearch]);

  const addItem = (producto: ProductoMin) => {
    const existing = items.find(i => i.producto_id === producto.id);
    if (existing) {
      if (existing.cantidad >= producto.stock) {
        toast.error(`Stock insuficiente (${producto.stock} disponibles)`);
        return;
      }
      setItems(items.map(i =>
        i.producto_id === producto.id
          ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
          : i
      ));
    } else {
      setItems([...items, {
        producto_id: producto.id,
        nombre: producto.nombre,
        precio_unitario: producto.precio,
        cantidad: 1,
        subtotal: producto.precio,
      }]);
    }
    setProductoSearch('');
    setShowProductoResults(false);
  };

  const updateQty = (productoId: string, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.producto_id !== productoId) return i;
      const newQty = Math.max(1, i.cantidad + delta);
      return { ...i, cantidad: newQty, subtotal: newQty * i.precio_unitario };
    }));
  };

  const removeItem = (productoId: string) => {
    setItems(prev => prev.filter(i => i.producto_id !== productoId));
  };

  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const descuentoNum = parseFloat(descuento) || 0;
  const total = Math.max(0, subtotal - descuentoNum);

  const formatCurrency = (n: number) => `S/ ${n.toFixed(2)}`;

  const handleSubmit = async () => {
    if (items.length === 0) { toast.error('Agrega al menos un producto'); return; }
    setIsSubmitting(true);

    try {
      // Insert venta
      const { error: ventaError } = await supabase.from('ventas').insert([{
        paciente_id: pacienteId || null,
        sucursal_id: sucursalActiva?.id || null,
        items: items.map(i => ({
          producto_id: i.producto_id,
          nombre: i.nombre,
          precio_unitario: i.precio_unitario,
          cantidad: i.cantidad,
          subtotal: i.subtotal,
        })),
        subtotal,
        descuento: descuentoNum,
        total,
        metodo_pago: metodoPago,
        estado: 'Completada',
        notas: notas.trim() || null,
      }]);

      if (ventaError) throw ventaError;

      // Decrement stock for each item
      for (const item of items) {
        const { data: prod } = await supabase.from('productos').select('stock').eq('id', item.producto_id).single();
        if (prod) {
          await supabase.from('productos').update({ stock: Math.max(0, prod.stock - item.cantidad) }).eq('id', item.producto_id);
        }
      }

      toast.success('Venta registrada exitosamente');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error('Error al registrar la venta');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full md:w-[540px] bg-white shadow-2xl z-[10000] flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00C288]/10 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-[#00C288]" />
            </div>
            <h2 className="text-xl font-black text-[#004975]">Nueva Venta</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Paciente (opcional) */}
          <div ref={pacienteRef} className="relative">
            <label className="block text-sm font-bold text-[#004975] mb-2">Paciente (opcional)</label>
            {pacienteId ? (
              <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                <p className="font-bold text-[#004975] text-sm">{pacienteNombre}</p>
                <button type="button" onClick={() => { setPacienteId(null); setPacienteNombre(''); }}
                  className="text-xs text-[#004975] bg-white hover:bg-gray-50 font-bold px-3 py-1.5 rounded border border-gray-200 shadow-sm transition-colors">
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="Buscar paciente por nombre o documento..."
                    value={pacienteSearch}
                    onChange={(e) => { setPacienteSearch(e.target.value); setShowPacienteResults(true); }}
                    onFocus={() => setShowPacienteResults(true)}
                    className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00C288] focus:bg-white outline-none transition-all" />
                </div>
                {showPacienteResults && pacienteSearch.length >= 2 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                    {pacienteResults.length === 0 ? (
                      <p className="p-3 text-sm text-gray-400 text-center">Sin resultados</p>
                    ) : pacienteResults.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => { setPacienteId(p.id); setPacienteNombre(`${p.nombres} ${p.apellidos}`); setPacienteSearch(''); setShowPacienteResults(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-[#00C288]/5 border-b border-gray-50 last:border-0 transition-colors">
                        <p className="font-bold text-[#004975] text-sm">{p.nombres} {p.apellidos}</p>
                        <p className="text-[11px] text-gray-400 font-bold">DOC: {p.numero_documento}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Agregar productos */}
          <div ref={productoRef} className="relative">
            <label className="block text-sm font-bold text-[#004975] mb-2">Agregar Productos</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Buscar producto por nombre o código..."
                value={productoSearch}
                onChange={(e) => { setProductoSearch(e.target.value); setShowProductoResults(true); }}
                onFocus={() => setShowProductoResults(true)}
                className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00C288] focus:bg-white outline-none transition-all" />
            </div>
            {showProductoResults && productoSearch.length >= 1 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                {productoResults.length === 0 ? (
                  <p className="p-3 text-sm text-gray-400 text-center">Sin resultados</p>
                ) : productoResults.map(p => (
                  <button key={p.id} type="button" onClick={() => addItem(p)}
                    className="w-full text-left px-4 py-3 hover:bg-[#00C288]/5 border-b border-gray-50 last:border-0 transition-colors flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#004975] text-sm">{p.nombre}</p>
                      <p className="text-[11px] text-gray-400 font-bold">Stock: {p.stock}</p>
                    </div>
                    <span className="font-black text-[#004975] text-sm tabular-nums">{formatCurrency(p.precio)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-100/50">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">
                  {items.length} producto{items.length !== 1 ? 's' : ''} en la venta
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map(item => (
                  <div key={item.producto_id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#004975] text-sm truncate">{item.nombre}</p>
                      <p className="text-[11px] text-gray-400 font-bold">{formatCurrency(item.precio_unitario)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button" onClick={() => updateQty(item.producto_id, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-black text-[#004975] text-sm tabular-nums">{item.cantidad}</span>
                      <button type="button" onClick={() => updateQty(item.producto_id, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="font-black text-[#004975] text-sm tabular-nums w-20 text-right">{formatCurrency(item.subtotal)}</span>
                    <button type="button" onClick={() => removeItem(item.producto_id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {items.length === 0 && (
            <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-400">Busca y agrega productos a la venta</p>
            </div>
          )}

          {/* Descuento + Metodo Pago */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#004975] mb-1.5">Descuento (S/)</label>
              <input type="number" min="0" step="0.01" value={descuento}
                onChange={(e) => setDescuento(e.target.value)}
                className="w-full border border-gray-200 bg-gray-50 focus:bg-white rounded-xl py-2.5 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#00C288] tabular-nums" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#004975] mb-1.5">Método de Pago</label>
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full border border-gray-200 bg-gray-50 focus:bg-white rounded-xl py-2.5 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#00C288]">
                {METODOS_PAGO_NOMBRES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold text-[#004975] mb-1.5">Notas (opcional)</label>
            <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones de la venta..."
              className="w-full border border-gray-200 bg-gray-50 focus:bg-white rounded-xl py-2.5 px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#00C288] resize-none" />
          </div>
        </div>

        {/* Footer - Totals + Submit */}
        <div className="border-t border-gray-100 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
          {/* Totals */}
          <div className="px-6 pt-4 pb-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 font-bold">Subtotal</span>
              <span className="font-bold text-gray-600 tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            {descuentoNum > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-orange-500 font-bold">Descuento</span>
                <span className="font-bold text-orange-500 tabular-nums">- {formatCurrency(descuentoNum)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <span className="text-[#004975] font-black text-lg">Total</span>
              <span className="font-black text-[#00C288] text-xl tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="px-6 pb-5 pt-2 flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-bold shadow-sm">
              Cancelar
            </button>
            <button type="button" onClick={handleSubmit} disabled={isSubmitting || items.length === 0}
              className="flex-1 py-3 bg-[#00C288] hover:bg-[#00ab78] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Registrar Venta
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
