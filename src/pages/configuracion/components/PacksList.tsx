import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Power, Gift, Package, Repeat } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useBranchStore } from '../../../stores/branchStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Pack, PackTipo } from '../../../types/entities';
import { PACK_TYPES } from '../../../constants';
import { PackDrawer } from './PackDrawer';

const TIPO_CONFIG: Record<PackTipo, { icon: typeof Gift; color: string; border: string }> = {
  pack_servicios: { icon: Package, color: 'bg-blue-50 text-blue-700', border: 'border-blue-200' },
  pack_sesiones_prepago: { icon: Repeat, color: 'bg-purple-50 text-purple-700', border: 'border-purple-200' },
  pack_sesiones_fraccionado: { icon: Repeat, color: 'bg-indigo-50 text-indigo-700', border: 'border-indigo-200' },
};

type FilterTab = 'activos' | 'inactivos' | 'todos';

export function PacksList() {
  const { sucursalActiva } = useBranchStore();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('activos');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [packEnEdicion, setPackEnEdicion] = useState<Pack | null>(null);

  const fetchPacks = async () => {
    if (!sucursalActiva?.id) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('packs_promociones')
      .select(`*, pack_items (id, servicio_id, producto_id, cantidad, servicios:servicio_id (id, nombre, precio_base), productos:producto_id (id, nombre, precio))`)
      .eq('sucursal_id', sucursalActiva.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error al cargar packs');
      console.error(error);
    } else {
      setPacks((data || []) as Pack[]);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchPacks(); }, [sucursalActiva?.id]);

  const toggleEstado = async (pack: Pack) => {
    const { error } = await supabase
      .from('packs_promociones')
      .update({ estado: !pack.estado })
      .eq('id', pack.id);

    if (error) {
      toast.error('Error al actualizar estado');
    } else {
      toast.success(pack.estado ? 'Pack desactivado' : 'Pack activado');
      fetchPacks();
    }
  };

  const packsFiltrados = packs.filter(p => {
    if (filterTab === 'activos' && !p.estado) return false;
    if (filterTab === 'inactivos' && p.estado) return false;
    if (filterTipo && p.tipo !== filterTipo) return false;
    if (searchTerm && !p.nombre.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getPackLabel = (tipo: PackTipo) => PACK_TYPES.find(t => t.value === tipo)?.label || tipo;

  const getPackPriceDisplay = (pack: Pack) => {
    return pack.precio_pack ? `S/ ${pack.precio_pack.toFixed(2)}` : '-';
  };

  const isExpired = (pack: Pack) => {
    if (!pack.fecha_fin) return false;
    return new Date(pack.fecha_fin) < new Date();
  };

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-4 md:p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {(['activos', 'inactivos', 'todos'] as FilterTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  filterTab === tab
                    ? 'bg-[#004975] text-white shadow-md'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {tab} {tab === 'activos' ? packsFiltrados.length : ''}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setPackEnEdicion(null); setIsDrawerOpen(true); }}
            className="bg-[#00C288] hover:bg-[#00ab78] text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs md:text-sm tracking-wide shadow-md transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            Nuevo Pack
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00C288] outline-none transition-all placeholder:text-gray-400 font-medium"
            />
          </div>
          <select
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value)}
            className="w-full md:w-56 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#00C288] font-medium text-gray-700 text-sm"
          >
            <option value="">Todos los tipos</option>
            {PACK_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#00C288] rounded-full animate-spin" />
        </div>
      ) : packsFiltrados.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Gift className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-xl font-black text-[#004975] mb-2">Sin resultados</h3>
          <p className="text-gray-400 font-bold text-sm">No hay packs que coincidan con los filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packsFiltrados.map(pack => {
            const config = TIPO_CONFIG[pack.tipo];
            const Icon = config.icon;
            const expired = isExpired(pack);
            const items = pack.pack_items || [];
            const serviciosCount = items.filter(i => i.servicio_id).length;
            const productosCount = items.filter(i => i.producto_id).length;

            return (
              <div
                key={pack.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md ${
                  !pack.estado ? 'opacity-60' : expired ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-[#004975] text-sm">{pack.nombre}</h3>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.color} ${config.border}`}>
                        {getPackLabel(pack.tipo)}
                      </span>
                    </div>
                  </div>
                  <span className="font-black text-[#00C288] text-lg tabular-nums">
                    {getPackPriceDisplay(pack)}
                  </span>
                </div>

                {/* Items summary */}
                {(serviciosCount > 0 || productosCount > 0) && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {items.map(item => (
                      <span key={item.id} className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {item.servicios?.nombre || item.productos?.nombre}
                        {item.cantidad > 1 && ` x${item.cantidad}`}
                      </span>
                    ))}
                  </div>
                )}

                {/* Sessions info */}
                {pack.total_sesiones && (
                  <p className="text-xs font-bold text-gray-500 mb-3">
                    {pack.total_sesiones} sesiones
                    {pack.tipo === 'pack_sesiones_prepago' && ' (prepago)'}
                    {pack.tipo === 'pack_sesiones_fraccionado' && pack.precio_pack && ` · S/ ${(pack.precio_pack / pack.total_sesiones).toFixed(2)} c/u`}
                  </p>
                )}

                {/* Date range */}
                {pack.fecha_inicio && (
                  <p className={`text-[11px] font-bold mb-3 ${expired ? 'text-red-500' : 'text-gray-400'}`}>
                    {expired && '⚠ Vencida · '}
                    {format(new Date(pack.fecha_inicio + 'T12:00:00'), "d MMM", { locale: es })}
                    {pack.fecha_fin && ` — ${format(new Date(pack.fecha_fin + 'T12:00:00'), "d MMM yyyy", { locale: es })}`}
                  </p>
                )}

                {/* Stock */}
                {pack.stock_total && (
                  <p className={`text-[11px] font-bold mb-3 ${(pack.stock_usado || 0) >= pack.stock_total ? 'text-red-500' : 'text-gray-400'}`}>
                    {(pack.stock_usado || 0) >= pack.stock_total
                      ? '⚠ Agotado'
                      : `${pack.stock_total - (pack.stock_usado || 0)} disponibles de ${pack.stock_total}`}
                  </p>
                )}

                {pack.descripcion && (
                  <p className="text-xs text-gray-400 mb-3 line-clamp-2">{pack.descripcion}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => { setPackEnEdicion(pack); setIsDrawerOpen(true); }}
                    className="flex items-center gap-1.5 text-[11px] font-black text-[#004975] hover:text-[#00C288] uppercase tracking-wider transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => toggleEstado(pack)}
                    className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider transition-colors ml-auto ${
                      pack.estado ? 'text-red-400 hover:text-red-600' : 'text-[#00C288] hover:text-[#00ab78]'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {pack.estado ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PackDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={fetchPacks}
        packEnEdicion={packEnEdicion}
      />
    </>
  );
}
