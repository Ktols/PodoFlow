import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, User, Clock, CreditCard, Hash, Gift } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { StampCard } from '../../../components/StampCard';
import { SELLOS_PARA_GRATIS } from '../../../config/clinicData';
import { useBranchStore } from '../../../stores/branchStore';
import type { CitaParaCobro } from '../../../types/entities';
import { METODOS_PAGO } from '../../../constants';

interface ServicioActivo {
  id: string;
  nombre: string;
  precio_base: number;
}

interface CobroDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  cita: CitaParaCobro | null;
}

export function CobroDrawer({ isOpen, onClose, onSuccess, cita }: CobroDrawerProps) {
  const { sucursalActiva } = useBranchStore();
  const [servicios, setServicios] = useState<ServicioActivo[]>([]);
  const [selectedServicios, setSelectedServicios] = useState<Set<string>>(new Set());
  const [montoTotal, setMontoTotal] = useState<string>('');
  const [montoManual, setMontoManual] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const [codigoReferencia, setCodigoReferencia] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [heredadoDeMedico, setHeredadoDeMedico] = useState(false);
  const [pacienteSellos, setPacienteSellos] = useState(0);
  const [pacienteSellosCanjeados, setPacienteSellosCanjeados] = useState(0);
  const [canjearVisitaGratis, setCanjearVisitaGratis] = useState(false);

  // Contador de aperturas: se incrementa cada vez que isOpen pasa a true.
  // Esto fuerza al useEffect a re-ejecutarse incluso si cita es el mismo objeto.
  const openCounterRef = useRef(0);
  const [openCounter, setOpenCounter] = useState(0);

  useEffect(() => {
    if (isOpen) {
      openCounterRef.current += 1;
      setOpenCounter(openCounterRef.current);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !cita || openCounter === 0) return;

    // === HARD RESET de todo el estado del formulario ===
    setSelectedServicios(new Set());
    setMontoTotal('');
    setMontoManual(false);
    setMetodoPago('');
    setCodigoReferencia('');
    setErrors({});
    setHeredadoDeMedico(false);
    setCanjearVisitaGratis(false);
    setPacienteSellos(0);
    setPacienteSellosCanjeados(0);

    const initDrawer = async () => {
      // 0. Fetch sellos del paciente
      const { data: pacienteData } = await supabase
        .from('pacientes')
        .select('sellos, sellos_canjeados')
        .eq('id', cita.paciente_id)
        .single();
      if (pacienteData) {
        setPacienteSellos(pacienteData.sellos || 0);
        setPacienteSellosCanjeados(pacienteData.sellos_canjeados || 0);
      }

      // 1. Fetch FRESCO de servicios activos (sin caché)
      const { data: serviciosData } = await supabase
        .from('servicios')
        .select('id, nombre, precio_base')
        .eq('estado', true)
        .eq('sucursal_id', sucursalActiva?.id)
        .order('nombre');

      const svcs = serviciosData || [];
      setServicios(svcs);

      // 2. Fetch FRESCO de la atención vinculada a esta cita
      const { data: atencionData } = await supabase
        .from('atenciones')
        .select('tratamientos_realizados')
        .eq('cita_id', cita.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 3. Reset + inyección de datos frescos
      if (atencionData?.tratamientos_realizados && Array.isArray(atencionData.tratamientos_realizados)) {
        const nombresHeredados: string[] = atencionData.tratamientos_realizados;
        const idsPreseleccionados = new Set<string>();
        for (const srv of svcs) {
          if (nombresHeredados.includes(srv.nombre)) {
            idsPreseleccionados.add(srv.id);
          }
        }
        if (idsPreseleccionados.size > 0) {
          setSelectedServicios(idsPreseleccionados);
          setHeredadoDeMedico(true);

          // 4. Cálculo inmediato del monto heredado (no depender del useEffect secundario)
          const totalHeredado = svcs
            .filter(s => idsPreseleccionados.has(s.id))
            .reduce((sum, s) => sum + s.precio_base, 0);
          setMontoTotal(totalHeredado > 0 ? totalHeredado.toFixed(2) : '');
        }
      }
    };

    initDrawer();
  }, [openCounter]); // Solo depende del contador de aperturas

  // Auto-calculate total from selected
  useEffect(() => {
    if (!montoManual) {
      const total = servicios
        .filter(s => selectedServicios.has(s.id))
        .reduce((sum, s) => sum + s.precio_base, 0);
      setMontoTotal(total > 0 ? total.toFixed(2) : '');
    }
  }, [selectedServicios, servicios, montoManual]);

  const toggleServicio = (id: string) => {
    setSelectedServicios(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    // Reset manual mode when toggling services
    setMontoManual(false);
  };

  const handleMontoChange = (value: string) => {
    setMontoManual(true);
    setMontoTotal(value);
  };

  const getReferenciaLabel = (): { label: string; placeholder: string; required: boolean } => {
    switch (metodoPago) {
      case 'Tarjeta':
        return { label: 'Código AP / N° de Voucher', placeholder: 'Ej: 123456', required: false };
      case 'Yape':
      case 'Plin':
      case 'Transferencia':
        return { label: 'Número de Operación', placeholder: 'Ej: OP-789012', required: false };
      case 'Efectivo':
      default:
        return { label: 'N° de Recibo interno (Opcional)', placeholder: 'Ej: REC-001', required: false };
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const monto = parseFloat(montoTotal);
    if (!montoTotal || isNaN(monto) || monto <= 0) {
      newErrors.monto = 'El monto debe ser mayor a 0. Seleccione servicios o ingrese manualmente.';
    }
    if (!metodoPago) {
      newErrors.metodo = 'Seleccione un método de pago.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cita || !validate()) return;

    setIsSubmitting(true);

    try {
      const adelantoNum = cita.adelanto ? Number(cita.adelanto) : 0;
      const montoServicios = parseFloat(montoTotal);
      // Si canjea visita gratis: total = 0; si no: monto - adelanto
      const montoFinal = canjearVisitaGratis ? 0 : Math.max(0, montoServicios - adelantoNum);
      const payload: Record<string, any> = {
        cita_id: cita.id,
        paciente_id: cita.paciente_id,
        monto_total: montoFinal,
        metodo_pago: metodoPago,
        estado: 'Pagado',
        fecha_pago: new Date().toISOString(),
        visita_gratis: canjearVisitaGratis,
        sucursal_id: sucursalActiva?.id,
      };
      if (codigoReferencia.trim()) {
        payload.codigo_referencia = codigoReferencia.trim();
      }

      const { error } = await supabase.from('pagos').insert([payload]);

      if (error) throw error;

      // Actualizar sellos del paciente
      if (canjearVisitaGratis) {
        // Resetear sellos e incrementar canjeados
        await supabase.from('pacientes').update({
          sellos: 0,
          sellos_canjeados: pacienteSellosCanjeados + 1,
        }).eq('id', cita.paciente_id);
      } else {
        // Incrementar sellos en 1
        await supabase.from('pacientes').update({
          sellos: pacienteSellos + 1,
        }).eq('id', cita.paciente_id);
      }

      toast.success(canjearVisitaGratis ? '🎁 Visita gratis canjeada exitosamente' : 'Pago registrado exitosamente');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error('Error al registrar el pago');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatearHora = (horaFull: string) => {
    if (!horaFull) return '';
    const [hourStr, minStr] = horaFull.split(':');
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${minStr} ${ampm}`;
  };

  if (!isOpen || !cita) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="absolute right-0 top-0 h-full w-full md:w-[500px] lg:max-w-lg bg-white shadow-2xl z-[10000] transform transition-transform duration-300 flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-black text-[#004975]">Registrar Cobro</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors group"
          >
            <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="cobro-form" onSubmit={handleSubmit} className="space-y-6">

            {/* Patient Info Card */}
            <div className="bg-[#004975]/5 rounded-xl p-4 border border-[#004975]/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <User className="w-5 h-5 text-[#004975]" />
                </div>
                <div>
                  <p className="font-black text-[#004975] text-sm">
                    {cita.pacientes.nombres} {cita.pacientes.apellidos}
                  </p>
                  {cita.pacientes.numero_documento && (
                    <p className="text-[11px] font-bold text-[#004975]/60">
                      DOC: {cita.pacientes.numero_documento}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pl-[52px]">
                <span className="text-xs font-bold text-[#004975]/60 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatearHora(cita.hora_cita)}
                </span>
                {cita.podologos && (
                  <span
                    className="text-xs font-bold flex items-center gap-1"
                    style={{ color: cita.podologos.color_etiqueta }}
                  >
                    ● {cita.podologos.nombres}
                  </span>
                )}
              </div>
            </div>

            {/* Loyalty Stamp Card + Redeem Toggle */}
            <StampCard sellos={pacienteSellos} sellosCanjeados={pacienteSellosCanjeados} compact />
            {pacienteSellos >= SELLOS_PARA_GRATIS && (
              <button
                type="button"
                onClick={() => setCanjearVisitaGratis(!canjearVisitaGratis)}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                  canjearVisitaGratis
                    ? 'bg-[#00C288] border-[#00C288] text-white shadow-lg shadow-[#00C288]/30'
                    : 'bg-[#00C288]/5 border-[#00C288]/30 text-[#004975] hover:bg-[#00C288]/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Gift className={`w-6 h-6 ${canjearVisitaGratis ? 'text-white' : 'text-[#00C288]'}`} />
                  <div className="text-left">
                    <p className="font-black text-sm">
                      {canjearVisitaGratis ? '✓ Canjeando visita gratis' : 'Canjear visita gratis'}
                    </p>
                    <p className={`text-[11px] font-bold ${canjearVisitaGratis ? 'text-white/80' : 'text-gray-500'}`}>
                      Esta atención no se cobrará
                    </p>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors ${canjearVisitaGratis ? 'bg-white/30' : 'bg-gray-200'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform mt-0.5 ${canjearVisitaGratis ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                </div>
              </button>
            )}

            {/* Servicios Selector */}
            <div>
              <label className="block text-sm font-bold text-[#004975] mb-3">
                Servicios Realizados
              </label>
              {heredadoDeMedico && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2.5 animate-in fade-in duration-300">
                  <span className="text-lg">🩺</span>
                  <p className="text-xs font-bold text-blue-700">
                    Pre-cargado desde la atención médica. Puede ajustar manualmente si es necesario.
                  </p>
                </div>
              )}
              {servicios.length === 0 ? (
                <p className="text-sm font-bold text-gray-400 bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
                  No hay servicios activos. Cree uno desde la pestaña "Lista de Precios".
                </p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {[...servicios].sort((a, b) => {
                    const aSelected = selectedServicios.has(a.id);
                    const bSelected = selectedServicios.has(b.id);
                    if (aSelected && !bSelected) return -1;
                    if (!aSelected && bSelected) return 1;
                    return a.nombre.localeCompare(b.nombre);
                  }).map(servicio => {
                    const isSelected = selectedServicios.has(servicio.id);
                    return (
                      <button
                        key={servicio.id}
                        type="button"
                        onClick={() => toggleServicio(servicio.id)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                          isSelected
                            ? 'bg-[#00C288]/5 border-[#00C288]/30 shadow-sm'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-[#00C288] border-[#00C288]'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            )}
                          </div>
                          <span className={`text-sm font-bold ${isSelected ? 'text-[#004975]' : 'text-gray-600'}`}>
                            {servicio.nombre}
                          </span>
                        </div>
                        <span className={`text-sm font-black tabular-nums ${isSelected ? 'text-[#00C288]' : 'text-gray-400'}`}>
                          S/ {servicio.precio_base.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Monto Total */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-[#004975]">
                  Monto Total <span className="text-red-500">*</span>
                </label>
                {selectedServicios.size > 0 && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {montoManual ? '✏️ Editado manualmente' : `${selectedServicios.size} servicio(s) sumados`}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <span className="text-gray-400 font-black text-sm">S/</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={`w-full pl-16 pr-4 border bg-gray-50 focus:bg-white rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-[#00C288] transition-all shadow-sm font-black text-2xl tabular-nums ${
                    errors.monto ? 'border-red-500' : 'border-gray-200'
                  }`}
                  value={montoTotal}
                  onChange={(e) => handleMontoChange(e.target.value)}
                />
              </div>
              {errors.monto && (
                <p className="text-red-500 text-xs mt-1.5 font-bold px-1">{errors.monto}</p>
              )}
            </div>

            {/* Método de Pago */}
            <div>
              <label className="block text-sm font-bold text-[#004975] mb-3">
                Método de Pago <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {METODOS_PAGO.map(metodo => (
                  <button
                    key={metodo.value}
                    type="button"
                    onClick={() => setMetodoPago(metodo.value)}
                    className={`p-3.5 rounded-xl border text-sm font-bold transition-all text-left flex items-center gap-2.5 ${
                      metodoPago === metodo.value
                        ? 'bg-[#004975] text-white border-[#004975] shadow-lg shadow-[#004975]/20 scale-[1.02]'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <CreditCard className={`w-4 h-4 ${metodoPago === metodo.value ? 'text-white' : 'text-gray-400'}`} />
                    {metodo.label}
                  </button>
                ))}
              </div>
              {errors.metodo && (
                <p className="text-red-500 text-xs mt-2 font-bold px-1">{errors.metodo}</p>
              )}
            </div>

            {/* Código de Referencia Dinámico */}
            {metodoPago && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-sm font-bold text-[#004975] mb-2">
                  {getReferenciaLabel().label}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Hash className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder={getReferenciaLabel().placeholder}
                    className="w-full pl-11 pr-4 border border-gray-200 bg-gray-50 focus:bg-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#00C288] transition-all shadow-sm font-bold text-sm"
                    value={codigoReferencia}
                    onChange={(e) => setCodigoReferencia(e.target.value)}
                  />
                </div>
              </div>
            )}

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
          {/* Summary Bar */}
          {montoTotal && parseFloat(montoTotal) > 0 && (() => {
            const montoNum = parseFloat(montoTotal);
            const adelantoNum = cita?.adelanto ? Number(cita.adelanto) : 0;
            const totalFinal = canjearVisitaGratis ? 0 : Math.max(0, montoNum - adelantoNum);
            return (
              <div className="mb-4 p-3 bg-[#00C288]/5 rounded-xl border border-[#00C288]/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">Monto servicios</span>
                  <span className="text-sm font-bold text-gray-600 tabular-nums">S/ {montoNum.toFixed(2)}</span>
                </div>
                {canjearVisitaGratis && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#00C288]">🎁 Visita gratis (sellos canjeados)</span>
                    <span className="text-sm font-bold text-[#00C288] tabular-nums">- S/ {montoNum.toFixed(2)}</span>
                  </div>
                )}
                {!canjearVisitaGratis && adelantoNum > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#00C288]">Adelanto pagado ({cita?.adelanto_metodo_pago})</span>
                    <span className="text-sm font-bold text-[#00C288] tabular-nums">- S/ {adelantoNum.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1.5 border-t border-[#00C288]/10">
                  <span className="text-sm font-black text-[#004975]">Total a cobrar:</span>
                  <span className="text-xl font-black text-[#00C288] tabular-nums">S/ {totalFinal.toFixed(2)}</span>
                </div>
              </div>
            );
          })()}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-bold shadow-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="cobro-form"
              disabled={isSubmitting}
              className="px-8 py-3 bg-[#00C288] disabled:opacity-70 disabled:cursor-not-allowed text-white font-black rounded-xl hover:bg-[#00ab78] transition-all shadow-md flex items-center justify-center gap-2 min-w-[190px]"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Confirmar Pago
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
