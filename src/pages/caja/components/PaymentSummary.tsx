import type { Pack, PackCredito, VentaItem } from '../../../types/entities';

interface ServicioActivo {
  id: string;
  nombre: string;
  precio_base: number;
}

interface PaymentSummaryProps {
  montoTotal: string;
  montoManual: boolean;
  canjearVisitaGratis: boolean;
  adelanto: number | undefined;
  adelantoMetodoPago: string | null | undefined;
  servicios: ServicioActivo[];
  selectedServicios: Set<string>;
  selectedPack: Pack | null;
  creditoActivo: PackCredito | null;
  items: VentaItem[];
}

export function PaymentSummary({
  montoTotal,
  montoManual,
  canjearVisitaGratis,
  adelanto,
  adelantoMetodoPago,
  servicios,
  selectedServicios,
  selectedPack,
  creditoActivo,
  items,
}: PaymentSummaryProps) {
  if (!montoTotal || parseFloat(montoTotal) <= 0) return null;

  const montoNum = parseFloat(montoTotal);
  const adelantoNum = adelanto ? Number(adelanto) : 0;
  const totalFinal = canjearVisitaGratis ? 0 : Math.max(0, montoNum - adelantoNum);

  const packCoveredIds = new Set(
    selectedPack
      ? (selectedPack.pack_items || []).filter(i => i.servicio_id).map(i => i.servicio_id)
      : []
  );
  const extraServicios = servicios.filter(s => selectedServicios.has(s.id) && !packCoveredIds.has(s.id));
  const coveredServicios = servicios.filter(s => selectedServicios.has(s.id) && packCoveredIds.has(s.id));
  const totalExtras = extraServicios.reduce((sum, s) => sum + s.precio_base, 0);
  const totalProds = items.reduce((sum, i) => sum + i.subtotal, 0);

  return (
    <div className="mb-4 p-3 bg-[#00C288]/5 rounded-xl border border-[#00C288]/10 space-y-1.5">
      {coveredServicios.length > 0 && selectedPack && (() => {
        const isFrac = selectedPack.tipo === 'pack_sesiones_fraccionado' && selectedPack.precio_pack && selectedPack.total_sesiones;
        const precioMostrar = selectedPack.tipo === 'pack_sesiones_prepago' && creditoActivo
          ? 0
          : isFrac
            ? selectedPack.precio_pack! / selectedPack.total_sesiones!
            : (selectedPack.precio_pack || 0);
        return (
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-500">
              {selectedPack.nombre} ({coveredServicios.length} srv)
              {isFrac && <span className="text-[9px] text-gray-400 ml-1 normal-case">1 sesion</span>}
            </span>
            <span className="text-sm font-bold text-purple-500 tabular-nums">
              S/ {precioMostrar.toFixed(2)}
            </span>
          </div>
        );
      })()}
      {totalExtras > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-400">Servicios extra ({extraServicios.length})</span>
          <span className="text-sm font-bold text-gray-600 tabular-nums">S/ {totalExtras.toFixed(2)}</span>
        </div>
      )}
      {totalProds > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-purple-500">Productos ({items.reduce((s,i)=>s+i.cantidad,0)})</span>
          <span className="text-sm font-bold text-purple-600 tabular-nums">S/ {totalProds.toFixed(2)}</span>
        </div>
      )}
      {montoManual && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-400">Monto total</span>
          <span className="text-sm font-bold text-gray-600 tabular-nums">S/ {montoNum.toFixed(2)}</span>
        </div>
      )}
      {canjearVisitaGratis && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#00C288]">🎁 Visita gratis (sellos canjeados)</span>
          <span className="text-sm font-bold text-[#00C288] tabular-nums">- S/ {montoNum.toFixed(2)}</span>
        </div>
      )}
      {!canjearVisitaGratis && adelantoNum > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#00C288]">Adelanto pagado ({adelantoMetodoPago})</span>
          <span className="text-sm font-bold text-[#00C288] tabular-nums">- S/ {adelantoNum.toFixed(2)}</span>
        </div>
      )}
      <div className="flex items-center justify-between pt-1.5 border-t border-[#00C288]/10">
        <span className="text-sm font-black text-[#004975]">Total a cobrar:</span>
        <span className="text-xl font-black text-[#00C288] tabular-nums">S/ {totalFinal.toFixed(2)}</span>
      </div>
    </div>
  );
}
