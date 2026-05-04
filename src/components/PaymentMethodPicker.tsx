import { CreditCard, Hash } from 'lucide-react';
import { METODOS_PAGO } from '../constants';

function getReferenciaLabel(metodo: string): { label: string; placeholder: string; required: boolean } {
  switch (metodo) {
    case 'Tarjeta':
      return { label: 'Código AP / N° de Voucher', placeholder: 'Ej: 123456', required: true };
    case 'Yape':
    case 'Plin':
    case 'Transferencia':
      return { label: 'Número de Operación', placeholder: 'Ej: OP-789012', required: true };
    case 'Efectivo':
    default:
      return { label: 'N° de Recibo interno (Opcional)', placeholder: 'Ej: REC-001', required: false };
  }
}

interface PaymentMethodPickerProps {
  value: string;
  onChange: (metodo: string) => void;
  referencia?: string;
  onReferenciaChange?: (ref: string) => void;
  error?: string;
  referenciaError?: string;
  compact?: boolean;
}

export function PaymentMethodPicker({
  value,
  onChange,
  referencia = '',
  onReferenciaChange,
  error,
  referenciaError,
  compact = false,
}: PaymentMethodPickerProps) {
  const ref = getReferenciaLabel(value);

  return (
    <div className="space-y-3">
      <div>
        {!compact && (
          <label className="block text-sm font-bold text-[#004975] mb-3">
            Método de Pago <span className="text-red-500">*</span>
          </label>
        )}
        {compact && (
          <label className="block text-xs font-bold text-gray-500 mb-2">Método de Pago</label>
        )}
        <div className="grid grid-cols-2 gap-2">
          {METODOS_PAGO.map(metodo => (
            <button
              key={metodo.value}
              type="button"
              onClick={() => onChange(metodo.value)}
              className={`${compact ? 'p-2.5 text-xs' : 'p-3.5 text-sm'} rounded-xl border font-bold transition-all text-left flex items-center gap-2 ${
                value === metodo.value
                  ? 'bg-[#004975] text-white border-[#004975] shadow-md shadow-[#004975]/20'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
              }`}
            >
              <CreditCard className={`w-3.5 h-3.5 shrink-0 ${value === metodo.value ? 'text-white' : 'text-gray-400'}`} />
              {metodo.label}
            </button>
          ))}
        </div>
        {error && (
          <p className="text-red-500 text-xs mt-2 font-bold px-1">{error}</p>
        )}
      </div>

      {value && onReferenciaChange && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <label className={`block font-bold text-[#004975] mb-1.5 ${compact ? 'text-xs' : 'text-sm'}`}>
            {ref.label} {ref.required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Hash className={`w-3.5 h-3.5 ${referenciaError ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
            <input
              type="text"
              placeholder={ref.placeholder}
              className={`w-full pl-9 pr-3 bg-gray-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-[#00C288] transition-all shadow-sm font-bold ${compact ? 'py-2.5 text-xs' : 'py-3 text-sm'} ${
                referenciaError ? 'border-red-500 border' : 'border border-gray-200'
              }`}
              value={referencia}
              onChange={(e) => onReferenciaChange(e.target.value)}
            />
          </div>
          {referenciaError && (
            <p className="text-red-500 text-xs mt-1 font-bold px-1">{referenciaError}</p>
          )}
        </div>
      )}
    </div>
  );
}
