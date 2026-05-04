import { useState, useEffect } from 'react';
import { Plus, Pencil, Package, Search, Trash2, AlertTriangle, Download, X, Boxes } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { ProductoDrawer } from './ProductoDrawer';
import { CATEGORIAS_PRODUCTO } from '../../../constants';
import { ExportModal } from '../../../components/ExportModal';
import { useAuthStore } from '../../../stores/authStore';
import { useBranchStore } from '../../../stores/branchStore';
import type { CsvColumn } from '../../../lib/exportCsv';
import type { Producto } from '../../../types/entities';

type StockFilter = 'todos' | 'en_stock' | 'stock_bajo' | 'sin_stock';

export function ProductosTab() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterStock, setFilterStock] = useState<StockFilter>('todos');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [productoEnEdicion, setProductoEnEdicion] = useState<Producto | null>(null);
  const [productoAEliminar, setProductoAEliminar] = useState<Producto | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const { perfil } = useAuthStore();
  const { sucursalActiva } = useBranchStore();
  const isDueno = perfil?.rol_nombre === 'dueno';

  const fetchProductos = async () => {
    if (!sucursalActiva?.id) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('sucursal_id', sucursalActiva.id)
      .order('nombre', { ascending: true });

    if (error) {
      toast.error('Error cargando productos');
      console.error(error);
    } else {
      setProductos(data as Producto[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProductos();
  }, [sucursalActiva?.id]);

  const getStockStatus = (p: Producto): StockFilter => {
    if (p.stock === 0) return 'sin_stock';
    if (p.stock <= p.stock_minimo && p.stock_minimo > 0) return 'stock_bajo';
    return 'en_stock';
  };

  const productosFiltrados = productos.filter(p => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matches = p.nombre.toLowerCase().includes(term) ||
        (p.codigo || '').toLowerCase().includes(term) ||
        (p.descripcion || '').toLowerCase().includes(term);
      if (!matches) return false;
    }
    if (filterCategoria && p.categoria !== filterCategoria) return false;
    if (filterEstado === 'activo' && !p.estado) return false;
    if (filterEstado === 'inactivo' && p.estado) return false;
    if (filterStock !== 'todos' && getStockStatus(p) !== filterStock) return false;
    return true;
  });

  const hayFiltros = searchTerm || filterCategoria || filterEstado || filterStock !== 'todos';

  const limpiarFiltros = () => {
    setSearchTerm('');
    setFilterCategoria('');
    setFilterEstado('');
    setFilterStock('todos');
  };

  // Stock counts (sobre todos los productos, sin filtros, para los pills)
  const stockCounts = {
    todos: productos.length,
    en_stock: productos.filter(p => getStockStatus(p) === 'en_stock').length,
    stock_bajo: productos.filter(p => getStockStatus(p) === 'stock_bajo').length,
    sin_stock: productos.filter(p => getStockStatus(p) === 'sin_stock').length,
  };

  const formatCurrency = (amount: number) => `S/ ${amount.toFixed(2)}`;

  const handleEdit = (producto: Producto) => {
    setProductoEnEdicion(producto);
    setIsDrawerOpen(true);
  };

  const handleNew = () => {
    setProductoEnEdicion(null);
    setIsDrawerOpen(true);
  };

  const handleDelete = async () => {
    if (!productoAEliminar) return;
    const { error } = await supabase.from('productos').delete().eq('id', productoAEliminar.id);
    if (error) {
      toast.error('Error al eliminar producto');
      console.error(error);
    } else {
      toast.success('Producto eliminado');
      fetchProductos();
    }
    setProductoAEliminar(null);
  };

  const productoCsvColumns: CsvColumn<Producto>[] = [
    { key: 'codigo', header: 'Código' },
    { key: 'nombre', header: 'Nombre' },
    { key: 'categoria', header: 'Categoría' },
    { key: 'descripcion', header: 'Descripción' },
    { key: '', header: 'Precio', format: (r) => `S/ ${r.precio.toFixed(2)}` },
    { key: 'stock', header: 'Stock' },
    { key: 'stock_minimo', header: 'Stock Mínimo' },
    { key: '', header: 'Estado', format: (r) => r.estado ? 'Activo' : 'Inactivo' },
    { key: '', header: 'Estado Stock', format: (r) => {
      const s = getStockStatus(r);
      return s === 'sin_stock' ? 'Sin stock' : s === 'stock_bajo' ? 'Stock bajo' : 'En stock';
    }},
  ];

  const fetchExportProductos = async (): Promise<Producto[]> => productosFiltrados;

  return (
    <>
      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-4 md:p-5 mb-6 space-y-4">
        {/* Pills de stock */}
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { key: 'todos', label: 'Todos', count: stockCounts.todos, activeColor: 'bg-[#004975] text-white border-[#004975]', inactiveColor: 'text-[#004975]' },
            { key: 'en_stock', label: 'En Stock', count: stockCounts.en_stock, activeColor: 'bg-[#00C288] text-white border-[#00C288]', inactiveColor: 'text-[#00C288]' },
            { key: 'stock_bajo', label: 'Stock Bajo', count: stockCounts.stock_bajo, activeColor: 'bg-orange-500 text-white border-orange-500', inactiveColor: 'text-orange-600' },
            { key: 'sin_stock', label: 'Sin Stock', count: stockCounts.sin_stock, activeColor: 'bg-red-500 text-white border-red-500', inactiveColor: 'text-red-600' },
          ] as const).map(pill => {
            const isActive = filterStock === pill.key;
            return (
              <button
                key={pill.key}
                onClick={() => setFilterStock(pill.key)}
                className={`px-4 py-2 rounded-xl border font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm ${
                  isActive ? pill.activeColor + ' shadow-md' : `bg-white border-gray-200 ${pill.inactiveColor} hover:border-gray-300`
                }`}
              >
                {pill.label}
                <span className={`tabular-nums px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                  {pill.count}
                </span>
              </button>
            );
          })}
          {hayFiltros && (
            <button
              onClick={limpiarFiltros}
              className="ml-auto text-xs font-bold text-[#004975] hover:text-[#00C288] transition-colors flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Limpiar filtros
            </button>
          )}
        </div>

        {/* Buscador + dropdowns + acciones */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar por nombre, código o descripción..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00C288] outline-none transition-all placeholder:text-gray-400 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="md:w-56 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-[#00C288] transition-colors"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIAS_PRODUCTO.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="md:w-44 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-[#00C288] transition-colors"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
          {isDueno && (
            <button
              onClick={() => setIsExportOpen(true)}
              className="bg-white hover:bg-gray-50 text-[#004975] px-3 py-2 md:px-4 md:py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs md:text-sm border border-gray-200 shadow-sm transition-colors shrink-0"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          )}
          <button
            onClick={handleNew}
            className="bg-[#00C288] hover:bg-[#00ab78] text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs md:text-sm tracking-wide shadow-md transition-all hover:-translate-y-0.5 shrink-0"
          >
            <Plus className="w-5 h-5" />
            NUEVO PRODUCTO
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#00C288] rounded-full animate-spin" />
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Package className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-black text-[#004975] mb-2">
              {hayFiltros ? 'Sin coincidencias' : 'Sin productos registrados'}
            </h3>
            <p className="text-gray-400 font-bold text-sm max-w-sm mx-auto">
              {hayFiltros
                ? 'Ningún producto coincide con los filtros aplicados.'
                : 'Comienza agregando tu primer producto al inventario.'}
            </p>
            {hayFiltros ? (
              <button
                onClick={limpiarFiltros}
                className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-bold text-sm transition-colors inline-flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Limpiar Filtros
              </button>
            ) : (
              <button
                onClick={handleNew}
                className="mt-6 px-6 py-2.5 bg-[#00C288] text-white rounded-xl font-black tracking-wide shadow-md hover:bg-[#00ab78] transition-all hover:-translate-y-0.5 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Crear Primer Producto
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Producto</th>
                  <th className="text-left px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Categoría</th>
                  <th className="text-right px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Precio</th>
                  <th className="text-center px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Stock</th>
                  <th className="text-center px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Estado</th>
                  <th className="text-center px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] w-32">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map((producto, index) => {
                  const stockStatus = getStockStatus(producto);
                  return (
                    <tr
                      key={producto.id}
                      className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors group ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#004975]/5 rounded-xl flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-[#004975]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#004975] text-sm truncate">{producto.nombre}</p>
                            {producto.codigo && (
                              <p className="text-[10px] font-bold text-gray-400 mt-0.5 tracking-wider">{producto.codigo}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-600">
                          {producto.categoria}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-black text-[#004975] text-base tabular-nums">{formatCurrency(producto.precio)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black tabular-nums border shadow-sm ${
                            stockStatus === 'sin_stock' ? 'bg-red-50 text-red-600 border-red-200' :
                            stockStatus === 'stock_bajo' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                            'bg-[#00C288]/10 text-[#00C288] border-[#00C288]/20'
                          }`}>
                            <Boxes className="w-3.5 h-3.5" />
                            {producto.stock}
                          </span>
                          {stockStatus === 'stock_bajo' && (
                            <span className="text-[9px] font-black text-orange-600 uppercase tracking-wider flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> Bajo
                            </span>
                          )}
                          {stockStatus === 'sin_stock' && (
                            <span className="text-[9px] font-black text-red-600 uppercase tracking-wider">
                              Agotado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border shadow-sm ${
                          producto.estado
                            ? 'bg-[#00C288]/10 text-[#00C288] border-[#00C288]/20'
                            : 'bg-gray-100 text-gray-400 border-gray-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-2 ${producto.estado ? 'bg-[#00C288]' : 'bg-gray-300'}`} />
                          {producto.estado ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(producto)}
                            className="p-2.5 text-gray-300 hover:text-[#004975] hover:bg-[#004975]/5 rounded-xl transition-all group-hover:text-gray-400"
                            title="Editar Producto"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setProductoAEliminar(producto)}
                            className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group-hover:text-gray-400"
                            title="Eliminar Producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary */}
        {!isLoading && productosFiltrados.length > 0 && (
          <div className="px-6 py-3.5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs font-bold text-gray-400">
              {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''}
              {hayFiltros && productos.length !== productosFiltrados.length && ` de ${productos.length}`}
            </span>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-[#00C288]">{productosFiltrados.filter(p => p.estado).length} activos</span>
              <span className="text-orange-500">{productosFiltrados.filter(p => getStockStatus(p) === 'stock_bajo').length} stock bajo</span>
              <span className="text-red-500">{productosFiltrados.filter(p => getStockStatus(p) === 'sin_stock').length} agotados</span>
            </div>
          </div>
        )}
      </div>

      {/* Drawer CRUD */}
      <ProductoDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={fetchProductos}
        productoEnEdicion={productoEnEdicion}
      />

      {/* Modal Confirmar Eliminar */}
      {productoAEliminar && (
        <div className="fixed inset-0 bg-[#004975]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setProductoAEliminar(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-red-50 border border-red-100">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-[#004975] mb-2">¿Eliminar producto?</h3>
              <p className="text-gray-500 font-bold text-sm mb-2">
                "{productoAEliminar.nombre}"
              </p>
              <p className="text-gray-400 font-medium text-xs mb-8">
                Esta acción no se puede deshacer y se eliminará permanentemente del inventario.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setProductoAEliminar(null)}
                  className="flex-1 py-3.5 bg-gray-50 text-gray-600 hover:bg-gray-100 font-black rounded-xl border border-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3.5 text-white font-black rounded-xl shadow-md transition-all hover:-translate-y-0.5 bg-red-500 hover:bg-red-600 shadow-red-500/20"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Exportar Productos"
        columns={productoCsvColumns}
        fetchData={fetchExportProductos}
        filename={`productos_${new Date().toISOString().split('T')[0]}`}
      >
        <p className="text-xs font-bold text-gray-500">
          Se exportarán los <span className="text-[#004975] font-black">{productosFiltrados.length}</span> productos que coinciden con los filtros actuales.
        </p>
      </ExportModal>
    </>
  );
}
