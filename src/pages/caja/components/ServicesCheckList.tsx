import { CheckCircle2 } from 'lucide-react';
import type { Pack } from '../../../types/entities';

interface ServicioActivo {
  id: string;
  nombre: string;
  precio_base: number;
}

interface ServicesCheckListProps {
  servicios: ServicioActivo[];
  selectedServicios: Set<string>;
  heredadoDeMedico: boolean;
  selectedPack: Pack | null;
  onToggleServicio: (id: string) => void;
}

export function ServicesCheckList({
  servicios,
  selectedServicios,
  heredadoDeMedico,
  selectedPack,
  onToggleServicio,
}: ServicesCheckListProps) {
  // Servicios incluidos en el pack seleccionado (cualquier tipo)
  const packServiceIds = new Set(
    selectedPack
      ? (selectedPack.pack_items || []).filter(i => i.servicio_id).map(i => i.servicio_id)
      : []
  );

  return (
    <div>
      <label className="block text-sm font-bold text-[#004975] mb-3">
        Servicios Realizados
      </label>
      {heredadoDeMedico && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2.5 animate-in fade-in duration-300">
          <span className="text-lg">🩺</span>
          <p className="text-xs font-bold text-blue-700">
            Pre-cargado desde la atencion medica. Puede ajustar manualmente si es necesario.
          </p>
        </div>
      )}
      {servicios.length === 0 ? (
        <p className="text-sm font-bold text-gray-400 bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
          No hay servicios activos. Cree uno desde la pestana "Lista de Precios".
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
            const isCoveredByPack = packServiceIds.has(servicio.id);
            return (
              <button
                key={servicio.id}
                type="button"
                onClick={() => !isCoveredByPack && onToggleServicio(servicio.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                  isCoveredByPack
                    ? 'bg-purple-50 border-purple-200 cursor-default'
                    : isSelected
                      ? 'bg-[#00C288]/5 border-[#00C288]/30 shadow-sm'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      isCoveredByPack
                        ? 'bg-purple-500 border-purple-500'
                        : isSelected
                          ? 'bg-[#00C288] border-[#00C288]'
                          : 'border-gray-300 bg-white'
                    }`}
                  >
                  {(isSelected || isCoveredByPack) && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <span className={`text-sm font-bold ${isCoveredByPack ? 'text-purple-700' : isSelected ? 'text-[#004975]' : 'text-gray-600'}`}>
                  {servicio.nombre}
                  {isCoveredByPack && <span className="ml-1.5 text-[9px] font-bold text-purple-500 bg-purple-100 px-1.5 py-0.5 rounded normal-case">Pack</span>}
                </span>
              </div>
              <span className={`text-sm font-black tabular-nums ${isCoveredByPack ? 'text-purple-400 line-through' : isSelected ? 'text-[#00C288]' : 'text-gray-400'}`}>
                S/ {servicio.precio_base.toFixed(2)}
              </span>
            </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
