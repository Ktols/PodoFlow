import { Stamp, Gift } from 'lucide-react';
import { SELLOS_PARA_GRATIS } from '../config/clinicData';

interface StampCardProps {
  sellos: number;
  sellosCanjeados?: number;
  compact?: boolean;
}

/**
 * Visual loyalty stamp card. Shows SELLOS_PARA_GRATIS stamps + 1 final "free visit" slot.
 * When sellos >= SELLOS_PARA_GRATIS the next visit can be redeemed as free.
 */
export function StampCard({ sellos, sellosCanjeados = 0, compact = false }: StampCardProps) {
  const filled = Math.min(sellos, SELLOS_PARA_GRATIS);
  const ready = sellos >= SELLOS_PARA_GRATIS;
  const slots = SELLOS_PARA_GRATIS;

  return (
    <div className={`rounded-2xl border ${ready ? 'bg-gradient-to-br from-[#00C288]/10 to-[#00C288]/5 border-[#00C288]/30' : 'bg-gray-50 border-gray-200'} ${compact ? 'p-3' : 'p-4 md:p-5'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ready ? 'bg-[#00C288] text-white' : 'bg-white border border-gray-200 text-[#00C288]'}`}>
            {ready ? <Gift className="w-4 h-4" /> : <Stamp className="w-4 h-4" />}
          </div>
          <div>
            <p className={`font-black text-sm ${ready ? 'text-[#00C288]' : 'text-[#004975]'}`}>
              {ready ? '¡Próxima visita gratis!' : 'Programa de Fidelidad'}
            </p>
            {!compact && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {ready ? `Listo para canjear` : `${filled} de ${slots} visitas`}
              </p>
            )}
          </div>
        </div>
        {sellosCanjeados > 0 && (
          <span className="text-[10px] font-black text-[#00C288] uppercase tracking-wider bg-[#00C288]/10 px-2 py-1 rounded-md">
            🎁 {sellosCanjeados} canjeado{sellosCanjeados !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Stamps grid */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {Array.from({ length: slots }, (_, i) => {
          const isFilled = i < filled;
          return (
            <div
              key={i}
              className={`flex items-center justify-center transition-all ${compact ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'} rounded-full border-2 font-black ${
                isFilled
                  ? 'bg-[#00C288] border-[#00C288] text-white shadow-md shadow-[#00C288]/30'
                  : 'bg-white border-dashed border-gray-300 text-gray-300'
              }`}
            >
              {isFilled ? '✓' : i + 1}
            </div>
          );
        })}
        <span className={`mx-1 font-black ${ready ? 'text-[#00C288]' : 'text-gray-300'}`}>→</span>
        <div
          className={`flex items-center justify-center ${compact ? 'w-7 h-7' : 'w-9 h-9'} rounded-full border-2 transition-all ${
            ready
              ? 'bg-gradient-to-br from-[#00C288] to-[#00ab78] border-[#00C288] text-white shadow-lg shadow-[#00C288]/40 animate-pulse'
              : 'bg-white border-dashed border-gray-300 text-gray-300'
          }`}
        >
          <Gift className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </div>
      </div>
    </div>
  );
}
