import { useEffect, useState, useRef } from 'react';
import { Bell, Building2, ChevronDown, Check, Menu } from 'lucide-react';
import { UserButton, useUser } from '@clerk/react';
import { useAuthStore } from '../../stores/authStore';
import { useBranchStore } from '../../stores/branchStore';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useUser();
  const { perfil } = useAuthStore();
  const { sucursales, sucursalActiva, isLoading, fetchSucursales, setSucursalActiva } = useBranchStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar sucursales cuando el perfil esté listo
  useEffect(() => {
    if (perfil?.id && perfil.rol_nombre) {
      fetchSucursales(perfil.rol_nombre, perfil.id);
    }
  }, [perfil?.id, perfil?.rol_nombre, fetchSucursales]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canSwitchBranch = sucursales.length > 1;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
      {/* Lado izquierdo: Selector de Sucursal */}
      <div className="flex items-center gap-2 md:gap-4">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-gray-500 hover:text-primary transition-colors rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>
        {isLoading ? (
          <div className="h-9 w-48 bg-gray-100 animate-pulse rounded-lg" />
        ) : sucursalActiva ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => canSwitchBranch && setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                canSwitchBranch
                  ? 'border-gray-200 hover:border-primary/40 hover:bg-primary/5 cursor-pointer'
                  : 'border-transparent cursor-default'
              }`}
            >
              <Building2 className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="text-sm font-semibold text-secondary leading-tight">
                  {sucursalActiva.nombre_comercial}
                </p>
                {sucursalActiva.direccion && (
                  <p className="text-xs text-gray-400 leading-tight truncate max-w-[120px] md:max-w-[200px]">
                    {sucursalActiva.direccion}
                  </p>
                )}
              </div>
              {canSwitchBranch && (
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              )}
            </button>

            {/* Dropdown de sucursales */}
            {dropdownOpen && canSwitchBranch && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Cambiar Sucursal
                </p>
                {sucursales.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSucursalActiva(s);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                      s.id === sucursalActiva.id ? 'bg-primary/5' : ''
                    }`}
                  >
                    <Building2 className={`w-4 h-4 ${s.id === sucursalActiva.id ? 'text-primary' : 'text-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${s.id === sucursalActiva.id ? 'text-primary' : 'text-gray-700'}`}>
                        {s.nombre_comercial}
                      </p>
                      {s.direccion && (
                        <p className="text-xs text-gray-400 truncate">{s.direccion}</p>
                      )}
                    </div>
                    {s.id === sucursalActiva.id && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Sin sucursal asignada</p>
        )}
      </div>

      {/* Lado derecho: Notificaciones y Perfil */}
      <div className="flex items-center gap-4">
        <button className="p-2 text-gray-500 hover:text-primary transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="hidden md:flex items-center gap-3 border-l pl-4 border-gray-200">
          <UserButton
            appearance={{
              elements: {
                userButtonPopoverActionButton__manageAccount: { display: 'none' },
              },
            }}
          />
          <div className="text-right">
            <span className="text-sm font-medium text-secondary block leading-tight">
              {user?.firstName || perfil?.nombres || 'Gestor'}
            </span>
            {perfil?.rol_nombre && (
              <span className="text-xs text-gray-400 capitalize leading-tight">
                {perfil.rol_nombre === 'dueno' ? 'Dueño' : perfil.rol_nombre}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
