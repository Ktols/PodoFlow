import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, BriefcaseMedical } from 'lucide-react';

export function Sidebar() {
  const routes = [
    { path: '/', name: 'Dashboard', icon: LayoutDashboard },
    { path: '/agenda', name: 'Agenda', icon: Calendar },
    { path: '/pacientes', name: 'Pacientes', icon: Users },
    { path: '/caja', name: 'Caja', icon: BriefcaseMedical },
  ];

  return (
    <aside className="w-64 bg-secondary text-white h-full flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-primary">G&C</span> Podología
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {routes.map((route) => {
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
        })}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <p className="text-sm text-gray-400">© 2026 G&C Admin</p>
      </div>
    </aside>
  );
}
