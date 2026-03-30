import { User, Bell } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <h2 className="text-xl font-semibold text-secondary">Bienvenido al Sistema</h2>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-gray-500 hover:text-primary transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 border-l pl-4 border-gray-200">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <User className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-secondary">Administrador</span>
        </div>
      </div>
    </header>
  );
}
