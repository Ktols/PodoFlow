import { useState, useEffect } from 'react';
import { Clock, User, Stethoscope, CheckCircle2, Receipt, Calendar, Printer } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CobroDrawer } from './CobroDrawer';
import { TicketPrint } from './TicketPrint';
import { useBranchStore } from '../../../stores/branchStore';

interface CitaCaja {
  id: string;
  paciente_id: string;
  podologo_id: string;
  fecha_cita: string;
  hora_cita: string;
  motivo: string;
  estado: string;
  pacientes: {
    nombres: string;
    apellidos: string;
    numero_documento: string | null;
    telefono?: string | null;
  };
  podologos: {
    nombres: string;
    color_etiqueta: string;
  };
}

interface PagoRegistrado {
  id: string;
  cita_id: string;
  monto_total: number;
  metodo_pago: string;
  estado: string;
  codigo_referencia?: string;
  fecha_pago?: string;
  numero_ticket?: number;
}

export function CobrosPendientesTab() {
  const [citas, setCitas] = useState<CitaCaja[]>([]);
  const [pagos, setPagos] = useState<PagoRegistrado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaCaja | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { sucursalActiva } = useBranchStore();

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch citas de hoy, excluyendo Cancelada y No Asistió
    let citasQuery = supabase
      .from('citas')
      .select(`
        id,
        paciente_id,
        podologo_id,
        fecha_cita,
        hora_cita,
        motivo,
        estado,
        pacientes (
          nombres,
          apellidos,
          numero_documento,
          telefono
        ),
        podologos (
          nombres,
          color_etiqueta
        )
      `)
      .eq('fecha_cita', todayStr)
      .not('estado', 'in', '("Cancelada","No Asistió")')
      .order('hora_cita', { ascending: true });

    if (sucursalActiva?.id) {
      citasQuery = citasQuery.eq('sucursal_id', sucursalActiva.id);
    }

    const { data: citasData, error: citasError } = await citasQuery;
    if (citasError) {
      toast.error('Error cargando citas del día');
      console.error(citasError);
    } else {
      setCitas((citasData as unknown as CitaCaja[]) || []);
    }

    // Fetch pagos asociados a citas de hoy
    const { data: pagosData, error: pagosError } = await supabase
      .from('pagos')
      .select('id, cita_id, monto_total, metodo_pago, estado, codigo_referencia, fecha_pago, numero_ticket');

    if (pagosError) {
      console.error('Error cargando pagos:', pagosError);
    } else {
      setPagos((pagosData as PagoRegistrado[]) || []);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [sucursalActiva?.id]);

  const getPagoByCitaId = (citaId: string) => {
    return pagos.find(p => p.cita_id === citaId);
  };

  const formatearHora = (horaFull: string) => {
    if (!horaFull) return '';
    const [hourStr, minStr] = horaFull.split(':');
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${minStr} ${ampm}`;
  };

  const formatCurrency = (amount: number) => `S/ ${amount.toFixed(2)}`;

  const handleRegistrarCobro = (cita: CitaCaja) => {
    setCitaSeleccionada(cita);
    setIsDrawerOpen(true);
  };

  const handlePrintTicket = async (cita: CitaCaja, pago: PagoRegistrado) => {
    // Fetch servicios de la atención vinculada para listar en ticket
    let serviciosTicket: { nombre: string; precio: number }[] = [];
    const { data: atencionData } = await supabase
      .from('atenciones')
      .select('tratamientos_realizados')
      .eq('cita_id', cita.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (atencionData?.tratamientos_realizados && Array.isArray(atencionData.tratamientos_realizados)) {
      const { data: serviciosData } = await supabase
        .from('servicios')
        .select('nombre, precio_base')
        .in('nombre', atencionData.tratamientos_realizados);

      if (serviciosData) {
        serviciosTicket = serviciosData.map(s => ({ nombre: s.nombre, precio: s.precio_base }));
      }
    }

    // Fallback: si no hay servicios vinculados, mostrar genérico
    if (serviciosTicket.length === 0) {
      serviciosTicket = [{ nombre: 'Servicio Podológico', precio: pago.monto_total }];
    }

    setTicketData({
      numeroTicket: pago.numero_ticket,
      pacienteNombre: `${cita.pacientes.nombres} ${cita.pacientes.apellidos}`,
      pacienteDocumento: cita.pacientes.numero_documento,
      pacienteTelefono: cita.pacientes.telefono,
      fechaPago: pago.fecha_pago || new Date().toISOString(),
      servicios: serviciosTicket,
      montoTotal: pago.monto_total,
      metodoPago: pago.metodo_pago,
      codigoReferencia: pago.codigo_referencia,
      especialista: cita.podologos?.nombres,
    });
    setTicketOpen(true);
  };

  const ESTADOS_MAP: Record<string, { color: string; border: string }> = {
    'Programada': { color: 'bg-gray-100 text-gray-600', border: 'border-gray-200' },
    'Confirmada': { color: 'bg-[#00C288]/10 text-[#00C288]', border: 'border-[#00C288]/30' },
    'En Sala de Espera': { color: 'bg-orange-50 text-orange-600', border: 'border-orange-200' },
    'Atendida': { color: 'bg-[#004975]/10 text-[#004975]', border: 'border-[#004975]/30' },
  };

  // Stats
  const totalCitas = citas.length;
  const totalPagadas = citas.filter(c => getPagoByCitaId(c.id)).length;
  const totalPendientes = totalCitas - totalPagadas;
  const montoRecaudado = citas.reduce((sum, c) => {
    const pago = getPagoByCitaId(c.id);
    return sum + (pago ? pago.monto_total : 0);
  }, 0);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#004975]/5 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#004975]" />
            </div>
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Hoy</span>
          </div>
          <p className="text-xs font-bold text-[#004975] capitalize">
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Atenciones</span>
          </div>
          <p className="text-2xl font-black text-[#004975] tabular-nums">{totalCitas}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Pendientes</span>
          </div>
          <p className="text-2xl font-black text-orange-500 tabular-nums">{totalPendientes}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#00C288]/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-[#00C288]" />
            </div>
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Recaudado</span>
          </div>
          <p className="text-2xl font-black text-[#00C288] tabular-nums">{formatCurrency(montoRecaudado)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#00C288] rounded-full animate-spin" />
          </div>
        ) : citas.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Calendar className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-black text-[#004975] mb-2">Sin citas hoy</h3>
            <p className="text-gray-400 font-bold text-sm max-w-sm mx-auto">
              No hay atenciones programadas para hoy. Las citas aparecerán aquí automáticamente desde la agenda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Hora
                  </th>
                  <th className="text-left px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Paciente
                  </th>
                  <th className="text-left px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Especialista
                  </th>
                  <th className="text-center px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Estado Cita
                  </th>
                  <th className="text-center px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Cobro
                  </th>
                </tr>
              </thead>
              <tbody>
                {citas.map((cita, index) => {
                  const pago = getPagoByCitaId(cita.id);
                  const style = ESTADOS_MAP[cita.estado] || ESTADOS_MAP['Programada'];
                  const isPagado = !!pago;

                  return (
                    <tr
                      key={cita.id}
                      className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors group ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      } ${isPagado ? 'opacity-70' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg ${style.color}`}>
                            <Clock className="w-4 h-4" />
                          </div>
                          <span className="font-black text-[#004975] text-sm tabular-nums whitespace-nowrap">
                            {formatearHora(cita.hora_cita)}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-[#004975]/5 rounded-full flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-[#004975]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#004975] text-sm truncate">
                              {cita.pacientes.nombres} {cita.pacientes.apellidos}
                            </p>
                            {cita.pacientes.numero_documento && (
                              <p className="text-[11px] font-bold text-gray-400 mt-0.5">
                                DOC: {cita.pacientes.numero_documento}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {cita.podologos && (
                          <div
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border shadow-sm"
                            style={{
                              backgroundColor: `${cita.podologos.color_etiqueta}12`,
                              color: cita.podologos.color_etiqueta,
                              borderColor: `${cita.podologos.color_etiqueta}30`,
                            }}
                          >
                            <Stethoscope className="w-3.5 h-3.5" />
                            {cita.podologos.nombres}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border shadow-sm ${style.color} ${style.border}`}
                        >
                          {cita.estado}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        {isPagado ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] bg-[#00C288]/10 text-[#00C288] border border-[#00C288]/20 shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Pagado
                            </span>
                            {pago!.numero_ticket && (
                              <span className="text-[10px] font-black text-[#004975]/50 tabular-nums tracking-wider">
                                TKT-{String(pago!.numero_ticket).padStart(6, '0')}
                              </span>
                            )}
                            <span className="text-xs font-black text-[#004975] tabular-nums">
                              {formatCurrency(pago!.monto_total)}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                              {pago!.metodo_pago}
                            </span>
                            <button
                              onClick={() => handlePrintTicket(cita, pago!)}
                              className="mt-1 text-[10px] font-black text-[#004975] hover:text-[#00C288] uppercase tracking-wider inline-flex items-center gap-1 hover:underline transition-colors"
                            >
                              <Printer className="w-3 h-3" />
                              Imprimir Ticket
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRegistrarCobro(cita)}
                            className="bg-[#00C288] hover:bg-[#00ab78] text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg inline-flex items-center gap-2"
                          >
                            <Receipt className="w-4 h-4" />
                            Registrar Cobro
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && citas.length > 0 && (
          <div className="px-6 py-3.5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">
              {totalCitas} cita{totalCitas !== 1 ? 's' : ''} hoy
            </span>
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-orange-500">
                {totalPendientes} pendiente{totalPendientes !== 1 ? 's' : ''}
              </span>
              <span className="text-xs font-bold text-[#00C288]">
                {totalPagadas} cobrada{totalPagadas !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      <CobroDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={fetchData}
        cita={citaSeleccionada}
      />

      <TicketPrint
        isOpen={ticketOpen}
        onClose={() => setTicketOpen(false)}
        data={ticketData}
      />
    </>
  );
}
