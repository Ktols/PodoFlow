import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Search, Download } from 'lucide-react';
import { EspecialistaDrawer } from './components/EspecialistaDrawer';
import { ExportModal } from '../../components/ExportModal';
import { useAuthStore } from '../../stores/authStore';
import { useBranchStore } from '../../stores/branchStore';
import type { CsvColumn } from '../../lib/exportCsv';
import type { Especialista } from '../../types/entities';

export function EspecialistasPage() {
  const [especialistas, setEspecialistas] = useState<Especialista[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [especialistaToEdit, setEspecialistaToEdit] = useState<Especialista | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportEstadoFilter, setExportEstadoFilter] = useState('');
  const [exportFilterTrigger, setExportFilterTrigger] = useState(0);

  const { perfil } = useAuthStore();
  const { sucursalActiva } = useBranchStore();
  const isDueno = perfil?.rol_nombre === 'dueno';

  const especialistaCsvColumns: CsvColumn<Especialista>[] = [
    { key: 'nombres', header: 'Nombres' },
    { key: 'dni', header: 'DNI' },
    { key: 'especialidad', header: 'Especialidad' },
    { key: 'telefono', header: 'Teléfono' },
    { key: 'correo', header: 'Correo' },
    { key: '', header: 'Estado', format: (r) => r.estado ? 'Activo' : 'Inactivo' },
  ];

  const fetchExportEspecialistas = async (): Promise<Especialista[]> => {
    if (!sucursalActiva?.id) return [];
    let query = supabase
      .from('podologos')
      .select('*, sucursal_podologos!inner(sucursal_id)')
      .eq('sucursal_podologos.sucursal_id', sucursalActiva.id)
      .order('nombres');
      
    if (exportEstadoFilter === 'activo') query = query.eq('estado', true);
    if (exportEstadoFilter === 'inactivo') query = query.eq('estado', false);
    const { data, error } = await query;
    if (error || !data) return [];
    return data as Especialista[];
  };

  const fetchEspecialistas = async () => {
    if (!sucursalActiva?.id) return;
    try {
      setLoading(true);
      let query = supabase
        .from('podologos')
        .select('*, sucursal_podologos!inner(sucursal_id)')
        .eq('sucursal_podologos.sucursal_id', sucursalActiva.id)
        .order('nombres', { ascending: true });
      
      if (searchTerm) {
        query = query.or(`nombres.ilike.%${searchTerm}%,dni.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setEspecialistas(data as Especialista[] || []);
    } catch (err) {
      console.error('Error fetching especialistas:', err);
      toast.error('Error al cargar los especialistas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEspecialistas();
  }, [searchTerm, sucursalActiva?.id]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary tracking-tight">Directorio de Personal</h1>
          <p className="text-gray-500 mt-1">Gestión de especialistas y colores de agenda</p>
        </div>
        <div className="flex items-center gap-3">
          {isDueno && (
            <button
              onClick={() => setIsExportOpen(true)}
              className="bg-white hover:bg-gray-50 text-[#004975] px-3 py-2 md:px-4 md:py-2.5 rounded-xl flex items-center gap-1.5 font-bold text-xs md:text-sm border border-gray-200 shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          )}
          <button
            onClick={() => { setEspecialistaToEdit(null); setIsDrawerOpen(true); }}
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl hover:bg-[#00ab78] transition-colors font-semibold text-xs md:text-sm shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Nuevo Especialista
          </button>
        </div>
      </div>

      <div className="max-w-md relative">
        <input 
          type="text" 
          placeholder="Buscar por nombre o DNI..." 
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Especialista</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">DNI</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Color</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Cargando directorio...</span>
                    </div>
                  </td>
                </tr>
              ) : especialistas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-medium bg-gray-50/50">
                    No se encontraron especialistas registrados.
                  </td>
                </tr>
              ) : (
                especialistas.map((esp) => (
                  <tr key={esp.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-secondary text-[15px]">{esp.nombres}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px] font-medium">{esp.especialidad || 'Podología general'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">{esp.dni}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{esp.telefono || '-'}</div>
                      <div className="text-xs text-gray-400">{esp.correo || 'Sin correo registrado'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="relative inline-flex items-center justify-center w-8 h-8 rounded-full shadow-sm border border-gray-200" style={{ backgroundColor: esp.color_etiqueta || '#cbd5e1' }} title={esp.color_etiqueta}>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${esp.estado ? 'bg-green-50 text-green-700 border border-green-200/50' : 'bg-gray-100 text-gray-600 border border-gray-200/50'}`}>
                        {esp.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => { setEspecialistaToEdit(esp); setIsDrawerOpen(true); }}
                        className="text-primary hover:text-white p-2 hover:bg-primary rounded-full transition-colors inline-flex group-hover:bg-primary/10"
                        title="Editar Especialista"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EspecialistaDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={fetchEspecialistas}
        especialista={especialistaToEdit}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => { setIsExportOpen(false); setExportEstadoFilter(''); }}
        title="Exportar Especialistas"
        columns={especialistaCsvColumns}
        fetchData={fetchExportEspecialistas}
        filename={`especialistas_${new Date().toISOString().split('T')[0]}`}
        onFiltersChanged={exportFilterTrigger}
      >
        <div>
          <label className="block text-xs font-bold text-[#004975] mb-1.5">Estado</label>
          <select
            value={exportEstadoFilter}
            onChange={(e) => { setExportEstadoFilter(e.target.value); setExportFilterTrigger(n => n + 1); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium bg-gray-50 focus:ring-2 focus:ring-[#00C288] outline-none"
          >
            <option value="">Todos</option>
            <option value="activo">Solo activos</option>
            <option value="inactivo">Solo inactivos</option>
          </select>
        </div>
      </ExportModal>
    </div>
  );
}
