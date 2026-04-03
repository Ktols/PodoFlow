import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { AgendaPage } from './pages/agenda/AgendaPage';
import { PacientesPage } from './pages/pacientes/PacientesPage';
import { HistoriaClinicaPage } from './pages/pacientes/HistoriaClinicaPage';
import { EspecialistasPage } from './pages/especialistas/EspecialistasPage';
import { CajaPage } from './pages/caja/CajaPage';
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" containerClassName="!z-[99999]" />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="pacientes" element={<PacientesPage />} />
          <Route path="pacientes/:id/historia" element={<HistoriaClinicaPage />} />
          <Route path="especialistas" element={<EspecialistasPage />} />
          <Route path="caja" element={<CajaPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
