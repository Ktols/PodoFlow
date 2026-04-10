import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreVertical, Pencil, ClipboardList, Download } from 'lucide-react';
import { WhatsAppIcon } from '../../components/WhatsAppIcon';
import { PacienteDrawer } from './components/PacienteDrawer';
import { ExportModal } from '../../components/ExportModal';
import { supabase } from '../../lib/supabase';
import type { CsvColumn } from '../../lib/exportCsv';

export interface Paciente {
  id: string;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  alergias_alertas: string | null;
  fecha_nacimiento?: string | null;
  diabetes?: boolean;
  hipertension?: boolean;
  enfermedad_vascular?: boolean;
  tratamiento_oncologico?: boolean;
  alergias_detalle?: string | null;
  sexo?: string | null;
}

export function PacientesPage() {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Paciente | null>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportAlertFilter, setExportAlertFilter] = useState('');
  const [exportFilterTrigger, setExportFilterTrigger] = useState(0);

  const pacienteCsvColumns: CsvColumn<Paciente>[] = [
    { key: 'tipo_documento', header: 'Tipo Doc.' },
    { key: 'numero_documento', header: 'Nro. Documento' },
    { key: 'nombres', header: 'Nombres' },
    { key: 'apellidos', header: 'Apellidos' },
    { key: 'telefono', header: 'Teléfono' },
    { key: 'sexo', header: 'Sexo' },
    { key: 'fecha_nacimiento', header: 'Fecha Nacimiento' },
    { key: '', header: 'Diabetes', format: (r) => r.diabetes ? 'Sí' : 'No' },
    { key: '', header: 'Hipertensión', format: (r) => r.hipertension ? 'Sí' : 'No' },
    { key: '', header: 'Enf. Vascular', format: (r) => r.enfermedad_vascular ? 'Sí' : 'No' },
    { key: '', header: 'Trat. Oncológico', format: (r) => r.tratamiento_oncologico ? 'Sí' : 'No' },
    { key: 'alergias_alertas', header: 'Alergias/Alertas' },
    { key: 'alergias_detalle', header: 'Detalle Alergias' },
  ];

  const fetchExportPacientes = async (): Promise<Paciente[]> => {
    const { data, error } = await supabase.from('pacientes').select('*').order('apellidos');
    if (error || !data) return [];
    if (exportAlertFilter === 'con_alertas') {
      return data.filter(p => p.alergias_alertas || p.diabetes || p.hipertension || p.enfermedad_vascular || p.tratamiento_oncologico || p.alergias_detalle);
    }
    if (exportAlertFilter === 'sin_alertas') {
      return data.filter(p => !p.alergias_alertas && !p.diabetes && !p.hipertension && !p.enfermedad_vascular && !p.tratamiento_oncologico && !p.alergias_detalle);
    }
    return data;
  };

  const fetchPacientes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setPacientes(data);
    if (error) console.error("Error cargando pacientes:", error);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPacientes();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const filteredPacientes = pacientes.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const fullName = `${p.nombres} ${p.apellidos}`.toLowerCase();
    return (
      fullName.includes(term) ||
      p.numero_documento.toLowerCase().includes(term)
    );
  });

  const handleWhatsApp = (telefono: string | null) => {
    if (!telefono) return;
    let cleaned = telefono.replace(/\D/g, '');
    if (cleaned.length === 9 && !cleaned.startsWith('51')) {
      cleaned = '51' + cleaned;
    }
    window.open(`https://wa.me/${cleaned}`, '_blank');
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Directorio de Pacientes</h1>
          <p className="text-gray-500 mt-1">Gestión y registro de historias clínicas</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExportOpen(true)}
            className="bg-white hover:bg-gray-50 text-[#004975] px-4 py-2.5 rounded-lg flex items-center gap-2 font-bold text-sm border border-gray-200 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={() => {
              setSelectedPatient(null);
              setIsDrawerOpen(true);
            }}
            className="bg-primary hover:bg-[#00ab78] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-md transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Paciente</span>
          </button>
        </div>
      </div>

      {/* Toolbox (Search) */}
      <div className="bg-background-container p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Doc o apellidos..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 bg-background-container rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                <th className="p-4 font-semibold text-secondary">Documento</th>
                <th className="p-4 font-semibold text-secondary">Paciente</th>
                <th className="p-4 font-semibold text-secondary">Teléfono</th>
                <th className="p-4 font-semibold text-secondary">Alertas</th>
                <th className="p-4 font-semibold text-right text-secondary w-20">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 border-gray-200 border-t-primary rounded-full animate-spin mb-4" />
                      <p className="font-medium text-lg text-secondary">Cargando pacientes...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredPacientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-10 h-10 text-gray-300" />
                      </div>
                      <p className="font-medium text-lg text-secondary">No hay historiales disponibles</p>
                      <p className="text-sm mt-1">Registra a tu primer paciente dando clic en el botón verde superior.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPacientes.map((paciente) => (
                  <tr 
                    key={paciente.id} 
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/pacientes/${paciente.id}/historia`)}
                  >
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-secondary">{paciente.numero_documento}</span>
                        <span className="text-xs text-gray-500 font-medium">{paciente.tipo_documento}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-secondary">{paciente.nombres} {paciente.apellidos}</span>
                    </td>
                    <td className="p-4 text-gray-600">
                      {paciente.telefono || '-'}
                    </td>
                    <td className="p-4">
                      {(paciente.alergias_alertas || paciente.diabetes || paciente.hipertension || paciente.enfermedad_vascular || paciente.tratamiento_oncologico || paciente.alergias_detalle) ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Contiene Alertas
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {paciente.telefono && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWhatsApp(paciente.telefono);
                            }}
                            className="p-1.5 rounded-full transition-colors flex items-center justify-center hover:bg-green-50"
                            title="Contactar via WhatsApp"
                          >
                            <WhatsAppIcon className="w-6 h-6 text-green-500 hover:text-green-600 cursor-pointer transition-colors" />
                          </button>
                        )}
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === paciente.id ? null : paciente.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          
                          {activeMenuId === paciente.id && (
                            <div 
                              className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPatient(paciente);
                                  setIsDrawerOpen(true);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors border-b border-gray-50"
                              >
                                <Pencil className="w-4 h-4 text-gray-400" />
                                Editar Datos Básicos
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/pacientes/${paciente.id}/historia`);
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm text-[#00C288] font-bold hover:bg-[#00C288]/5 flex items-center gap-2 transition-colors"
                              >
                                <ClipboardList className="w-4 h-4 text-[#00C288]" />
                                Ver Historial Clínico
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PacienteDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={fetchPacientes}
        patient={selectedPatient}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => { setIsExportOpen(false); setExportAlertFilter(''); }}
        title="Exportar Pacientes"
        columns={pacienteCsvColumns}
        fetchData={fetchExportPacientes}
        filename={`pacientes_${new Date().toISOString().split('T')[0]}`}
        onFiltersChanged={exportFilterTrigger}
      >
        <div>
          <label className="block text-xs font-bold text-[#004975] mb-1.5">Condición médica</label>
          <select
            value={exportAlertFilter}
            onChange={(e) => { setExportAlertFilter(e.target.value); setExportFilterTrigger(n => n + 1); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium bg-gray-50 focus:ring-2 focus:ring-[#00C288] outline-none"
          >
            <option value="">Todos los pacientes</option>
            <option value="con_alertas">Con alertas médicas</option>
            <option value="sin_alertas">Sin alertas médicas</option>
          </select>
        </div>
      </ExportModal>
    </div>
  );
}
