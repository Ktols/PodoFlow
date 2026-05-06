import { CheckCircle2, Package, Repeat } from 'lucide-react';
import type { Pack, PackCredito } from '../../../types/entities';

interface PackSectionProps {
  packsDisponibles: Pack[];
  selectedPack: Pack | null;
  creditoActivo: PackCredito | null;
  citaPackId: string | null | undefined;
  onSelectPack: (pack: Pack | null) => void;
  onMontoManualReset: () => void;
}

export function PackSection({
  packsDisponibles,
  selectedPack,
  creditoActivo,
  citaPackId,
  onSelectPack,
  onMontoManualReset,
}: PackSectionProps) {
  if (packsDisponibles.length === 0 && !creditoActivo) return null;

  const citaHasPack = !!citaPackId && !!selectedPack;

  return (
    <div>
      <label className="block text-sm font-bold text-[#004975] mb-3">
        {citaHasPack ? 'Pack Asignado' : 'Ofertas Disponibles'}
      </label>

      {/* Pack fijo de la cita (no editable) */}
      {citaHasPack && selectedPack && (() => {
        const isPrepagoCubierto = selectedPack.tipo === 'pack_sesiones_prepago' && creditoActivo;
        const isFraccionado = selectedPack.tipo === 'pack_sesiones_fraccionado' && selectedPack.precio_pack && selectedPack.total_sesiones;
        const precioPorSesion = isFraccionado ? selectedPack.precio_pack! / selectedPack.total_sesiones! : null;

        return (
          <div className={`w-full p-4 rounded-xl border-2 ${
            isPrepagoCubierto
              ? 'border-purple-300 bg-purple-50'
              : 'border-[#00C288] bg-[#00C288]/10'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className={`w-5 h-5 ${isPrepagoCubierto ? 'text-purple-500' : 'text-[#00C288]'}`} />
                <div>
                  <p className="text-sm font-black text-[#004975]">{selectedPack.nombre}</p>
                  <p className={`text-[10px] font-bold ${isPrepagoCubierto ? 'text-purple-500' : 'text-[#00C288]'}`}>
                    {isPrepagoCubierto
                      ? `Sesion cubierta (${creditoActivo!.sesiones_usadas}/${creditoActivo!.sesiones_total} usadas)`
                      : isFraccionado
                        ? `Fraccionado · ${selectedPack.total_sesiones} sesiones`
                        : 'Asignado a esta cita'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-black tabular-nums block ${isPrepagoCubierto ? 'text-purple-500' : 'text-[#00C288]'}`}>
                  {isPrepagoCubierto
                    ? 'S/ 0.00'
                    : isFraccionado
                      ? `S/ ${precioPorSesion!.toFixed(2)}`
                      : selectedPack.precio_pack ? `S/ ${selectedPack.precio_pack.toFixed(2)}` : ''}
                </span>
                {isFraccionado && (
                  <span className="text-[9px] font-bold text-gray-400">Pack total: S/ {selectedPack.precio_pack!.toFixed(2)}</span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Credito de sesiones activo (siempre visible, independiente de la cita) */}
      {!citaHasPack && creditoActivo && (() => {
        const packCredito = packsDisponibles.find(p => p.id === creditoActivo.pack_id);
        const isUsing = selectedPack?.tipo === 'pack_sesiones_prepago' && selectedPack?.id === creditoActivo.pack_id;
        return (
          <button
            type="button"
            onClick={() => {
              if (isUsing) { onSelectPack(null); }
              else { onSelectPack(packCredito || { id: creditoActivo.pack_id, tipo: 'pack_sesiones_prepago', nombre: 'Pack Sesiones', precio_pack: 0 } as Pack); }
              onMontoManualReset();
            }}
            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between mb-2 ${
              isUsing
                ? 'bg-purple-500 border-purple-500 text-white shadow-lg shadow-purple-500/30'
                : 'bg-purple-50 border-purple-200 text-[#004975] hover:border-purple-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Repeat className={`w-5 h-5 ${isUsing ? 'text-white' : 'text-purple-500'}`} />
              <div className="text-left">
                <p className="font-black text-sm">{isUsing ? '✓ Usando credito' : 'Usar credito de sesion'}</p>
                <p className={`text-[11px] font-bold ${isUsing ? 'text-white/80' : 'text-purple-500'}`}>
                  {creditoActivo.sesiones_total - creditoActivo.sesiones_usadas} sesiones restantes de {creditoActivo.sesiones_total}
                </p>
              </div>
            </div>
          </button>
        );
      })()}

      {/* Packs y promos seleccionables (solo si la cita NO tiene pack) */}
      {!citaHasPack && (
        <div className="space-y-2">
          {packsDisponibles.filter(p => p.tipo !== 'pack_sesiones_prepago' || !creditoActivo || creditoActivo.pack_id !== p.id).map(pack => {
            const isSelected = selectedPack?.id === pack.id;
            const label = pack.tipo === 'pack_servicios' ? `S/ ${pack.precio_pack?.toFixed(2)}`
              : pack.tipo === 'pack_sesiones_fraccionado' && pack.precio_pack && pack.total_sesiones ? `S/ ${(pack.precio_pack / pack.total_sesiones).toFixed(2)}/sesion`
              : pack.precio_pack ? `S/ ${pack.precio_pack.toFixed(2)}` : '';
            const TypeIcon = pack.tipo.startsWith('pack_sesiones') ? Repeat : Package;

            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => {
                  onSelectPack(isSelected ? null : pack);
                  onMontoManualReset();
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                  isSelected
                    ? 'bg-[#00C288]/10 border-[#00C288] shadow-sm'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-[#00C288] border-[#00C288]' : 'border-gray-300'}`}>
                    {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <span className={`text-xs font-bold block ${isSelected ? 'text-[#004975]' : 'text-gray-600'}`}>{pack.nombre}</span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <TypeIcon className="w-3 h-3" />
                      {pack.tipo === 'pack_servicios' ? 'Pack' : 'Sesiones'}
                    </span>
                  </div>
                </div>
                <span className={`text-sm font-black tabular-nums ${isSelected ? 'text-[#00C288]' : 'text-gray-400'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
