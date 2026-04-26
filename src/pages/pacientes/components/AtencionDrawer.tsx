import { X, ImagePlus, XCircle, Package, Pill, CalendarDays, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { atencionSchema, type AtencionFormValues } from '../schemas/atencionSchema';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useBranchStore } from '../../../stores/branchStore';
import { type Atencion } from '../HistoriaClinicaPage';

interface AtencionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  pacienteId: string;
  atencion?: Atencion | null;
  originCitaId?: string | null;
}

export function AtencionDrawer({ isOpen, onClose, onSuccess, pacienteId, atencion, originCitaId }: AtencionDrawerProps) {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting }, reset } = useForm<AtencionFormValues>({
    resolver: zodResolver(atencionSchema),
  });
  const { sucursalActiva } = useBranchStore();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [podologosList, setPodologosList] = useState<any[]>([]);
  const [serviciosList, setServiciosList] = useState<{id: string, nombre: string, precio_base: number}[]>([]);
  const [productosList, setProductosList] = useState<{id: string, nombre: string}[]>([]);
  const [antecedentes, setAntecedentes] = useState<any>(null);

  useEffect(() => {
    const fetchPodologos = async () => {
      const { data } = await supabase.from('podologos').select('id, nombres, color_etiqueta').eq('estado', true);
      if (data) setPodologosList(data);
    };
    const fetchServicios = async () => {
      const { data } = await supabase.from('servicios').select('id, nombre, precio_base').eq('estado', true).order('nombre');
      if (data) setServiciosList(data);
    };
    const fetchProductos = async () => {
      const { data } = await supabase.from('productos').select('id, nombre').eq('estado', true).order('nombre');
      if (data) setProductosList(data);
    };
    const fetchAntecedentes = async () => {
      if (!pacienteId) return;
      const { data } = await supabase.from('pacientes').select('diabetes, hipertension, enfermedad_vascular, tratamiento_oncologico, alergias_detalle, alergias_alertas').eq('id', pacienteId).single();
      if (data) setAntecedentes(data);
    };
    fetchPodologos();
    fetchServicios();
    fetchProductos();
    fetchAntecedentes();
  }, [pacienteId]);

  useEffect(() => {
    if (isOpen) {
      if (atencion) {
        setExistingPhotos(atencion.fotos || []);
        reset({
          motivo_consulta: atencion.motivo_consulta,
          diagnostico: atencion.diagnostico || '',
          tratamiento: atencion.tratamiento || '',
          recomendaciones: atencion.recomendaciones || '',
          indicaciones: atencion.indicaciones || '',
          evaluacion_piel: atencion.evaluacion_piel || [],
          evaluacion_unas: atencion.evaluacion_unas || [],
          tratamientos_realizados: atencion.tratamientos_realizados || [],
          productos_usados: atencion.productos_usados || [],
          medicamentos_recetados: atencion.medicamentos_recetados || [],
          proxima_cita: atencion.proxima_cita || '',
          podologo_id: atencion.podologo_id || '',
        });
      } else {
        setExistingPhotos([]);
        reset({
          motivo_consulta: '',
          diagnostico: '',
          tratamiento: '',
          recomendaciones: '',
          indicaciones: '',
          evaluacion_piel: [],
          evaluacion_unas: [],
          tratamientos_realizados: [],
          productos_usados: [],
          medicamentos_recetados: [],
          proxima_cita: '',
          podologo_id: '',
        });
        
        if (originCitaId) {
          const fetchCita = async () => {
            const { data } = await supabase.from('citas').select('podologo_id, servicios_preseleccionados').eq('id', originCitaId).single();
            if (data?.podologo_id) {
              setValue('podologo_id', data.podologo_id);
            }
            if (data?.servicios_preseleccionados && Array.isArray(data.servicios_preseleccionados) && data.servicios_preseleccionados.length > 0) {
              setValue('tratamientos_realizados', data.servicios_preseleccionados, { shouldValidate: true });
            }
          };
          fetchCita();
        }
      }
      setSelectedFiles([]);
    }
  }, [atencion, isOpen, reset, originCitaId, setValue]);

  useEffect(() => {
    const urls = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [selectedFiles]);

  const onSubmit = async (data: AtencionFormValues) => {
    try {
      const uploadedUrls: string[] = [];
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop() || 'jpg';
          const fileName = `${pacienteId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('fotos_clinicas')
            .upload(fileName, file);
            
          if (uploadError) {
            toast.error(`Error subiendo imagen: ${file.name}`);
            console.error(uploadError);
            continue;
          }
          
          const { data: publicData } = supabase.storage
            .from('fotos_clinicas')
            .getPublicUrl(fileName);
            
          uploadedUrls.push(publicData.publicUrl);
        }
      }

      const allPhotos = [...existingPhotos, ...uploadedUrls];

      const dbData: any = {
        paciente_id: pacienteId,
        motivo_consulta: data.motivo_consulta,
        diagnostico: data.diagnostico || '',
        tratamiento: data.tratamiento || '',
        recomendaciones: data.recomendaciones || '',
        indicaciones: data.indicaciones || '',
        fotos: allPhotos.length > 0 ? allPhotos : null,
        evaluacion_piel: data.evaluacion_piel || [],
        evaluacion_unas: data.evaluacion_unas || [],
        tratamientos_realizados: data.tratamientos_realizados,
        productos_usados: data.productos_usados || [],
        medicamentos_recetados: data.medicamentos_recetados || [],
        proxima_cita: data.proxima_cita || null,
        podologo_id: data.podologo_id,
        sucursal_id: sucursalActiva?.id,
      };

      if (originCitaId && !atencion?.id) {
        dbData.cita_id = originCitaId;
      }

      if (atencion?.id) {
        const { error } = await supabase.from('atenciones').update(dbData).eq('id', atencion.id);
        if (error) throw error;
        toast.success('Atención editada correctamente');
      } else {
        const { error } = await supabase.from('atenciones').insert([dbData]);
        if (error) throw error;
        toast.success('Nueva atención registrada');
        
        if (originCitaId) {
          await supabase.from('citas').update({ estado: 'Atendida' }).eq('id', originCitaId);
        }
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error('Ocurrió un error al guardar');
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="absolute right-0 top-0 h-full w-full md:w-[500px] bg-background-container shadow-2xl z-[10000] transform transition-transform duration-300 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-secondary">
            {atencion ? 'Editar Atención Médica' : 'Registrar Nueva Atención'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">
          <form id="atencion-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-secondary mb-1">Motivo de Consulta <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  placeholder="Ej: Uña encarnada, heloma plantar..."
                  className={`w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-colors ${errors.motivo_consulta ? 'border-red-500' : 'border-gray-200'}`}
                  {...register('motivo_consulta')}
                />
                {errors.motivo_consulta && <p className="text-red-500 text-xs mt-1">{errors.motivo_consulta.message}</p>}
              </div>

              <div className="w-full md:w-64">
                <label className="block text-sm font-bold text-secondary mb-1">Especialista <span className="text-red-500">*</span></label>
                <select
                  className={`w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-colors appearance-none ${errors.podologo_id ? 'border-red-500' : 'border-gray-200'}`}
                  {...register('podologo_id')}
                >
                  <option value="">Seleccionar...</option>
                  {podologosList.map(pod => (
                    <option key={pod.id} value={pod.id}>{pod.nombres}</option>
                  ))}
                </select>
                {errors.podologo_id && <p className="text-red-500 text-xs mt-1">{errors.podologo_id.message}</p>}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <label className="block text-sm font-bold text-secondary mb-3">Evaluación Física Específica</label>
              
              <div className="mb-4">
                <p className="text-xs font-bold uppercase text-amber-700 tracking-wider mb-2">Estado de la Piel</p>
                <div className="flex flex-wrap gap-2.5">
                  {['Seca', 'Normal', 'Grasa', 'Callosidad', 'Durezas', 'Verrugas', 'Grietas'].map(opt => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-amber-300 transition-colors shadow-sm">
                      <input type="checkbox" value={opt} className="rounded text-amber-500 focus:ring-amber-500" {...register('evaluacion_piel')} />
                      <span className="text-[13px] font-medium text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-purple-700 tracking-wider mb-2">Estado de Uñas</p>
                <div className="flex flex-wrap gap-2.5">
                  {['Normal', 'Engrosadas', 'Micóticas/Hongos', 'Encarnadas'].map(opt => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors shadow-sm">
                      <input type="checkbox" value={opt} className="rounded text-purple-500 focus:ring-purple-500" {...register('evaluacion_unas')} />
                      <span className="text-[13px] font-medium text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm">
              <label className="block text-sm font-bold text-secondary mb-3">Tratamientos Realizados <span className="text-red-500">*</span></label>
              {serviciosList.length === 0 ? (
                <p className="text-sm font-bold text-gray-400 bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
                  No hay servicios activos. Cree uno desde Caja → Lista de Precios.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
                  {serviciosList.map(srv => (
                    <label key={srv.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 p-2 -ml-2 rounded-lg transition-colors group">
                      <input type="checkbox" value={srv.nombre} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" {...register('tratamientos_realizados')} />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-800 transition-colors uppercase tracking-tight">{srv.nombre}</span>
                    </label>
                  ))}
                </div>
              )}
              {errors.tratamientos_realizados && <p className="text-red-500 text-xs mt-2">{errors.tratamientos_realizados.message}</p>}
            </div>

            {/* Productos Usados */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm">
              <label className="block text-sm font-bold text-secondary mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#00C288]" />
                Productos Utilizados
              </label>
              {productosList.length === 0 ? (
                <p className="text-sm font-bold text-gray-400 bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
                  No hay productos activos. Cree uno desde Caja → Productos.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
                  {productosList.map(prod => (
                    <label key={prod.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 p-2 -ml-2 rounded-lg transition-colors group">
                      <input type="checkbox" value={prod.nombre} className="w-4 h-4 rounded text-[#00C288] focus:ring-[#00C288] border-gray-300" {...register('productos_usados')} />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-[#004975] transition-colors">{prod.nombre}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Antecedentes Médicos (read-only) */}
            {antecedentes && (antecedentes.diabetes || antecedentes.hipertension || antecedentes.enfermedad_vascular || antecedentes.tratamiento_oncologico || antecedentes.alergias_detalle || antecedentes.alergias_alertas) && (
              <div className="bg-red-50/50 rounded-xl border border-red-100 p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-[11px] font-black text-red-700 uppercase tracking-wider">Antecedentes Médicos del Paciente</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {antecedentes.diabetes && <span className="text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Diabetes</span>}
                  {antecedentes.hipertension && <span className="text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Hipertensión</span>}
                  {antecedentes.enfermedad_vascular && <span className="text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Enf. Vascular</span>}
                  {antecedentes.tratamiento_oncologico && <span className="text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Trat. Oncológico</span>}
                  {antecedentes.alergias_detalle && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{antecedentes.alergias_detalle}</span>}
                  {antecedentes.alergias_alertas && <span className="text-[10px] font-bold text-red-600">{antecedentes.alergias_alertas}</span>}
                </div>
              </div>
            )}

            {/* Diagnóstico */}
            <div>
              <label className="block text-sm font-bold text-secondary mb-1">Diagnóstico</label>
              <textarea
                rows={2}
                placeholder="Ej: Onicocriptosis bilateral, heloma plantar en zona metatarsal..."
                className="w-full border border-gray-200 bg-gray-50 focus:bg-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary resize-none transition-colors"
                {...register('diagnostico')}
              />
            </div>

            {/* Observaciones del Tratamiento */}
            <div>
              <label className="block text-sm font-bold text-secondary mb-1">Observaciones del Tratamiento</label>
              <textarea
                rows={2}
                placeholder="Detalles adicionales, técnica particular, anestesias usadas..."
                className="w-full border border-gray-200 bg-gray-50 focus:bg-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary resize-none transition-colors"
                {...register('tratamiento')}
              />
            </div>

            {/* Medicamentos Recetados */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <label className="block text-sm font-bold text-secondary mb-3 flex items-center gap-2">
                <Pill className="w-4 h-4 text-purple-500" />
                Medicamentos / Productos Recetados
              </label>
              {productosList.length === 0 ? (
                <p className="text-sm font-bold text-gray-400 bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
                  No hay productos registrados.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4">
                  {productosList.map(prod => (
                    <label key={prod.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-purple-50/50 p-2 -ml-2 rounded-lg transition-colors group">
                      <input type="checkbox" value={prod.nombre} className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300" {...register('medicamentos_recetados')} />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-purple-800 transition-colors">{prod.nombre}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-[10px] font-bold text-gray-400 mt-2">Productos recetados al paciente. Se descontarán del inventario.</p>
            </div>

            {/* Recomendaciones */}
            <div>
              <label className="block text-sm font-bold text-secondary mb-1">Recomendaciones</label>
              <textarea
                rows={2}
                placeholder="Ej: Evitar calzado cerrado, mantener pies secos..."
                className="w-full border border-gray-200 bg-gray-50 focus:bg-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary resize-none transition-colors"
                {...register('recomendaciones')}
              />
            </div>

            {/* Indicaciones */}
            <div>
              <label className="block text-sm font-bold text-secondary mb-1">Indicaciones para el Paciente</label>
              <textarea
                rows={2}
                placeholder="Ej: Aplicar crema antimicótica 2 veces al día, lavar con suero..."
                className="w-full border border-gray-200 bg-gray-50 focus:bg-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary resize-none transition-colors"
                {...register('indicaciones')}
              />
            </div>

            {/* Próxima Cita */}
            <div>
              <label className="block text-sm font-bold text-secondary mb-1 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#00C288]" />
                Próxima Cita Sugerida
              </label>
              <input
                type="date"
                className="w-full border border-gray-200 bg-gray-50 focus:bg-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary transition-colors"
                {...register('proxima_cita')}
              />
              <p className="text-xs text-gray-400 mt-1">Fecha sugerida para la siguiente visita del paciente.</p>
            </div>

            {/* Fotografías Clínicas */}
            <div>
              <label className="block text-sm font-bold text-secondary mb-2">Fotografías Clínicas</label>
              <div className="flex flex-col gap-3">
                <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg p-5 hover:bg-gray-100 hover:border-primary transition-colors cursor-pointer text-gray-500">
                  <ImagePlus className="w-5 h-5" />
                  <span className="font-medium text-sm">Subir nuevas imágenes</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                      }
                    }}
                  />
                </label>

                {(existingPhotos.length > 0 || previewUrls.length > 0) && (
                  <div className="grid grid-cols-4 gap-3 mt-1">
                    {existingPhotos.map((url, i) => (
                      <div key={`exist-${i}`} className="relative aspect-square rounded-lg border border-gray-200 overflow-hidden group">
                        <img src={url} alt="Previa existente" className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] text-center py-1 opacity-0 group-hover:opacity-100 transition-opacity">Registrada</div>
                      </div>
                    ))}
                    {previewUrls.map((url, i) => (
                      <div key={`new-${i}`} className="relative aspect-square rounded-lg border-2 border-primary/50 overflow-hidden group">
                        <img src={url} alt="Nueva previa" className="w-full h-full object-cover opacity-90" />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...selectedFiles];
                            updated.splice(i, 1);
                            setSelectedFiles(updated);
                          }}
                          className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors z-10"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <div className="absolute inset-x-0 bottom-0 bg-primary/90 text-white text-[9px] font-bold text-center py-1">Nueva</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
          </form>
        </div>
        
        <div className="p-6 border-t border-gray-100 bg-background flex justify-end gap-3 rounded-bl-xl">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="atencion-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-primary disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium rounded-lg hover:bg-[#00ab78] transition-colors shadow-md flex items-center justify-center min-w-[170px]"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Guardar Evolución'
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
}
