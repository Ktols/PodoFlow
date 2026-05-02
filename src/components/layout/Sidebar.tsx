import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, BriefcaseMedical, UserCog, ChevronDown, Receipt, Tag, Package, ShoppingCart, Store, UsersRound } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const cajaSubitems = [
  { tab: 'cobros', name: 'Cobros Pendientes', icon: Receipt },
  { tab: 'precios', name: 'Lista de Precios', icon: Tag },
  { tab: 'productos', name: 'Productos', icon: Package },
  { tab: 'ventas', name: 'Ventas', icon: ShoppingCart },
];

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { perfil } = useAuthStore();
  const isDueno = perfil?.rol_nombre === 'dueno';
  const isAdmin = perfil?.rol_nombre === 'administrativo';
  const isPodologo = perfil?.rol_nombre === 'podologo';

  const location = useLocation();
  const isCajaActive = location.pathname === '/caja';
  const [cajaOpen, setCajaOpen] = useState(isCajaActive);

  const currentCajaTab = isCajaActive
    ? new URLSearchParams(location.search).get('tab') || 'cobros'
    : null;

  const mainRoutes = [
    { path: '/', name: 'Dashboard', icon: LayoutDashboard, visible: isDueno || isAdmin },
    { path: '/agenda', name: 'Agenda', icon: Calendar, visible: true },
    { path: '/pacientes', name: 'Pacientes', icon: Users, visible: true },
    { path: '/especialistas', name: 'Personal', icon: UserCog, visible: isDueno || isAdmin },
  ].filter(r => r.visible);

  const configRoutes = [
    { path: '/tienda', name: 'Tienda', icon: Store, visible: isDueno || isAdmin },
    { path: '/usuarios', name: 'Usuarios', icon: UsersRound, visible: isDueno },
  ].filter(r => r.visible);

  const renderLinks = (routes: typeof mainRoutes) =>
    routes.map((route) => {
      const Icon = route.icon;
      return (
        <NavLink
          key={route.path}
          to={route.path}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-primary text-white font-medium shadow-md'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <Icon className="w-5 h-5" />
          <span>{route.name}</span>
        </NavLink>
      );
    });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 h-full bg-secondary text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
      <div className="p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-primary">G&C</span> Podología
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {renderLinks(mainRoutes)}

        {/* Caja with dropdown */}
        {!isPodologo && (
          <div>
            <button
              onClick={() => setCajaOpen(!cajaOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                isCajaActive
                  ? 'bg-primary text-white font-medium shadow-md'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <BriefcaseMedical className="w-5 h-5" />
                <span>Caja</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${cajaOpen ? 'rotate-180' : ''}`} />
            </button>

            {cajaOpen && (
              <div className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-0.5">
                {cajaSubitems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentCajaTab === item.tab;
                  const to = item.tab === 'cobros' ? '/caja' : `/caja?tab=${item.tab}`;
                  return (
                    <NavLink
                      key={item.tab}
                      to={to}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                        isActive
                          ? 'bg-white/15 text-white font-bold'
                          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {configRoutes.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Configuración</p>
            </div>
            {renderLinks(configRoutes)}
          </>
        )}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <p className="text-sm text-gray-400">© 2026 G&C Admin</p>
      </div>
    </aside>
    </>
  );
}
