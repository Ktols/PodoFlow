import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useEffect } from 'react';

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen print:h-auto w-full overflow-hidden print:overflow-visible bg-background print:bg-white">
      <div className="print:hidden h-full">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden print:overflow-visible">
        <div className="print:hidden">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative bg-background print:p-0 print:overflow-visible print:bg-white text-gray-800">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
