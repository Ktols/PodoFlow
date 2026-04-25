import { useEffect } from 'react';
import { useUser, useClerk } from '@clerk/react';
import { useAuthStore } from '../../stores/authStore';
import { ShieldX, LogOut, HeartPulse, Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { perfil, isAuthorized, isLoading, error, fetchPerfil, reset } = useAuthStore();

  useEffect(() => {
    if (user?.id && user?.primaryEmailAddress?.emailAddress) {
      fetchPerfil(user.id, user.primaryEmailAddress.emailAddress);
    }
    return () => reset();
  }, [user?.id, user?.primaryEmailAddress?.emailAddress, fetchPerfil, reset]);

  // Cargando verificación...
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
        <div className="p-3 bg-primary/10 rounded-full text-primary">
          <HeartPulse className="w-10 h-10" />
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Verificando permisos...</span>
        </div>
      </div>
    );
  }

  // Usuario NO autorizado (no existe en tabla perfiles)
  if (!isAuthorized || !perfil) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full mx-auto space-y-6">
          <div className="flex flex-col items-center space-y-3">
            <div className="p-4 bg-red-100 rounded-full text-red-500">
              <ShieldX className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Acceso Restringido</h1>
            <p className="text-gray-500">
              {error || 'Su cuenta no tiene permisos para acceder a este sistema. Contacte al administrador del centro podológico.'}
            </p>
            {user?.primaryEmailAddress && (
              <p className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                {user.primaryEmailAddress.emailAddress}
              </p>
            )}
          </div>

          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg shadow-md transition duration-200"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión e Intentar con Otra Cuenta
          </button>
        </div>
      </div>
    );
  }

  // Usuario autorizado — renderizar la app
  return <>{children}</>;
}
