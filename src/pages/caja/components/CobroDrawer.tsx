import { useState, useEffect } from 'react';
import { X, CheckCircle2, User, Clock, Gift } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { StampCard } from '../../../components/StampCard';
import { SELLOS_PARA_GRATIS } from '../../../config/clinicData';
import { useBranchStore } from '../../../stores/branchStore';
import type { CitaParaCobro } from '../../../types/entities';
import { PaymentMethodPicker } from '../../../components/PaymentMethodPicker';

import { useCobroInit } from '../hooks/useCobroInit';
import { useProductCart } from '../hooks/useProductCart';
import { PackSection } from './PackSection';
import { ServicesCheckList } from './ServicesCheckList';
import { ProductCart } from './ProductCart';
import { PaymentSummary } from './PaymentSummary';

interface CobroDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  cita: CitaParaCobro | null;
}

export function CobroDrawer({ isOpen, onClose, onSuccess, cita }: CobroDrawerProps) {
  const { sucursalActiva } = useBranchStore();

  // Initialization hook
  const {
    servicios,
    selectedServicios,
    setSelectedServicios,
    heredadoDeMedico,
    pacienteSellos,
    pacienteSellosCanjeados,
    productosRecetados,
    packsDisponibles,
    selectedPack,
    setSelectedPack,
    creditoActivo,
    openCounter,
  } = useCobroInit(isOpen, cita);

  // Product cart hook
  const cart = useProductCart(sucursalActiva?.id);

  // Local form state
  const [montoTotal, setMontoTotal] = useState<string>('');
  const [montoManual, setMontoManual] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const [codigoReferencia, setCodigoReferencia] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [canjearVisitaGratis, setCanjearVisitaGratis] = useState(false);

  // Reset local form state when drawer opens
  useEffect(() => {
    if (openCounter === 0) return;
    setMontoTotal('');
    setMontoManual(false);
    setMetodoPago('');
    setCodigoReferencia('');
    setErrors({});
    setCanjearVisitaGratis(false);
    cart.reset();
  }, [openCounter]);

  // Auto-calculate total from selected services + products + pack discount
  useEffect(() => {
    if (!montoManual) {
      const totalServicios = servicios
        .filter(s => selectedServicios.has(s.id))
        .reduce((sum, s) => sum + s.precio_base, 0);
      const totalProductos = cart.items.reduce((sum, i) => sum + i.subtotal, 0);
      let total = totalServicios + totalProductos;

      if (selectedPack) {
        if (selectedPack.tipo === 'pack_servicios' && selectedPack.precio_pack) {
          const packSrvIds = new Set(
            (selectedPack.pack_items || []).filter(i => i.servicio_id).map(i => i.servicio_id)
          );
          const extraSrv = servicios
            .filter(s => selectedServicios.has(s.id) && !packSrvIds.has(s.id))
            .reduce((sum, s) => sum + s.precio_base, 0);
          total = selectedPack.precio_pack + extraSrv + totalProductos;
        } else if (selectedPack.tipo === 'pack_sesiones_prepago') {
          if (creditoActivo) {
            const packServiceIds = new Set(
              (selectedPack.pack_items || []).filter(i => i.servicio_id).map(i => i.servicio_id)
            );
            const extraServicios = servicios
              .filter(s => selectedServicios.has(s.id) && !packServiceIds.has(s.id))
              .reduce((sum, s) => sum + s.precio_base, 0);
            total = extraServicios + totalProductos;
          } else {
            const packServiceIds = new Set(
              (selectedPack.pack_items || []).filter(i => i.servicio_id).map(i => i.servicio_id)
            );
            const extraServicios = servicios
              .filter(s => selectedServicios.has(s.id) && !packServiceIds.has(s.id))
              .reduce((sum, s) => sum + s.precio_base, 0);
            total = (selectedPack.precio_pack || 0) + extraServicios + totalProductos;
          }
        } else if (selectedPack.tipo === 'pack_sesiones_fraccionado' && selectedPack.precio_pack && selectedPack.total_sesiones) {
          const packServiceIds2 = new Set(
            (selectedPack.pack_items || []).filter(i => i.servicio_id).map(i => i.servicio_id)
          );
          const extraServiciosFrac = servicios
            .filter(s => selectedServicios.has(s.id) && !packServiceIds2.has(s.id))
            .reduce((sum, s) => sum + s.precio_base, 0);
          total = (selectedPack.precio_pack / selectedPack.total_sesiones) + extraServiciosFrac + totalProductos;
        }
      }

      setMontoTotal(total > 0 ? total.toFixed(2) : total === 0 ? '0.00' : '');
    }
  }, [selectedServicios, servicios, cart.items, montoManual, selectedPack, creditoActivo]);

  const toggleServicio = (id: string) => {
    setSelectedServicios(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setMontoManual(false);
  };

  const handleMontoChange = (value: string) => {
    setMontoManual(true);
    setMontoTotal(value);
  };

  const handleAddItem = (producto: {id:string, nombre:string, precio:number, stock:number}) => {
    cart.addItem(producto);
    setMontoManual(false);
  };

  const handleUpdateQty = (productoId: string, delta: number) => {
    cart.updateQty(productoId, delta);
    setMontoManual(false);
  };

  const handleRemoveItem = (productoId: string) => {
    cart.removeItem(productoId);
    setMontoManual(false);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const monto = parseFloat(montoTotal);
    const allowZero = canjearVisitaGratis || (selectedPack?.tipo === 'pack_sesiones_prepago' && creditoActivo);
    if (!allowZero && (!montoTotal || isNaN(monto) || monto <= 0)) {
      newErrors.monto = 'El monto debe ser mayor a 0. Seleccione servicios o ingrese manualmente.';
    }
    const finalAmount = allowZero ? 0 : Math.max(0, monto - (cita?.adelanto ? Number(cita.adelanto) : 0));
    if (finalAmount > 0 && !metodoPago) {
      newErrors.metodo = 'Seleccione un metodo de pago.';
    }
    if (metodoPago && metodoPago !== 'Efectivo' && !codigoReferencia.trim()) {
      newErrors.referencia = 'Ingrese el codigo de referencia o numero de operacion.';
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
      const montoFinal = canjearVisitaGratis ? 0 : Math.max(0, montoServicios - adelantoNum);
      const payload: Record<string, unknown> = {
        cita_id: cita.id,
        paciente_id: cita.paciente_id,
        monto_total: montoFinal,
        metodo_pago: metodoPago,
        estado: 'Pagado',
        fecha_pago: new Date().toISOString(),
        visita_gratis: canjearVisitaGratis,
        sucursal_id: sucursalActiva?.id,
        pack_id: selectedPack?.id || null,
      };
      if (codigoReferencia.trim()) {
        payload.codigo_referencia = codigoReferencia.trim();
      }

      const { data: pagoInserted, error } = await supabase.from('pagos').insert([payload]).select('id').single();

      if (error) throw error;
      const pagoId = pagoInserted?.id;

      // Gestion unificada de packs: creditos + log para TODOS los tipos
      if (selectedPack) {
        const { data: existingLog } = await supabase
          .from('pack_sesiones_log')
          .select('id')
          .eq('cita_id', cita.id)
          .maybeSingle();
        const sesionYaConsumida = !!existingLog;

        const totalSesiones = selectedPack.total_sesiones || 1;
        let creditoId: string | null = null;
        let sesionNumero = 1;

        if (selectedPack.tipo === 'pack_sesiones_prepago' && creditoActivo) {
          if (sesionYaConsumida) {
            creditoId = creditoActivo.id;
          } else {
            creditoId = creditoActivo.id;
            sesionNumero = creditoActivo.sesiones_usadas + 1;
            await supabase.from('pack_creditos').update({
              sesiones_usadas: sesionNumero,
              estado: sesionNumero >= creditoActivo.sesiones_total ? 'completado' : 'activo',
            }).eq('id', creditoActivo.id);
          }

        } else if (selectedPack.tipo === 'pack_sesiones_fraccionado') {
          const { data: creditoExistente } = await supabase
            .from('pack_creditos')
            .select('id, sesiones_usadas, sesiones_total')
            .eq('pack_id', selectedPack.id)
            .eq('paciente_id', cita.paciente_id)
            .eq('estado', 'activo')
            .maybeSingle();

          if (creditoExistente) {
            creditoId = creditoExistente.id;
            sesionNumero = creditoExistente.sesiones_usadas + 1;
            await supabase.from('pack_creditos').update({
              sesiones_usadas: sesionNumero,
              estado: sesionNumero >= creditoExistente.sesiones_total ? 'completado' : 'activo',
            }).eq('id', creditoExistente.id);
          } else {
            const { data: newCredito } = await supabase.from('pack_creditos').insert([{
              pack_id: selectedPack.id,
              paciente_id: cita.paciente_id,
              sesiones_total: totalSesiones,
              sesiones_usadas: 1,
              pago_id: pagoId || null,
              sucursal_id: sucursalActiva?.id,
            }]).select('id').single();
            creditoId = newCredito?.id || null;
          }

        } else {
          const { data: newCredito } = await supabase.from('pack_creditos').insert([{
            pack_id: selectedPack.id,
            paciente_id: cita.paciente_id,
            sesiones_total: totalSesiones,
            sesiones_usadas: 1,
            pago_id: pagoId || null,
            sucursal_id: sucursalActiva?.id,
            estado: totalSesiones <= 1 ? 'completado' : 'activo',
          }]).select('id').single();
          creditoId = newCredito?.id || null;
        }

        if (creditoId && !sesionYaConsumida) {
          await supabase.from('pack_sesiones_log').insert([{
            credito_id: creditoId,
            sesion_numero: sesionNumero,
            cita_id: cita.id,
            pago_id: pagoId || null,
            monto_pagado: montoFinal,
          }]);
        }
      }

      if (selectedPack?.stock_total) {
        await supabase
          .from('packs_promociones')
          .update({ stock_usado: (selectedPack.stock_usado || 0) + 1 })
          .eq('id', selectedPack.id);
      }

      if (cart.items.length > 0) {
        const totalProds = cart.items.reduce((sum, i) => sum + i.subtotal, 0);
        await supabase.from('ventas').insert([{
          paciente_id: cita.paciente_id,
          sucursal_id: sucursalActiva?.id,
          items: cart.items.map(i => ({
            producto_id: i.producto_id,
            nombre: i.nombre,
            precio_unitario: i.precio_unitario,
            cantidad: i.cantidad,
            subtotal: i.subtotal,
          })),
          subtotal: totalProds,
          descuento: 0,
          total: totalProds,
          metodo_pago: metodoPago,
          estado: 'Completada',
          notas: `Venta desde cobro de cita`,
        }]);
        for (const item of cart.items) {
          const { data: prod } = await supabase.from('productos').select('stock').eq('id', item.producto_id).single();
          if (prod) {
            await supabase.from('productos').update({ stock: Math.max(0, prod.stock - item.cantidad) }).eq('id', item.producto_id);
          }
        }
      }

      if (canjearVisitaGratis) {
        await supabase.from('pacientes').update({
          sellos: 0,
          sellos_canjeados: pacienteSellosCanjeados + 1,
        }).eq('id', cita.paciente_id);
      } else {
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
    <div className="fixed inset-0 z-[9999] !m-0">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="absolute right-0 inset-y-0 w-full md:w-[500px] lg:max-w-lg bg-white shadow-2xl z-[10000] transform transition-transform duration-300 flex flex-col animate-in slide-in-from-right">
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
                      Esta atencion no se cobrara
                    </p>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors ${canjearVisitaGratis ? 'bg-white/30' : 'bg-gray-200'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform mt-0.5 ${canjearVisitaGratis ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                </div>
              </button>
            )}

            {/* Packs / Offers */}
            <PackSection
              packsDisponibles={packsDisponibles}
              selectedPack={selectedPack}
              creditoActivo={creditoActivo}
              citaPackId={cita.pack_id}
              onSelectPack={setSelectedPack}
              onMontoManualReset={() => setMontoManual(false)}
            />

            {/* Services */}
            <ServicesCheckList
              servicios={servicios}
              selectedServicios={selectedServicios}
              heredadoDeMedico={heredadoDeMedico}
              selectedPack={selectedPack}
              onToggleServicio={toggleServicio}
            />

            {/* Products */}
            <ProductCart
              productoRef={cart.productoRef}
              productosRecetados={productosRecetados}
              productoSearch={cart.productoSearch}
              setProductoSearch={cart.setProductoSearch}
              productoResults={cart.productoResults}
              showProductoResults={cart.showProductoResults}
              setShowProductoResults={cart.setShowProductoResults}
              items={cart.items}
              stockMap={cart.stockMap}
              onAddItem={handleAddItem}
              onUpdateQty={handleUpdateQty}
              onRemoveItem={handleRemoveItem}
            />

            {/* Monto Total */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-[#004975]">
                  Monto Total <span className="text-red-500">*</span>
                </label>
                {(selectedServicios.size > 0 || cart.items.length > 0) && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {montoManual ? '✏️ Editado manualmente' : `${selectedServicios.size} servicio(s)${cart.items.length > 0 ? ` + ${cart.items.reduce((s,i)=>s+i.cantidad,0)} producto(s)` : ''}`}
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

            {/* Payment Method */}
            <PaymentMethodPicker
              value={metodoPago}
              onChange={setMetodoPago}
              referencia={codigoReferencia}
              onReferenciaChange={setCodigoReferencia}
              error={errors.metodo}
              referenciaError={errors.referencia}
            />

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-gray-100 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
          <PaymentSummary
            montoTotal={montoTotal}
            montoManual={montoManual}
            canjearVisitaGratis={canjearVisitaGratis}
            adelanto={cita?.adelanto}
            adelantoMetodoPago={cita?.adelanto_metodo_pago}
            servicios={servicios}
            selectedServicios={selectedServicios}
            selectedPack={selectedPack}
            creditoActivo={creditoActivo}
            items={cart.items}
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-bold shadow-sm text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="cobro-form"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#00C288] disabled:opacity-70 disabled:cursor-not-allowed text-white font-black rounded-xl hover:bg-[#00ab78] transition-all shadow-md flex items-center justify-center gap-2 text-sm"
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
