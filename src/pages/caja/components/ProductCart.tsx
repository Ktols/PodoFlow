import { Search, Plus, Minus, Trash2, Package } from 'lucide-react';
import type { VentaItem } from '../../../types/entities';

interface ProductoRecetado {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
}

interface ProductCartProps {
  productoRef: React.RefObject<HTMLDivElement | null>;
  productosRecetados: ProductoRecetado[];
  productoSearch: string;
  setProductoSearch: (value: string) => void;
  productoResults: {id:string, nombre:string, precio:number, stock:number}[];
  showProductoResults: boolean;
  setShowProductoResults: (value: boolean) => void;
  items: VentaItem[];
  stockMap: Record<string, number>;
  onAddItem: (producto: {id:string, nombre:string, precio:number, stock:number}) => void;
  onUpdateQty: (productoId: string, delta: number) => void;
  onRemoveItem: (productoId: string) => void;
}

export function ProductCart({
  productoRef,
  productosRecetados,
  productoSearch,
  setProductoSearch,
  productoResults,
  showProductoResults,
  setShowProductoResults,
  items,
  stockMap,
  onAddItem,
  onUpdateQty,
  onRemoveItem,
}: ProductCartProps) {
  return (
    <div ref={productoRef} className="relative">
      <label className="block text-sm font-bold text-[#004975] mb-2 flex items-center gap-2">
        <Package className="w-4 h-4 text-purple-500" />
        Agregar Productos
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-full">Opcional</span>
      </label>

      {/* Productos Recetados como sugerencias */}
      {productosRecetados.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="text-xs font-bold text-gray-500 flex items-center h-7">Recetados:</span>
          {productosRecetados.map(p => {
            const agotado = p.stock <= 0;
            return (
              <button
                key={`sug-${p.id}`}
                type="button"
                disabled={agotado}
                onClick={() => !agotado && onAddItem(p)}
                className={`text-[11px] font-bold px-3 h-7 rounded-full border transition-all flex items-center gap-1 ${
                  agotado ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                }`}
              >
                <Plus className="w-3 h-3" />
                {p.nombre}
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input type="text" placeholder="Buscar producto por nombre..."
          value={productoSearch}
          onChange={(e) => { setProductoSearch(e.target.value); setShowProductoResults(true); }}
          onFocus={() => setShowProductoResults(true)}
          className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00C288] focus:bg-white outline-none transition-all" />
      </div>
      {showProductoResults && productoSearch.length >= 1 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          {productoResults.length === 0 ? (
            <p className="p-3 text-sm text-gray-400 text-center">Sin resultados</p>
          ) : productoResults.map(p => {
            const agotado = p.stock <= 0;
            return (
              <button key={p.id} type="button"
                disabled={agotado}
                onClick={() => !agotado && onAddItem(p)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 transition-colors flex items-center justify-between ${
                  agotado ? 'cursor-not-allowed bg-gray-50' : 'hover:bg-[#00C288]/5'
                }`}>
                <div>
                  <p className={`font-bold text-sm ${agotado ? 'text-gray-500' : 'text-[#004975]'}`}>{p.nombre}</p>
                  <p className="text-[11px] font-bold">
                    {agotado ? <span className="text-red-600 bg-red-100 px-1.5 py-0.5 rounded text-[10px] font-black uppercase">Agotado</span> : <span className="text-gray-400">Stock: {p.stock}</span>}
                  </p>
                </div>
                <span className={`font-black text-sm tabular-nums ${agotado ? 'text-gray-400 line-through' : 'text-[#004975]'}`}>S/ {p.precio.toFixed(2)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Cart items */}
      {items.length > 0 && (
        <div className="mt-3 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2 bg-gray-100/50 border-b border-gray-200">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">
              {items.length} producto{items.length !== 1 ? 's' : ''} en el cobro
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {items.map(item => {
              const maxStock = stockMap[item.producto_id] ?? Infinity;
              const atMax = item.cantidad >= maxStock;
              return (
                <div key={item.producto_id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#004975] text-sm truncate">{item.nombre}</p>
                    <p className="text-[11px] text-gray-400 font-bold">S/ {item.precio_unitario.toFixed(2)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={() => onUpdateQty(item.producto_id, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-black text-[#004975] text-sm tabular-nums">{item.cantidad}</span>
                    <button type="button" onClick={() => onUpdateQty(item.producto_id, 1)}
                      disabled={atMax}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors ${
                        atMax ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed' : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-500'
                      }`}>
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="font-black text-[#004975] text-sm tabular-nums w-20 text-right">S/ {item.subtotal.toFixed(2)}</span>
                  <button type="button" onClick={() => onRemoveItem(item.producto_id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
