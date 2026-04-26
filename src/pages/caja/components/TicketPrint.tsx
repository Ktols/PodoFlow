import { useRef, useState } from 'react';
import { X, Printer, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { toast } from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import { useBranchStore } from '../../../stores/branchStore';

interface ServicioTicket {
  nombre: string;
  precio: number;
}

interface TicketData {
  numeroTicket?: number;
  pacienteNombre: string;
  pacienteDocumento?: string | null;
  pacienteTelefono?: string | null;
  fechaPago: string;
  servicios: ServicioTicket[];
  montoTotal: number;
  metodoPago: string;
  codigoReferencia?: string;
  especialista?: string;
}

interface TicketPrintProps {
  isOpen: boolean;
  onClose: () => void;
  data: TicketData | null;
}

const getReferenciaLabel = (metodo: string): string => {
  switch (metodo) {
    case 'Tarjeta': return 'Código AP / Voucher';
    case 'Yape':
    case 'Plin':
    case 'Transferencia': return 'N° de Operación';
    default: return 'N° Recibo';
  }
};

const getMetodoIcon = (metodo: string): string => {
  switch (metodo) {
    case 'Efectivo': return '💵';
    case 'Tarjeta': return '💳';
    case 'Yape': return '📱';
    case 'Plin': return '📱';
    case 'Transferencia': return '🏦';
    default: return '💰';
  }
};

export function TicketPrint({ isOpen, onClose, data }: TicketPrintProps) {
  const { sucursalActiva } = useBranchStore();
  const nombreEmpresa = sucursalActiva?.nombre_comercial || 'G&C Podología';
  const comprobanteRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { sucursalActiva } = useBranchStore();
  const nombreEmpresa = sucursalActiva?.nombre_comercial || 'G&C Podología';

  const tempFolio = data?.numeroTicket
    ? 'TKT-' + String(data.numeroTicket).padStart(6, '0')
    : 'XXXXXX';

  const handlePrint = useReactToPrint({
    contentRef: comprobanteRef,
    documentTitle: `Comprobante_${tempFolio}`,
  });

  if (!isOpen || !data) return null;

  const folio = data.numeroTicket
    ? 'TKT-' + String(data.numeroTicket).padStart(6, '0')
    : 'TKT-XXXXXX';

  const fechaFormateada = (() => {
    try {
      return format(new Date(data.fechaPago), "dd 'de' MMMM, yyyy", { locale: es });
    } catch {
      return data.fechaPago;
    }
  })();

  const horaFormateada = (() => {
    try {
      return format(new Date(data.fechaPago), 'hh:mm a', { locale: es });
    } catch {
      return '';
    }
  })();

  const subtotal = data.servicios.reduce((s, srv) => s + srv.precio, 0);

  const handleShareWhatsApp = async () => {
    if (!comprobanteRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(comprobanteRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );

      if (!blob) {
        toast.error('Error al generar la imagen');
        setIsGenerating(false);
        return;
      }

      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        toast.success(
          '¡Comprobante copiado! Redirigiendo a WhatsApp... Presiona Ctrl+V en el chat.',
          { duration: 6000, icon: '📋' }
        );
      } catch (copyErr) {
        console.error('Error al copiar al portapapeles:', copyErr);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `Comprobante_${folio}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(
          'Imagen descargada. Adjunte el archivo en el chat de WhatsApp.',
          { duration: 5000, icon: '📥' }
        );
      }

      const telefono = data.pacienteTelefono?.replace(/\D/g, '') || '';
      const mensaje = encodeURIComponent(
        `Hola, adjunto tu comprobante de atención en ${nombreEmpresa}. Folio: ${folio}`
      );

      setTimeout(() => {
        if (telefono) {
          const telefonoFull = telefono.startsWith('51') ? telefono : `51${telefono}`;
          window.open(
            `https://api.whatsapp.com/send?phone=${telefonoFull}&text=${mensaje}`,
            '_blank'
          );
        } else {
          window.open(
            `https://api.whatsapp.com/send?text=${mensaje}`,
            '_blank'
          );
        }
      }, 1500);

    } catch (err) {
      console.error('Error generando imagen:', err);
      toast.error('Error al generar la imagen del comprobante');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="fixed inset-0 z-[99999] print:static print:block">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm print:hidden" onClick={onClose} />

        <div className="absolute right-0 top-0 h-full w-full md:w-[680px] bg-gray-100 shadow-2xl z-[100000] flex flex-col animate-in slide-in-from-right print:static print:w-full print:h-auto print:shadow-none print:bg-white print:block">
          <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 print:hidden">
            <h2 className="text-lg font-black text-[#004975]">Comprobante de Pago</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible">
            <div
              ref={comprobanteRef}
              className="bg-white rounded-lg shadow-lg mx-auto print:shadow-none print:rounded-none print:max-w-none print:w-full"
              style={{ maxWidth: '600px', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
            >
              <div className="flex items-start justify-between p-8 pb-5 border-b-2 border-[#004975]">
                <div>
                  <h1 className="text-2xl font-black text-[#004975] tracking-tight">{nombreEmpresa}</h1>
                  <p className="text-[10px] font-bold text-[#004975]/50 uppercase tracking-[0.2em] mt-0.5">{sucursalActiva?.razon_social || 'Centro Podológico Especializado'}</p>
                  <div className="mt-3 space-y-0.5">
                    <p className="text-[10px] text-gray-400 font-medium">{sucursalActiva?.direccion || ''}</p>
                    <p className="text-[10px] text-gray-400 font-medium">Tel: {sucursalActiva?.telefono || ''}</p>
                  </div>
                </div>
                <div className="text-right bg-[#004975]/5 rounded-lg px-5 py-3 border border-[#004975]/10">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]">Comprobante N°</p>
                  <p className="text-lg font-black text-[#004975] tabular-nums tracking-wider mt-0.5">{folio}</p>
                  <div className="mt-2 pt-2 border-t border-[#004975]/10 space-y-0.5">
                    <p className="text-[10px] font-bold text-gray-500">{fechaFormateada}</p>
                    {horaFormateada && <p className="text-[10px] font-bold text-gray-400">{horaFormateada}</p>}
                  </div>
                </div>
              </div>

              <div className="px-8 py-5 bg-gray-50/50 border-b border-gray-100">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1">Paciente</p>
                    <p className="text-sm font-black text-[#004975]">{data.pacienteNombre}</p>
                    {data.pacienteDocumento && (
                      <p className="text-xs font-medium text-gray-500 mt-0.5">DNI: {data.pacienteDocumento}</p>
                    )}
                    {data.pacienteTelefono && (
                      <p className="text-xs font-medium text-gray-500 mt-0.5">Tel: {data.pacienteTelefono}</p>
                    )}
                  </div>
                  {data.especialista && (
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1">Atendido por</p>
                      <p className="text-sm font-bold text-gray-700">{data.especialista}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-8 py-5">
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]" style={{ width: '10%' }}>N°</th>
                      <th className="text-left py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">Servicio</th>
                      <th className="text-center py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]" style={{ width: '12%' }}>Cant.</th>
                      <th className="text-right py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]" style={{ width: '22%' }}>P. Unit.</th>
                      <th className="text-right py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]" style={{ width: '22%' }}>Total (S/)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.servicios.map((srv, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-2.5 text-xs font-bold text-gray-400 tabular-nums">{String(idx + 1).padStart(2, '0')}</td>
                        <td className="py-2.5 text-xs font-bold text-gray-700">{srv.nombre}</td>
                        <td className="py-2.5 text-xs font-bold text-gray-500 text-center tabular-nums">1</td>
                        <td className="py-2.5 text-xs font-bold text-gray-500 text-right tabular-nums">S/ {srv.precio.toFixed(2)}</td>
                        <td className="py-2.5 text-xs font-black text-[#004975] text-right tabular-nums">S/ {srv.precio.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end mt-4">
                  <div className="w-60">
                    <div className="flex justify-between py-1.5 text-xs">
                      <span className="font-bold text-gray-500">Subtotal</span>
                      <span className="font-bold text-gray-600 tabular-nums">S/ {subtotal.toFixed(2)}</span>
                    </div>
                    {data.montoTotal !== subtotal && (
                      <div className="flex justify-between py-1.5 text-xs">
                        <span className="font-bold text-gray-500">Ajuste</span>
                        <span className="font-bold text-gray-600 tabular-nums">
                          S/ {(data.montoTotal - subtotal).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-3 mt-1 border-t-2 border-[#004975]">
                      <span className="text-sm font-black text-[#004975] uppercase tracking-wider">Total Pagado</span>
                      <span className="text-lg font-black text-[#00C288] tabular-nums">S/ {data.montoTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mx-8 px-5 py-4 bg-[#004975]/5 rounded-lg border border-[#004975]/10 mb-5">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2">Detalle de Transacción</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Método:</span>
                    <span className="text-xs font-black text-[#004975]">{getMetodoIcon(data.metodoPago)} {data.metodoPago}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Estado:</span>
                    <span className="text-xs font-black text-[#00C288]">✓ Pagado</span>
                  </div>
                  {data.codigoReferencia && (
                    <div className="flex items-center gap-2 col-span-2">
                      <span className="text-xs text-gray-500 font-medium">{getReferenciaLabel(data.metodoPago)}:</span>
                      <span className="text-xs font-black text-[#004975] tabular-nums">{data.codigoReferencia}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-8 py-4 border-t border-gray-200 bg-gray-50/80 rounded-b-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400">{nombreEmpresa}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{sucursalActiva?.direccion || ''} · Tel: {sucursalActiva?.telefono || ''}</p>
                  </div>
                  <p className="text-xs font-black text-[#00C288]">¡Gracias por su preferencia!</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-between gap-3 print:hidden">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-bold shadow-sm"
            >
              Cerrar
            </button>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleShareWhatsApp}
                disabled={isGenerating}
                className="px-5 py-2.5 bg-[#25D366] disabled:opacity-60 text-white font-black rounded-xl hover:bg-[#1da851] transition-all shadow-md inline-flex items-center gap-2 text-sm"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Compartir
                  </>
                )}
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2.5 bg-[#004975] text-white font-black rounded-xl hover:bg-[#003a5e] transition-all shadow-md inline-flex items-center gap-2 text-sm"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
