import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, Activity, CalendarDays, Edit3, AlertTriangle, X, Printer, ShoppingCart, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { Paciente, Atencion, Venta, VentaItem, PackCredito } from '../../types/entities';
import { AtencionDrawer } from './components/AtencionDrawer';
import { StampCard } from '../../components/StampCard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function HistoriaClinicaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [atenciones, setAtenciones] = useState<Atencion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { perfil } = useAuthStore();
  const isPodologo = perfil?.rol_nombre === 'podologo';
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [originCitaId, setOriginCitaId] = useState<string | null>(null);
  const [selectedAtencion, setSelectedAtencion] = useState<Atencion | null>(null);
  const [selectedImage, setSelectedImage] = useState<{url: string, atencion: Atencion} | null>(null);
  const [activeTab, setActiveTab] = useState<'historial' | 'compras' | 'packs'>('historial');
  const [packsData, setPacksData] = useState<PackCredito[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [ventasLoading, setVentasLoading] = useState(false);
  const [printAtencionId, setPrintAtencionId] = useState<string | null>(null);

  useEffect(() => {
    const handleAfterPrint = () => setPrintAtencionId(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  useEffect(() => {
    const action = searchParams.get('action');
    const citaId = searchParams.get('cita_id');
    
    if (action === 'new_atencion') {
      setIsDrawerOpen(true);
      if (citaId) {
        setOriginCitaId(citaId);
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchHistoria = async () => {
    if (!id) return;
    setIsLoading(true);
    
    // Fetch patient info
    const { data: pacienteData } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', id)
      .single();
      
    if (pacienteData) {
      setPaciente(pacienteData);
    }
    
    // Fetch atenciones
    const { data: atencionesData } = await supabase
      .from('atenciones')
      .select('*, podologos(id, nombres, color_etiqueta)')
      .eq('paciente_id', id)
      .order('created_at', { ascending: false });
      
    if (atencionesData) {
      setAtenciones(atencionesData);
    }

    // Fetch packs del paciente (activos + completados)
    const { data: creditosData } = await supabase
      .from('pack_creditos')
      .select('*, packs_promociones:pack_id (nombre, tipo, precio_pack), pack_sesiones_log (id, sesion_numero, fecha_uso, monto_pagado)')
      .eq('paciente_id', id)
      .in('estado', ['activo', 'completado'])
      .order('fecha_compra', { ascending: false });
    if (creditosData) {
      setPacksData(creditosData as unknown as PackCredito[]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchHistoria();
  }, [id]);

  const fetchVentas = async () => {
    if (!id) return;
    setVentasLoading(true);
    const { data } = await supabase
      .from('ventas')
      .select('*')
      .eq('paciente_id', id)
      .order('created_at', { ascending: false });
    if (data) setVentas(data);
    setVentasLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'compras' && ventas.length === 0 && !ventasLoading) {
      fetchVentas();
    }
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="p-8 text-center text-gray-500">
        <h2 className="text-xl font-bold">Paciente no encontrado</h2>
        <button onClick={() => navigate('/pacientes')} className="mt-4 text-primary underline">Volver al directorio</button>
      </div>
    );
  }

  let edad = '-';
  if (paciente.fecha_nacimiento) {
    const today = new Date();
    const dob = new Date(paciente.fecha_nacimiento);
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    edad = `${age} años`;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12 print:max-w-none print:space-y-1.5 print:pb-0 print:text-[11px]">
      
      {/* Membrete de Impresión Oculto en Web */}
      <div className="hidden print:block mb-2 border-b border-gray-300 pb-2">
        <div className="flex items-center gap-2 mb-0.5">
          <Activity className="w-5 h-5 text-[#00C288]" />
          <div>
            <h1 className="text-base font-bold text-[#004975] leading-none">Centro Podológico G&C</h1>
            <h2 className="text-xs font-medium text-gray-500">Historia Clínica Podológica</h2>
          </div>
        </div>
        <p className="text-[10px] font-medium text-gray-500">
          Fecha de Impresión: {format(new Date(), "d 'de' MMMM, yyyy - HH:mm", { locale: es })}
        </p>
      </div>

      <button 
        onClick={() => navigate('/pacientes')} 
        className="flex items-center gap-2 text-secondary hover:text-[#00C288] transition-colors w-max font-medium print:hidden"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver a Pacientes
      </button>

      {/* Header Profile Panel */}
      <div className="bg-background-container rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center print:shadow-none print:border print:border-gray-300 print:break-inside-avoid print:p-2 print:gap-1">
        <div>
          <h1 className="text-3xl font-bold text-[#004975] print:text-lg">
            {paciente.nombres} {paciente.apellidos}
          </h1>
          <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-3 text-sm text-gray-600 font-medium print:mt-0.5 print:text-[10px] print:gap-1">
            <span className="bg-blue-50 text-[#004975] px-3 py-1 rounded-full border border-blue-100 print:border-none print:bg-transparent print:p-0 print:mr-4">
              <strong>Doc:</strong> {isPodologo ? '***' : `${paciente.numero_documento} (${paciente.tipo_documento})`}
            </span>
            <span className="bg-gray-50 px-3 py-1 rounded-full border border-gray-100 print:border-none print:bg-transparent print:p-0 print:mr-4">
              <strong>Tel:</strong> {isPodologo ? '***' : (paciente.telefono || '-')}
            </span>
            {!isPodologo && (
              <span className="bg-gray-50 px-3 py-1 rounded-full border border-gray-100 print:border-none print:bg-transparent print:p-0">
                <strong>Edad:</strong> {edad}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex w-full md:w-auto flex-col md:flex-row gap-3 mt-2 md:mt-0 print:hidden">
          {!isPodologo && (
            <button 
              onClick={() => {
                setPrintAtencionId(null);
                setTimeout(() => window.print(), 100);
              }}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium shadow-sm transition-colors whitespace-nowrap"
            >
              <Printer className="w-5 h-5 text-gray-500" />
              Imprimir Historial
            </button>
          )}
          
          <button 
            onClick={() => {
              setSelectedAtencion(null);
              setIsDrawerOpen(true);
            }}
            className="bg-[#00C288] hover:bg-[#00ab78] text-white px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium shadow-md transition-colors whitespace-nowrap"
          >
            <Activity className="w-5 h-5" />
            Nueva Atención
          </button>
        </div>
      </div>

      {/* Loyalty Stamp Card */}
      <div className="print:hidden">
        <StampCard sellos={paciente.sellos || 0} sellosCanjeados={paciente.sellos_canjeados || 0} />
      </div>

      {/* Packs Activos - Resumen compacto */}
      {packsData.filter(p => p.estado === 'activo').length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 print:hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-[#004975] flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-500" />
              Packs Activos
            </h3>
            <button onClick={() => setActiveTab('packs')} className="text-[10px] font-black text-purple-500 hover:text-purple-700 uppercase tracking-wider transition-colors">
              Ver detalle
            </button>
          </div>
          <div className="space-y-2">
            {packsData.filter(p => p.estado === 'activo').map(pack => {
              const info = pack.packs_promociones as unknown as { nombre: string; tipo: string } | null;
              const pct = pack.sesiones_total > 0 ? (pack.sesiones_usadas / pack.sesiones_total) * 100 : 0;
              const restantes = pack.sesiones_total - pack.sesiones_usadas;
              return (
                <div key={pack.id} className="flex items-center gap-3 bg-purple-50/50 rounded-lg border border-purple-100 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-[#004975] truncate">{info?.nombre || 'Pack'}</p>
                    <div className="w-full bg-purple-100 rounded-full h-1.5 mt-1">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full shrink-0">
                    {restantes} rest.
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Panel de Perfil Clínico / Antecedentes */}
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 print:shadow-none ${printAtencionId ? 'print:hidden' : 'print:border-gray-300 print:break-inside-avoid print:p-4'}`}>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Antecedentes y Alertas Médicas
        </h2>
        
        {!(paciente.diabetes || paciente.hipertension || paciente.enfermedad_vascular || paciente.tratamiento_oncologico || paciente.alergias_detalle || paciente.alergias_alertas) ? (
          <div className="flex items-center gap-2 text-[#00C288] bg-[#00C288]/10 px-4 py-3 rounded-lg border border-[#00C288]/20">
            <span className="font-medium text-sm">Sin antecedentes médicos de riesgo registrados.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Badges Booleanos */}
            {(paciente.diabetes || paciente.hipertension || paciente.enfermedad_vascular || paciente.tratamiento_oncologico) && (
              <div className="flex flex-wrap gap-2.5">
                {paciente.diabetes && (
                  <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-100 shadow-sm uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5" /> Paciente Diabético
                  </span>
                )}
                {paciente.hipertension && (
                  <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-orange-100 shadow-sm uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5" /> Hipertensión
                  </span>
                )}
                {paciente.enfermedad_vascular && (
                  <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-orange-100 shadow-sm uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5" /> Enf. Vascular
                  </span>
                )}
                {paciente.tratamiento_oncologico && (
                  <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-purple-100 shadow-sm uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5" /> Trat. Oncológico
                  </span>
                )}
              </div>
            )}
            
            {/* Textos Libres */}
            {(paciente.alergias_detalle || paciente.alergias_alertas) && (
              <div className="bg-red-50/50 rounded-xl p-4 md:p-5 border border-red-100/50 flex flex-col gap-4">
                {paciente.alergias_detalle && (
                  <div>
                    <span className="text-[11px] font-bold text-red-800/70 tracking-wider uppercase flex items-center gap-1.5 mb-1"><AlertTriangle className="w-3 h-3" /> Detalle de Alergias</span>
                    <p className="text-sm font-bold text-red-700 leading-snug">{paciente.alergias_detalle}</p>
                  </div>
                )}
                {paciente.alergias_alertas && (
                  <div>
                    <span className="text-[11px] font-bold text-red-800/70 tracking-wider uppercase flex items-center gap-1.5 mb-1"><AlertTriangle className="w-3 h-3" /> Otras Alertas Médicas (Cruciales)</span>
                    <p className="text-sm font-bold text-red-700 leading-snug whitespace-pre-wrap">{paciente.alergias_alertas}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs: Historial / Compras */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-6 print:hidden">
          <button
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
              activeTab === 'historial'
                ? 'bg-[#004975] text-white shadow-lg shadow-[#004975]/20'
                : 'text-gray-400 hover:text-[#004975] hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            Historial
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeTab === 'historial' ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
              {atenciones.length}
            </span>
          </button>
          {!isPodologo && (
            <button
              onClick={() => setActiveTab('compras')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
                activeTab === 'compras'
                  ? 'bg-[#004975] text-white shadow-lg shadow-[#004975]/20'
                  : 'text-gray-400 hover:text-[#004975] hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Compras
              {ventas.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeTab === 'compras' ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                  {ventas.length}
                </span>
              )}
            </button>
          )}
          {!isPodologo && (
            <button
              onClick={() => setActiveTab('packs')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
                activeTab === 'packs'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-gray-400 hover:text-purple-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Package className="w-4 h-4" />
              Packs
              {packsData.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeTab === 'packs' ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                  {packsData.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Print-only title */}
        <h2 className="hidden print:flex text-sm font-bold text-secondary mb-2 items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          {printAtencionId ? 'Detalle de Atención' : 'Historial de Evolución'}
        </h2>

        {activeTab === 'historial' && atenciones.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-gray-100 border-dashed print:border-none print:p-2">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3 print:hidden" />
            <p className="text-gray-500 font-medium">Aún no hay atenciones registradas.</p>
          </div>
        ) : activeTab === 'historial' ? (
          <div className="relative border-l-2 border-gray-100 ml-3 md:ml-4 space-y-8 print:border-l-0 print:ml-0 print:space-y-0">
            {atenciones.map((atencion) => (
              <div key={atencion.id} className={`relative pl-6 md:pl-8 group print:pl-0 ${printAtencionId && printAtencionId !== atencion.id ? 'print:hidden' : ''}`}>
                {/* Visual Node */}
                <div className="absolute w-4 h-4 bg-[#00C288] rounded-full -left-[9px] top-1 border-4 border-background ring-1 ring-gray-200 shadow-sm print:hidden" />
                
                {/* Timeline Card */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all print:shadow-none print:p-0 print:border-none print:bg-transparent">
                  <div className="flex justify-between items-start mb-5 pb-3 border-b border-gray-50 print:border-gray-200 print:mb-2 print:pb-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-[#004975] font-bold print:text-xs print:gap-1">
                      <CalendarDays className="w-4 h-4 text-[#00C288] shrink-0 print:text-gray-500 print:w-3 print:h-3" />
                      {format(new Date(atencion.created_at), "EEEE d 'de' MMMM, yyyy - HH:mm", { locale: es })}
                      
                      {atencion.podologos && (
                        <>
                          <span className="text-gray-300 mx-1 hidden md:inline-block print:hidden">•</span>
                          <span className="text-[11px] px-2.5 py-0.5 mt-1 sm:mt-0 rounded-full border border-[#00C288]/30 bg-[#00C288]/5 text-[#00a672]">
                            Atendido por: {atencion.podologos.nombres}
                          </span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setPrintAtencionId(atencion.id);
                          setTimeout(() => window.print(), 100);
                        }}
                        className="text-gray-400 hover:text-[#004975] transition-colors flex items-center gap-1 text-sm font-medium opacity-0 group-hover:opacity-100 focus:opacity-100 print:hidden"
                      >
                        <Printer className="w-4 h-4" />
                        Imprimir
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedAtencion(atencion);
                          setIsDrawerOpen(true);
                        }}
                        className="text-gray-400 hover:text-[#00C288] transition-colors flex items-center gap-1 text-sm font-medium opacity-0 group-hover:opacity-100 focus:opacity-100 print:hidden"
                      >
                        <Edit3 className="w-4 h-4" />
                        Editar
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-5 print:space-y-1.5">
                    <div className="print:break-inside-avoid">
                      <h4 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1.5 print:text-[9px] print:mb-0.5">Motivo de Consulta</h4>
                      <p className="text-secondary font-semibold text-lg print:text-sm">{atencion.motivo_consulta}</p>
                    </div>

                    {atencion.diagnostico && (
                      <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100/50 print:break-inside-avoid print:p-1.5 print:rounded">
                        <h4 className="text-xs font-bold text-blue-800 tracking-wider uppercase mb-1 print:text-[9px] print:mb-0.5">Diagnóstico</h4>
                        <p className="text-blue-900 text-sm whitespace-pre-wrap print:text-[11px]">{atencion.diagnostico}</p>
                      </div>
                    )}

                    {(atencion.evaluacion_piel?.length || atencion.evaluacion_unas?.length) ? (
                      <div className="print:break-inside-avoid">
                        <h4 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-2 print:text-[9px] print:mb-1">Evaluación Física</h4>
                        <div className="flex flex-wrap gap-2">
                          {atencion.evaluacion_piel?.map(item => (
                            <span key={item} className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider shadow-sm print:text-[9px] print:px-1 print:py-0.5">Piel: {item}</span>
                          ))}
                          {atencion.evaluacion_unas?.map(item => (
                            <span key={item} className="bg-purple-50 text-purple-900 border border-purple-200 px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider shadow-sm print:text-[9px] print:px-1 print:py-0.5">Uñas: {item}</span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    
                    <div className="print:break-inside-avoid">
                      <h4 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-2 print:text-[9px] print:mb-1">Tratamientos Aplicados</h4>
                      {atencion.tratamientos_realizados && atencion.tratamientos_realizados.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {atencion.tratamientos_realizados.map(item => (
                            <span key={item} className="bg-blue-50 text-blue-800 border border-blue-100 px-2.5 py-1 rounded-md text-[13px] font-bold shadow-sm print:text-[10px] print:px-1.5 print:py-0.5">
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      
                      {atencion.tratamiento && (
                        <div className="bg-gray-50/80 rounded-lg p-4 border border-gray-100/80 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-2 print:p-1.5 print:mt-1 print:text-[11px] print:leading-snug">
                          <span className="font-bold text-gray-500/80 block mb-1 text-[11px] uppercase tracking-wider print:text-[9px] print:mb-0.5">Observaciones Adicionales:</span>
                          {atencion.tratamiento}
                        </div>
                      )}
                    </div>

                    {atencion.productos_usados && atencion.productos_usados.length > 0 && (
                      <div className="print:break-inside-avoid">
                        <h4 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-2 print:text-[9px] print:mb-1">Productos Utilizados</h4>
                        <div className="flex flex-wrap gap-2 print:gap-1">
                          {atencion.productos_usados.map(item => (
                            <span key={item} className="bg-[#00C288]/10 text-[#004975] border border-[#00C288]/20 px-2.5 py-1 rounded-md text-[13px] font-bold shadow-sm print:text-[10px] print:px-1.5 print:py-0.5">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {atencion.medicamentos_recetados && atencion.medicamentos_recetados.length > 0 && (
                      <div className="print:break-inside-avoid">
                        <h4 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-2 print:text-[9px] print:mb-1">Medicamentos Recetados</h4>
                        <div className="flex flex-wrap gap-2 print:gap-1">
                          {atencion.medicamentos_recetados.map(item => (
                            <span key={item} className="bg-purple-50 text-purple-800 border border-purple-100 px-2.5 py-1 rounded-md text-[13px] font-bold shadow-sm print:text-[10px] print:px-1.5 print:py-0.5">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {atencion.recomendaciones && (
                      <div className="bg-green-50/50 rounded-lg p-3 border border-green-100/50 print:break-inside-avoid print:p-1.5 print:rounded">
                        <h4 className="text-xs font-bold text-green-800 tracking-wider uppercase mb-1 print:text-[9px] print:mb-0.5">Recomendaciones</h4>
                        <p className="text-green-900 text-sm whitespace-pre-wrap print:text-[11px]">{atencion.recomendaciones}</p>
                      </div>
                    )}

                    {atencion.indicaciones && (
                      <div className="bg-yellow-50/50 rounded-lg p-4 border border-yellow-100/50 print:color-adjust-exact print:break-inside-avoid print:p-1.5 print:rounded">
                        <h4 className="text-xs font-bold text-yellow-800 tracking-wider uppercase mb-1.5 print:text-[9px] print:mb-0.5">Indicaciones al Paciente</h4>
                        <p className="text-yellow-900 text-sm whitespace-pre-wrap print:text-[11px]">{atencion.indicaciones}</p>
                      </div>
                    )}

                    {atencion.proxima_cita && (
                      <div className="flex items-center gap-2 bg-[#00C288]/5 rounded-lg p-3 border border-[#00C288]/20 print:break-inside-avoid print:p-1.5 print:gap-1.5 print:rounded">
                        <CalendarDays className="w-4 h-4 text-[#00C288] shrink-0 print:w-3 print:h-3" />
                        <div>
                          <span className="text-[10px] font-black text-[#00C288] uppercase tracking-wider print:text-[8px]">Próxima cita sugerida</span>
                          <p className="text-sm font-bold text-[#004975] print:text-[11px]">
                            {format(new Date(atencion.proxima_cita + 'T12:00:00'), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {atencion.fotos && atencion.fotos.length > 0 && (
                      <div className="mt-4 print:mt-1.5 print:break-inside-avoid">
                        <h4 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-2 print:text-[9px] print:mb-1">Imágenes Clínicas</h4>
                        <div className="flex flex-wrap gap-3 print:gap-1.5">
                          {atencion.fotos.map((foto, idx) => (
                            <button 
                              key={idx}
                              onClick={() => setSelectedImage({ url: foto, atencion })}
                              className="relative w-20 h-20 md:w-24 md:h-24 print:w-12 print:h-12 rounded-lg border border-gray-200 overflow-hidden hover:ring-2 hover:ring-[#00C288] hover:border-transparent transition-all shadow-sm group print:shadow-none print:hover:ring-0"
                              title="Cargar visualización completa"
                            >
                              <img 
                                src={foto} 
                                alt={`Evidencia Clínica ${idx + 1}`} 
                                className="w-full h-full object-cover" 
                                loading="lazy" 
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'compras' ? (
          ventasLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-[#00C288] rounded-full animate-spin" />
            </div>
          ) : ventas.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl border border-gray-100 border-dashed">
              <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Este paciente no tiene compras registradas.</p>
              <p className="text-gray-400 text-sm mt-1">Las ventas realizadas desde Caja → Ventas aparecerán aquí.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Compras</span>
                  <p className="text-xl font-black text-[#004975] tabular-nums mt-1">{ventas.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Gastado</span>
                  <p className="text-xl font-black text-[#00C288] tabular-nums mt-1">S/ {ventas.reduce((s: number, v: Venta) => s + v.total, 0).toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Productos Comprados</span>
                  <p className="text-xl font-black text-[#004975] tabular-nums mt-1">{ventas.reduce((s: number, v: Venta) => s + (v.items || []).reduce((a: number, i: VentaItem) => a + i.cantidad, 0), 0)}</p>
                </div>
              </div>

              {/* Lista de compras */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Fecha</th>
                      <th className="text-left px-5 py-3 text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Productos</th>
                      <th className="text-center px-5 py-3 text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Método</th>
                      <th className="text-right px-5 py-3 text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map((venta: Venta, index: number) => (
                      <tr key={venta.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-[#004975] text-sm">{format(new Date(venta.created_at), "d MMM yyyy", { locale: es })}</p>
                          <p className="text-[11px] font-bold text-gray-400">{format(new Date(venta.created_at), "hh:mm a")}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {(venta.items || []).map((item: VentaItem, i: number) => (
                              <span key={i} className="bg-[#00C288]/10 text-[#004975] border border-[#00C288]/20 px-2 py-0.5 rounded text-[11px] font-bold">
                                <Package className="w-3 h-3 inline mr-1" />{item.nombre} ×{item.cantidad}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-600">{venta.metodo_pago}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="font-black text-[#004975] tabular-nums">S/ {Number(venta.total).toFixed(2)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : activeTab === 'packs' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {packsData.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
                <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-bold text-sm">Este paciente no tiene packs registrados</p>
              </div>
            ) : (
              <>
                {/* Activos */}
                {packsData.filter(p => p.estado === 'activo').length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-black text-[#004975] uppercase tracking-[0.15em] mb-3">Activos</h3>
                    <div className="space-y-4">
                      {packsData.filter(p => p.estado === 'activo').map(credito => {
                        const info = credito.packs_promociones as unknown as { nombre: string; tipo: string; precio_pack: number | null } | null;
                        const pct = credito.sesiones_total > 0 ? (credito.sesiones_usadas / credito.sesiones_total) * 100 : 0;
                        const logs = (credito.pack_sesiones_log || []).sort((a, b) => a.sesion_numero - b.sesion_numero);
                        const totalPagado = logs.reduce((s, l) => s + (l.monto_pagado || 0), 0);

                        return (
                          <div key={credito.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-5">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-black text-[#004975]">{info?.nombre || 'Pack'}</h4>
                                <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                                  {credito.sesiones_total - credito.sesiones_usadas} restantes
                                </span>
                              </div>
                              <div className="w-full bg-purple-100 rounded-full h-3 mb-2">
                                <div className="bg-purple-500 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-xs font-bold text-gray-400">
                                {credito.sesiones_usadas} de {credito.sesiones_total} sesiones
                                {info?.tipo?.includes('prepago') ? ' · Prepago' : info?.tipo?.includes('fraccionado') ? ' · Fraccionado' : ' · Pack'}
                              </p>
                            </div>

                            {credito.sesiones_total > 1 && (
                              <div className="border-t border-gray-100">
                                <table className="w-full">
                                  <thead>
                                    <tr className="bg-gray-50">
                                      <th className="text-left px-5 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">#</th>
                                      <th className="text-left px-5 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">Fecha</th>
                                      <th className="text-right px-5 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">Monto</th>
                                      <th className="text-center px-5 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Array.from({ length: credito.sesiones_total }, (_, i) => {
                                      const log = logs.find(l => l.sesion_numero === i + 1);
                                      return (
                                        <tr key={i} className="border-t border-gray-50">
                                          <td className="px-5 py-2.5 text-xs font-bold text-gray-400">{i + 1}</td>
                                          <td className="px-5 py-2.5 text-xs font-bold text-[#004975]">
                                            {log ? format(new Date(log.fecha_uso), "d MMM yyyy", { locale: es }) : '-'}
                                          </td>
                                          <td className="px-5 py-2.5 text-xs font-bold text-right tabular-nums text-gray-600">
                                            {log ? `S/ ${log.monto_pagado.toFixed(2)}` : '-'}
                                          </td>
                                          <td className="px-5 py-2.5 text-center">
                                            {log ? (
                                              <span className="text-[10px] font-bold text-[#00C288] bg-[#00C288]/10 px-2 py-0.5 rounded-full">Completada</span>
                                            ) : (
                                              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Pendiente</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-gray-400">
                                Comprado: {format(new Date(credito.fecha_compra), "d MMM yyyy", { locale: es })}
                              </span>
                              <span className="text-xs font-black text-[#004975] tabular-nums">
                                Total pagado: S/ {totalPagado.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Completados */}
                {packsData.filter(p => p.estado === 'completado').length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] mb-3">Completados</h3>
                    <div className="space-y-3">
                      {packsData.filter(p => p.estado === 'completado').map(credito => {
                        const info = credito.packs_promociones as unknown as { nombre: string; tipo: string } | null;
                        const logs = credito.pack_sesiones_log || [];
                        const totalPagado = logs.reduce((s, l) => s + (l.monto_pagado || 0), 0);

                        return (
                          <div key={credito.id} className="bg-gray-50 rounded-xl border border-gray-200 p-4 opacity-75">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-black text-[#004975] flex items-center gap-2">
                                  {info?.nombre || 'Pack'}
                                  <span className="text-[10px] font-bold text-[#00C288] bg-[#00C288]/10 px-2 py-0.5 rounded-full">Completado</span>
                                </p>
                                <p className="text-[10px] font-bold text-gray-400 mt-1">
                                  {credito.sesiones_total} sesiones · Total pagado: S/ {totalPagado.toFixed(2)}
                                  {credito.fecha_compra && ` · ${format(new Date(credito.fecha_compra), "d MMM yyyy", { locale: es })}`}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}
      </div>

      {paciente && (
        <AtencionDrawer 
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onSuccess={fetchHistoria}
          pacienteId={paciente.id}
          atencion={selectedAtencion}
          originCitaId={originCitaId}
        />
      )}

      {/* Lightbox / Modal de Imagen Ampliada Glassmorphic */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/20 backdrop-blur-[16px] transition-all animate-in fade-in duration-300 p-4 md:p-10"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="bg-white w-full max-w-5xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-2xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.2)] border border-gray-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-[#00C288]/10 p-2.5 rounded-xl border border-[#00C288]/20">
                  <Activity className="w-5 h-5 text-[#00C288]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#004975] text-lg leading-tight">Centro Podológico G&C</h3>
                  <p className="text-xs text-gray-400 font-medium">Detalle de Evolución Clínica</p>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedImage(null)}
                className="p-2.5 bg-gray-50 hover:bg-[#00C288]/10 text-gray-400 hover:text-[#00C288] rounded-full transition-colors group border border-gray-100"
                title="Cerrar Visor"
              >
                <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
            
            {/* Image Container */}
            <div className="flex-1 bg-gray-50/50 p-2 md:p-6 flex items-center justify-center overflow-hidden min-h-0 relative">
              <img 
                src={selectedImage.url} 
                alt="Visor Clínico Ampliado" 
                className="max-w-full max-h-full object-contain rounded-lg drop-shadow-sm select-none"
              />
            </div>

            {/* Metadata Footer */}
            <div className="p-4 md:p-5 bg-white border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
              <div>
                <h4 className="font-bold text-[#004975] text-base">
                  Paciente: {paciente?.nombres} {paciente?.apellidos}
                </h4>
                <p className="text-sm text-[#00C288] font-medium flex items-center gap-2 mt-0.5">
                  <CalendarDays className="w-4 h-4" />
                  {format(new Date(selectedImage.atencion.created_at), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
              <div className="bg-gray-50 px-5 py-3 rounded-xl border border-gray-100 w-full md:max-w-sm">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Contexto del Tratamiento</p>
                <p className="text-sm font-medium text-[#004975] leading-snug">{selectedImage.atencion.motivo_consulta}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
