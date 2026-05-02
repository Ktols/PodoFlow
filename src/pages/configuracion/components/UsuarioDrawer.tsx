import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, UserPlus, Building2, Stethoscope } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

const usuarioSchema = z.object({
  email: z.string().email('Ingrese un correo electrónico válido'),
  nombres: z.string().min(1, 'Los nombres son requeridos'),
  apellidos: z.string().min(1, 'Los apellidos son requeridos'),
  telefono: z.string().optional(),
  role_id: z.string().min(1, 'Seleccione un rol'),
  sucursales_ids: z.array(z.string()).optional(),
  dni: z.string().optional(),
  color_etiqueta: z.string().optional(),
  activo: z.boolean(),
});

type UsuarioFormValues = z.infer<typeof usuarioSchema>;

interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
}

interface Sucursal {
  id: string;
  nombre_comercial: string;
}

interface UsuarioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  usuario: any | null;
}

export function UsuarioDrawer({ isOpen, onClose, onSuccess, usuario }: UsuarioDrawerProps) {
  const isEditing = !!usuario;
  const [roles, setRoles] = useState<Rol[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [selectedSucursales, setSelectedSucursales] = useState<Set<string>>(new Set());

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioSchema),
  });

  const watchedRole = watch('role_id');
  const rolSeleccionado = roles.find(r => r.id === watchedRole);
  const esDueno = rolSeleccionado?.nombre === 'dueno';

  useEffect(() => {
    const fetchData = async () => {
      const [rolesRes, sucursalesRes] = await Promise.all([
        supabase.from('roles').select('*').order('nombre'),
        supabase.from('sucursales').select('id, nombre_comercial').eq('activa', true).order('nombre_comercial'),
      ]);
      if (rolesRes.data) setRoles(rolesRes.data);
      if (sucursalesRes.data) setSucursales(sucursalesRes.data);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (usuario) {
      reset({
        email: usuario.email || '',
        nombres: usuario.nombres || '',
        apellidos: usuario.apellidos || '',
        telefono: usuario.telefono || '',
        role_id: usuario.role_id || '',
        activo: usuario.activo ?? true,
      });
      // Load existing branch assignments
      const fetchAssignments = async () => {
        const { data } = await supabase
          .from('usuarios_sucursales')
          .select('sucursal_id')
          .eq('usuario_id', usuario.id);
        if (data) {
          setSelectedSucursales(new Set(data.map((d: any) => d.sucursal_id)));
        }
      };
      fetchAssignments();
    } else {
      reset({
        email: '',
        nombres: '',
        apellidos: '',
        telefono: '',
        role_id: '',
        activo: true,
      });
      setSelectedSucursales(new Set());
    }
  }, [usuario, isOpen, reset]);

  const toggleSucursal = (id: string) => {
    setSelectedSucursales(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getRolLabel = (nombre: string) => {
    switch (nombre) {
      case 'dueno': return '👑 Dueño';
      case 'administrativo': return '📋 Administrativo';
      case 'podologo': return '🩺 Podólogo';
      default: return nombre;
    }
  };

  const getRolDescription = (nombre: string) => {
    switch (nombre) {
      case 'dueno': return 'Acceso global a todas las sucursales y la configuración completa del sistema.';
      case 'administrativo': return 'Gestiona agenda, caja, pacientes y personal de las sucursales asignadas.';
      case 'podologo': return 'Atiende pacientes y ve solo su agenda de trabajo asignada.';
      default: return '';
    }
  };

  const onSubmit = async (data: UsuarioFormValues) => {
    try {
      if (isEditing) {
        // Update profile
        const { error } = await supabase
          .from('perfiles')
          .update({
            nombres: data.nombres,
            apellidos: data.apellidos,
            email: data.email,
            telefono: data.telefono || null,
            role_id: data.role_id,
            activo: data.activo,
          })
          .eq('id', usuario.id);
        if (error) throw error;

        // Update branch assignments
        await supabase.from('usuarios_sucursales').delete().eq('usuario_id', usuario.id);
        if (!esDueno && selectedSucursales.size > 0) {
          const assignments = Array.from(selectedSucursales).map(sucId => ({
            usuario_id: usuario.id,
            sucursal_id: sucId,
          }));
          const { error: assignError } = await supabase.from('usuarios_sucursales').insert(assignments);
          if (assignError) throw assignError;
        }

        toast.success('Usuario actualizado correctamente');
      } else {
        // Create new profile with a temporary ID (will be replaced when user logs in via Clerk)
        const tempId = `pending_${Date.now()}`;
        const { error } = await supabase
          .from('perfiles')
          .insert([{
            id: tempId,
            nombres: data.nombres,
            apellidos: data.apellidos,
            email: data.email,
            telefono: data.telefono || null,
            role_id: data.role_id,
            activo: data.activo,
          }]);
        if (error) throw error;

        // Assign branches
        if (!esDueno && selectedSucursales.size > 0) {
          const assignments = Array.from(selectedSucursales).map(sucId => ({
            usuario_id: tempId,
            sucursal_id: sucId,
          }));
          await supabase.from('usuarios_sucursales').insert(assignments);
        }

        // Si el rol es Podólogo, sincronizar automáticamente creando el registro en el módulo de Personal
        if (rolSeleccionado?.nombre === 'podologo') {
          const { error: podologoError } = await supabase.from('podologos').insert([{
            nombres: `${data.nombres} ${data.apellidos}`,
            dni: data.dni || 'PENDIENTE',
            correo: data.email,
            telefono: data.telefono || null,
            especialidad: 'Podología',
            estado: true,
            color_etiqueta: data.color_etiqueta || '#00C288'
          }]);
          
          if (podologoError) {
            console.error("Error sincronizando al podólogo con el módulo Personal:", podologoError);
            toast.error("El usuario se creó, pero falló la sincronización con Personal. Verifica si el DNI o Correo ya existen allí.", { duration: 5000 });
          } else {
            toast.success('Usuario y Personal registrado automáticamente. Cuando inicie sesión con ese email, tendrá acceso completo.', { duration: 5000 });
          }
        } else {
          toast.success('Usuario pre-registrado. Cuando inicie sesión con ese email, tendrá acceso automático.');
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar el usuario');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white shadow-2xl h-full overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-secondary">
              {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Info box */}
          {!isEditing && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-xs font-bold text-blue-700 leading-relaxed">
                💡 Solo necesitas registrar el <strong>correo electrónico</strong> del empleado. Cuando esa persona inicie sesión (vía Google, Microsoft, o mediante un Código enviado a su correo), el sistema lo reconocerá automáticamente.
              </p>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Correo Electrónico <span className="text-red-500">*</span>
            </label>
            <input
              {...register('email')}
              type="email"
              disabled={isEditing}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="empleado@gmail.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          {/* Nombres y Apellidos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Nombres <span className="text-red-500">*</span>
              </label>
              <input
                {...register('nombres')}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="Juan"
              />
              {errors.nombres && <p className="text-red-500 text-xs mt-1">{errors.nombres.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Apellidos <span className="text-red-500">*</span>
              </label>
              <input
                {...register('apellidos')}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="Pérez"
              />
              {errors.apellidos && <p className="text-red-500 text-xs mt-1">{errors.apellidos.message}</p>}
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Teléfono</label>
            <input
              {...register('telefono')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="987654321"
            />
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Rol en el Sistema <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {roles.map((rol) => (
                <label
                  key={rol.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    watchedRole === rol.id
                      ? 'bg-primary/5 border-primary/30 shadow-sm'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    value={rol.id}
                    {...register('role_id')}
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div>
                    <p className={`text-sm font-bold ${watchedRole === rol.id ? 'text-primary' : 'text-gray-700'}`}>
                      {getRolLabel(rol.nombre)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{getRolDescription(rol.nombre)}</p>
                  </div>
                </label>
              ))}
            </div>
            {errors.role_id && <p className="text-red-500 text-xs mt-1">{errors.role_id.message}</p>}
          </div>

          {/* Dynamic Fields para Podólogos (Personal) */}
          {rolSeleccionado?.nombre === 'podologo' && (
            <div className="grid grid-cols-2 gap-4 bg-[#00C288]/5 p-5 rounded-xl border border-[#00C288]/20 animate-in fade-in duration-300">
              <div className="col-span-2">
                <p className="text-sm font-bold text-[#004975] mb-2 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#00C288]" /> 
                  Conexión con Directorio de Personal
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Al crear este usuario de acceso, se generará <strong>automáticamente</strong> su perfil en el módulo de <em>Personal</em> para que pueda tener citas asignadas en la agenda. Completa su DNI y su color de distintivo ahora (o modifícalos luego).
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">DNI</label>
                <input
                  {...register('dni')}
                  className="w-full px-4 py-2 border border-[#00C288]/30 rounded-lg focus:ring-2 focus:ring-[#00C288] focus:border-transparent outline-none transition-all bg-white"
                  placeholder="Ej: 12345678"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Color Agenda</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    {...register('color_etiqueta')}
                    defaultValue="#00C288"
                    className="w-9 h-9 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <span className="text-xs text-gray-400 font-medium leading-tight">Color único en <br/> el calendario</span>
                </div>
              </div>
            </div>
          )}

          {/* Sucursales assignment — only for non-owners */}
          {watchedRole && !esDueno && (
            <div className="animate-in fade-in duration-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sucursales Asignadas
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Selecciona en qué sedes trabajará este usuario.
              </p>
              {sucursales.length === 0 ? (
                <p className="text-sm text-gray-400 bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
                  No hay sucursales activas. Crea una primero en Tienda.
                </p>
              ) : (
                <div className="space-y-2">
                  {sucursales.map((suc) => {
                    const isSelected = selectedSucursales.has(suc.id);
                    return (
                      <button
                        key={suc.id}
                        type="button"
                        onClick={() => toggleSucursal(suc.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          isSelected
                            ? 'bg-primary/5 border-primary/30 shadow-sm'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'bg-primary border-primary' : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                        <Building2 className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-gray-300'}`} />
                        <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-gray-600'}`}>
                          {suc.nombre_comercial}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {esDueno && watchedRole && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-xs font-bold text-amber-700">
                👑 El rol Dueño tiene acceso automático a todas las sucursales. No necesita asignación manual.
              </p>
            </div>
          )}

          {/* Toggle de Estado */}
          <div className="flex flex-col justify-center bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-sm font-bold text-secondary mb-2">Estado del Acceso</label>
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <div className="relative">
                <input type="checkbox" className="sr-only peer" {...register('activo')} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-gray-300 peer-checked:border-primary"></div>
              </div>
              <span className="text-sm font-medium text-gray-700">Permitir inicio de sesión (Activo)</span>
            </label>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Al apagar este interruptor, el usuario será bloqueado y perderá el acceso al sistema inmediatamente.
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
            >
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
