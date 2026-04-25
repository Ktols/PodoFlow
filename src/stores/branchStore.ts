import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Sucursal {
  id: string;
  nombre_comercial: string;
  razon_social: string | null;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  whatsapp: string | null;
  activa: boolean;
}

interface BranchState {
  sucursales: Sucursal[];
  sucursalActiva: Sucursal | null;
  isLoading: boolean;

  fetchSucursales: (rolNombre: string | null, usuarioId: string) => Promise<void>;
  setSucursalActiva: (sucursal: Sucursal) => void;
  reset: () => void;
}

export const useBranchStore = create<BranchState>((set) => ({
  sucursales: [],
  sucursalActiva: null,
  isLoading: true,

  fetchSucursales: async (rolNombre: string | null, usuarioId: string) => {
    set({ isLoading: true });
    try {
      let sucursales: Sucursal[] = [];

      if (rolNombre === 'dueno') {
        // El dueño ve TODAS las sucursales activas
        const { data } = await supabase
          .from('sucursales')
          .select('*')
          .eq('activa', true)
          .order('nombre_comercial');

        sucursales = data || [];
      } else {
        // Los demás roles solo ven sus sucursales asignadas
        const { data } = await supabase
          .from('usuarios_sucursales')
          .select('sucursales (*)')
          .eq('usuario_id', usuarioId);

        sucursales = (data || [])
          .map((us: any) => us.sucursales)
          .filter((s: Sucursal | null) => s && s.activa);
      }

      set({
        sucursales,
        sucursalActiva: sucursales.length > 0 ? sucursales[0] : null,
        isLoading: false,
      });
    } catch {
      set({ sucursales: [], sucursalActiva: null, isLoading: false });
    }
  },

  setSucursalActiva: (sucursal: Sucursal) => set({ sucursalActiva: sucursal }),

  reset: () => set({ sucursales: [], sucursalActiva: null, isLoading: true }),
}));
