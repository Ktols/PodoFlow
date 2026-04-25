import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Perfil {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  role_id: string | null;
  rol_nombre: string | null;
}

interface AuthState {
  perfil: Perfil | null;
  isAuthorized: boolean;
  isLoading: boolean;
  error: string | null;
  fetchPerfil: (clerkUserId: string, email: string) => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  perfil: null,
  isAuthorized: false,
  isLoading: true,
  error: null,

  fetchPerfil: async (clerkUserId: string, email: string) => {
    set({ isLoading: true, error: null });
    try {
      // Paso 1: Buscar por Clerk ID (usuario ya vinculado)
      let { data, error } = await supabase
        .from('perfiles')
        .select(`*, roles ( nombre )`)
        .eq('id', clerkUserId)
        .eq('activo', true)
        .single();

      // Paso 2: Si no se encontró por ID, buscar por email (usuario pre-registrado por el admin)
      if (error || !data) {
        const { data: perfilPorEmail, error: emailError } = await supabase
          .from('perfiles')
          .select(`*, roles ( nombre )`)
          .eq('email', email)
          .eq('activo', true)
          .single();

        if (!emailError && perfilPorEmail) {
          // Vincular automáticamente el Clerk ID al perfil existente
          await supabase
            .from('perfiles')
            .update({ id: clerkUserId })
            .eq('email', email);

          data = { ...perfilPorEmail, id: clerkUserId };
          error = null;
        }
      }

      if (error || !data) {
        set({
          perfil: null,
          isAuthorized: false,
          isLoading: false,
          error: 'Usuario no autorizado. Contacte al administrador.',
        });
        return;
      }

      set({
        perfil: {
          ...data,
          rol_nombre: data.roles?.nombre || null,
        },
        isAuthorized: true,
        isLoading: false,
        error: null,
      });
    } catch {
      set({
        perfil: null,
        isAuthorized: false,
        isLoading: false,
        error: 'Error al verificar permisos.',
      });
    }
  },

  reset: () => set({
    perfil: null,
    isAuthorized: false,
    isLoading: true,
    error: null,
  }),
}));
