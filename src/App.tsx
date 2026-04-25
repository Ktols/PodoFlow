import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { AgendaPage } from './pages/agenda/AgendaPage';
import { PacientesPage } from './pages/pacientes/PacientesPage';
import { HistoriaClinicaPage } from './pages/pacientes/HistoriaClinicaPage';
import { EspecialistasPage } from './pages/especialistas/EspecialistasPage';
import { CajaPage } from './pages/caja/CajaPage';
import { TiendaPage } from './pages/configuracion/TiendaPage';
import { UsuariosPage } from './pages/configuracion/UsuariosPage';
import { Toaster } from 'react-hot-toast';
import { Show, SignInButton } from '@clerk/react';
import { AuthGuard } from './components/auth/AuthGuard';
import { HeartPulse } from 'lucide-react';

export default function App() {
  return (
    <>
      <Toaster position="top-right" containerClassName="!z-[99999]" />

      {/* Vista cuando el usuario NO ha iniciado sesión */}
      <Show when="signed-out">
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full mx-auto space-y-8">
            <div className="flex flex-col items-center space-y-3">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <HeartPulse className="w-12 h-12" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                <span className="text-primary">G&C</span> Podología
              </h1>
              <p className="text-gray-500">Sistema de Gestión Clínica</p>
            </div>

            <SignInButton mode="modal">
              <button className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg shadow-md transition duration-200">
                Iniciar Sesión
              </button>
            </SignInButton>
          </div>
        </div>
      </Show>

      {/* Vista cuando el usuario SÍ ha iniciado sesión */}
      <Show when="signed-in">
        <AuthGuard>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="agenda" element={<AgendaPage />} />
                <Route path="pacientes" element={<PacientesPage />} />
                <Route path="pacientes/:id/historia" element={<HistoriaClinicaPage />} />
                <Route path="especialistas" element={<EspecialistasPage />} />
                <Route path="caja" element={<CajaPage />} />
                <Route path="tienda" element={<TiendaPage />} />
                <Route path="usuarios" element={<UsuariosPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthGuard>
      </Show>
    </>
  );
}
