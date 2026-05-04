import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Building2, MapPin, Phone, FileText, Power } from 'lucide-react';
import { SucursalDrawer } from './components/SucursalDrawer';
import { useBranchStore } from '../../stores/branchStore';
import { useAuthStore } from '../../stores/authStore';
import type { Sucursal } from '../../types/entities';

export function TiendaPage() {
  const [sucursalesList, setSucursalesList] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sucursalToEdit, setSucursalToEdit] = useState<Sucursal | null>(null);

  const { perfil } = useAuthStore();
  const { fetchSucursales: refreshGlobalBranches } = useBranchStore();

  const fetchSucursales = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sucursales')
        .select('*')
        .order('nombre_comercial', { ascending: true });

      if (error) throw error;
      setSucursalesList(data || []);
    } catch (err) {
      console.error('Error fetching sucursales:', err);
      toast.error('Error al cargar las sucursales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSucursales();
  }, []);

  const handleSuccess = () => {
    fetchSucursales();
    // Refrescar el selector global del Header
    if (perfil) {
      refreshGlobalBranches(perfil.rol_nombre, perfil.id);
    }
  };

  const activasCount = sucursalesList.filter(s => s.activa).length;
  const inactivasCount = sucursalesList.filter(s => !s.activa).length;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-secondary tracking-tight">Configuración de Tienda</h1>
          <p className="text-gray-500 mt-1">Administra las sucursales y datos de tu negocio</p>
        </div>
        <button
          onClick={() => { setSucursalToEdit(null); setIsDrawerOpen(true); }}
          className="flex items-center justify-center gap-2 bg-primary text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl hover:bg-[#00ab78] transition-colors font-semibold text-xs md:text-sm shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nueva Sucursal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-secondary">{sucursalesList.length}</p>
            <p className="text-xs text-gray-400 font-medium">Total Sucursales</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-xl">
            <Power className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-secondary">{activasCount}</p>
            <p className="text-xs text-gray-400 font-medium">Activas</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="p-3 bg-gray-100 rounded-xl">
            <Power className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-secondary">{inactivasCount}</p>
            <p className="text-xs text-gray-400 font-medium">Inactivas</p>
          </div>
        </div>
      </div>

      {/* Cards de Sucursales */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-400">Cargando sucursales...</span>
          </div>
        </div>
      ) : sucursalesList.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">No hay sucursales registradas</h3>
          <p className="text-gray-400 mt-1">Crea tu primera sucursal para comenzar a operar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sucursalesList.map((s) => (
            <div
              key={s.id}
              className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
                s.activa ? 'border-gray-100' : 'border-gray-200 opacity-60'
              }`}
            >
              {/* Color bar top */}
              <div className={`h-1.5 ${s.activa ? 'bg-primary' : 'bg-gray-300'}`} />
              
              <div className="p-5 space-y-4">
                {/* Header de Card */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${s.activa ? 'bg-primary/10' : 'bg-gray-100'}`}>
                      <Building2 className={`w-5 h-5 ${s.activa ? 'text-primary' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-secondary text-lg leading-tight">{s.nombre_comercial}</h3>
                      {s.razon_social && (
                        <p className="text-xs text-gray-400 mt-0.5">{s.razon_social}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      s.activa 
                        ? 'bg-green-50 text-green-700 border border-green-200/50' 
                        : 'bg-gray-100 text-gray-500 border border-gray-200/50'
                    }`}>
                      {s.activa ? 'Activa' : 'Inactiva'}
                    </span>
                    <button
                      onClick={() => { setSucursalToEdit(s); setIsDrawerOpen(true); }}
                      className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                      title="Editar Sucursal"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-2">
                  {s.ruc && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <FileText className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      <span>RUC: <span className="font-medium text-gray-700">{s.ruc}</span></span>
                    </div>
                  )}
                  {s.direccion && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      <span className="truncate">{s.direccion}</span>
                    </div>
                  )}
                  {(s.telefono || s.whatsapp) && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Phone className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      <span>{s.telefono || s.whatsapp}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SucursalDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={handleSuccess}
        sucursal={sucursalToEdit}
      />
    </div>
  );
}
