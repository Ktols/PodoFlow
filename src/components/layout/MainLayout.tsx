import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout() {
  return (
    <div className="flex h-screen print:h-auto w-full overflow-hidden print:overflow-visible bg-background print:bg-white">
      <div className="print:hidden h-full">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden print:overflow-visible">
        <div className="print:hidden">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto p-6 relative bg-background print:p-0 print:overflow-visible print:bg-white text-gray-800">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
