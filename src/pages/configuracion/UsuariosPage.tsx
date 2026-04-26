import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, UserCog, ShieldCheck, Shield, Stethoscope, Mail, Phone } from 'lucide-react';
import { UsuarioDrawer } from './components/UsuarioDrawer';

interface PerfilUsuario {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  role_id: string | null;
  created_at: string;
  roles: {
    nombre: string;
    descripcion: string;
  } | null;
}

const getRolBadge = (rolNombre: string | null | undefined) => {
  switch (rolNombre) {
    case 'dueno':
      return {
        label: 'Dueño',
        icon: ShieldCheck,
        classes: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case 'administrativo':
      return {
        label: 'Administrativo',
        icon: Shield,
        classes: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    case 'podologo':
      return {
        label: 'Podólogo',
        icon: Stethoscope,
        classes: 'bg-green-50 text-green-700 border-green-200',
      };
    default:
      return {
        label: 'Sin Rol',
        icon: UserCog,
        classes: 'bg-gray-100 text-gray-500 border-gray-200',
      };
  }
};

export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<PerfilUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [usuarioToEdit, setUsuarioToEdit] = useState<PerfilUsuario | null>(null);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('perfiles')
        .select(`*, roles ( nombre, descripcion )`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (err) {
      console.error('Error fetching usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const isPending = (id: string) => id.startsWith('pending_');

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-secondary tracking-tight">Gestión de Usuarios</h1>
          <p className="text-gray-500 mt-1">Administra el acceso, roles y sucursales de tu equipo</p>
        </div>
        <button
          onClick={() => { setUsuarioToEdit(null); setIsDrawerOpen(true); }}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-[#00ab78] transition-colors font-semibold shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {['dueno', 'administrativo', 'podologo', null].map((rolKey) => {
          const badge = getRolBadge(rolKey);
          const count = rolKey
            ? usuarios.filter(u => u.roles?.nombre === rolKey).length
            : usuarios.length;
          const Icon = badge.icon;
          return (
            <div key={rolKey || 'total'} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${rolKey ? badge.classes.split(' ')[0] : 'bg-gray-50'}`}>
                <Icon className={`w-6 h-6 ${rolKey ? badge.classes.split(' ')[1] : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">{count}</p>
                <p className="text-xs text-gray-400 font-medium">{rolKey ? badge.label + 's' : 'Total Usuarios'}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Cargando usuarios...</span>
                    </div>
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-medium bg-gray-50/50">
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                usuarios.map((user) => {
                  const badge = getRolBadge(user.roles?.nombre);
                  const BadgeIcon = badge.icon;
                  const pending = isPending(user.id);

                  return (
                    <tr key={user.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            pending ? 'bg-gray-300' : 'bg-secondary'
                          }`}>
                            {user.nombres[0]}{user.apellidos[0]}
                          </div>
                          <div>
                            <div className="font-bold text-secondary text-[15px]">{user.nombres} {user.apellidos}</div>
                            {pending && (
                              <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                                ⏳ Pendiente de primer login
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-600 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-300" />
                            {user.email}
                          </span>
                          {user.telefono && (
                            <span className="text-xs text-gray-400 flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-gray-300" />
                              {user.telefono}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${badge.classes}`}>
                          <BadgeIcon className="w-3.5 h-3.5" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          user.activo
                            ? 'bg-green-50 text-green-700 border border-green-200/50'
                            : 'bg-gray-100 text-gray-600 border border-gray-200/50'
                        }`}>
                          {user.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => { setUsuarioToEdit(user); setIsDrawerOpen(true); }}
                          className="text-primary hover:text-white p-2 hover:bg-primary rounded-full transition-colors inline-flex group-hover:bg-primary/10"
                          title="Editar Usuario"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UsuarioDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={fetchUsuarios}
        usuario={usuarioToEdit}
      />
    </div>
  );
}
