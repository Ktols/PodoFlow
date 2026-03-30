import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { AgendaPage } from './pages/agenda/AgendaPage';
import { PacientesPage } from './pages/pacientes/PacientesPage';
import { HistoriaClinicaPage } from './pages/pacientes/HistoriaClinicaPage';
import { Caja } from './pages/Caja';
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="pacientes" element={<PacientesPage />} />
          <Route path="pacientes/:id/historia" element={<HistoriaClinicaPage />} />
          <Route path="caja" element={<Caja />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
