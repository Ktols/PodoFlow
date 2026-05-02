import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Perfil } from '../types/entities';

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
          // Si el ID aún es un ID temporal (pending_...), lo actualizamos al ID de Clerk
          // Esto es seguro porque la FK en usuarios_sucursales tiene ON UPDATE CASCADE
          if (perfilPorEmail.id.startsWith('pending_')) {
            const { error: updateError } = await supabase
              .from('perfiles')
              .update({ id: clerkUserId })
              .eq('id', perfilPorEmail.id);
            
            if (!updateError) {
              perfilPorEmail.id = clerkUserId;
            } else {
              console.error('Error al sincronizar el ID de Clerk con el perfil:', updateError);
            }
          }
          data = perfilPorEmail;
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
