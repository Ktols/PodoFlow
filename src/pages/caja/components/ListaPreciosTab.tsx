import { useState, useEffect } from 'react';
import { Plus, Pencil, Package, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { ServicioDrawer } from './ServicioDrawer';
import { useBranchStore } from '../../../stores/branchStore';
import type { Servicio } from '../../../types/entities';

export function ListaPreciosTab() {
  const { sucursalActiva } = useBranchStore();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [servicioEnEdicion, setServicioEnEdicion] = useState<Servicio | null>(null);

  const fetchServicios = async () => {
    if (!sucursalActiva?.id) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('servicios')
      .select('*')
      .eq('sucursal_id', sucursalActiva.id)
      .order('nombre', { ascending: true });

    if (error) {
      toast.error('Error cargando lista de servicios');
      console.error(error);
    } else {
      setServicios(data as Servicio[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchServicios();
  }, [sucursalActiva?.id]);

  const filteredServicios = servicios.filter(s =>
    s.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return `S/ ${amount.toFixed(2)}`;
  };

  const handleEdit = (servicio: Servicio) => {
    setServicioEnEdicion(servicio);
    setIsDrawerOpen(true);
  };

  const handleNew = () => {
    setServicioEnEdicion(null);
    setIsDrawerOpen(true);
  };

  return (
    <>
      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-4 md:p-5 flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        <div className="flex-1 w-full md:w-auto relative">
          <input
            type="text"
            placeholder="Buscar servicio..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00C288] outline-none transition-all placeholder:text-gray-400 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        <button
          onClick={handleNew}
          className="w-full md:w-auto bg-[#00C288] hover:bg-[#00ab78] text-white px-4 py-2 md:px-6 md:py-2.5 rounded-xl flex items-center justify-center gap-2 font-black text-xs md:text-sm tracking-wide shadow-md transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          NUEVO SERVICIO
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#00C288] rounded-full animate-spin" />
          </div>
        ) : filteredServicios.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Package className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-black text-[#004975] mb-2">
              {searchTerm ? 'Sin resultados' : 'Sin servicios registrados'}
            </h3>
            <p className="text-gray-400 font-bold text-sm max-w-sm mx-auto">
              {searchTerm
                ? 'No se encontraron servicios con ese criterio de búsqueda.'
                : 'Comienza agregando tu primer servicio al catálogo de precios.'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleNew}
                className="mt-6 px-6 py-2.5 bg-[#00C288] text-white rounded-xl font-black tracking-wide shadow-md hover:bg-[#00ab78] transition-all hover:-translate-y-0.5 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Crear Primer Servicio
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Servicio
                  </th>
                  <th className="text-right px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Precio Base
                  </th>
                  <th className="text-center px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Estado
                  </th>
                  <th className="text-center px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] w-24">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredServicios.map((servicio, index) => (
                  <tr
                    key={servicio.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors group ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#004975]/5 rounded-xl flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-[#004975]" />
                        </div>
                        <span className="font-bold text-[#004975] text-sm">{servicio.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-[#004975] text-base tabular-nums">
                        {formatCurrency(servicio.precio_base)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border shadow-sm ${
                          servicio.estado
                            ? 'bg-[#00C288]/10 text-[#00C288] border-[#00C288]/20'
                            : 'bg-gray-100 text-gray-400 border-gray-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${servicio.estado ? 'bg-[#00C288]' : 'bg-gray-300'}`} />
                        {servicio.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleEdit(servicio)}
                        className="p-2.5 text-gray-300 hover:text-[#004975] hover:bg-[#004975]/5 rounded-xl transition-all group-hover:text-gray-400"
                        title="Editar Servicio"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer Summary */}
        {!isLoading && filteredServicios.length > 0 && (
          <div className="px-6 py-3.5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">
              {filteredServicios.length} servicio{filteredServicios.length !== 1 ? 's' : ''} registrado{filteredServicios.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs font-bold text-[#00C288]">
              {filteredServicios.filter(s => s.estado).length} activo{filteredServicios.filter(s => s.estado).length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Drawer */}
      <ServicioDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={fetchServicios}
        servicioEnEdicion={servicioEnEdicion}
      />
    </>
  );
}
