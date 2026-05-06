import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { VentaItem } from '../../../types/entities';

export function useProductCart(sucursalId: string | undefined) {
  const [items, setItems] = useState<VentaItem[]>([]);
  const [productoSearch, setProductoSearch] = useState('');
  const [productoResults, setProductoResults] = useState<{id:string, nombre:string, precio:number, stock:number}[]>([]);
  const [showProductoResults, setShowProductoResults] = useState(false);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const productoRef = useRef<HTMLDivElement>(null);

  // Click outside to close product dropdown
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (productoRef.current && !productoRef.current.contains(e.target as Node)) setShowProductoResults(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Producto search debounce
  useEffect(() => {
    if (productoSearch.length < 1) { setProductoResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('productos')
        .select('id, nombre, precio, stock')
        .eq('estado', true)
        .eq('sucursal_id', sucursalId)
        .or(`nombre.ilike.%${productoSearch}%,codigo.ilike.%${productoSearch}%`)
        .order('nombre')
        .limit(10);
      if (data) setProductoResults(data);
    }, 250);
    return () => clearTimeout(timer);
  }, [productoSearch, sucursalId]);

  const addItem = (producto: {id:string, nombre:string, precio:number, stock:number}) => {
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
      setStockMap(prev => ({ ...prev, [producto.id]: producto.stock }));
    }
    setProductoSearch('');
    setShowProductoResults(false);
  };

  const updateQty = (productoId: string, delta: number) => {
    const maxStock = stockMap[productoId] ?? Infinity;
    setItems(prev => prev.map(i => {
      if (i.producto_id !== productoId) return i;
      const newQty = Math.max(1, Math.min(maxStock, i.cantidad + delta));
      if (i.cantidad + delta > maxStock) toast.error(`Stock maximo: ${maxStock} unidades`);
      return { ...i, cantidad: newQty, subtotal: newQty * i.precio_unitario };
    }));
  };

  const removeItem = (productoId: string) => {
    setItems(prev => prev.filter(i => i.producto_id !== productoId));
  };

  const reset = () => {
    setItems([]);
    setProductoSearch('');
    setStockMap({});
  };

  return {
    items,
    setItems,
    productoSearch,
    setProductoSearch,
    productoResults,
    showProductoResults,
    setShowProductoResults,
    stockMap,
    productoRef,
    addItem,
    updateQty,
    removeItem,
    reset,
  };
}
