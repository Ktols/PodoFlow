import React from 'react';
import {
  Calendar as CalendarIcon, Clock, User, Stethoscope,
  Edit, AlertTriangle, X, Gift,
} from 'lucide-react';
import { WhatsAppIcon } from '../../../components/WhatsAppIcon';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CitaList } from '../AgendaPage';
import { CLINIC_INFO, SELLOS_PARA_GRATIS } from '@/config/clinicData';
import { ESTADOS_MAP, ESTADOS_CITA_OPTIONS, ESTADOS_FINALES } from '@/types/agenda';
import type { EstadoCita } from '@/types/agenda';
import { formatearHora, formatPhone } from '@/lib/formatters';

// ── Props ────────────────────────────────────────────────────────────────────
interface SucursalMin {
  nombre_comercial: string;
  telefono: string | null;
  direccion: string | null;
}

interface CitasListPanelProps {
  citas: CitaList[];
  searchTerm: string;
  selectedEspecialista: string;
  selectedEstado: string;
  isGlobalSearch: boolean;
  selectedDate: Date;
  sucursalActiva: SucursalMin | null;
  onEditCita: (cita: CitaList) => void;
  onUpdateEstado: (id: string, nuevoEstado: string) => void;
  onNavigateToAtender: (pacienteId: string, citaId: string) => void;
  onClearFilters: () => void;
}

// ── Componente memoizado (rerender-no-inline-components) ─────────────────────
export const CitasListPanel = React.memo(function CitasListPanel({
  citas,
  searchTerm,
  selectedEspecialista,
  selectedEstado,
  isGlobalSearch,
  selectedDate,
  sucursalActiva,
  onEditCita,
  onUpdateEstado,
  onNavigateToAtender,
  onClearFilters,
}: CitasListPanelProps) {
  // Contexto temporal, calculado una vez por render del panel
  const now = new Date();
  const minHoy = now.getHours() * 60 + now.getMinutes();
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');

  // ── Filtrado ─────────────────────────────────────────────────────────────
  const citasFiltradas = citas.filter(cita => {
    const searchMatch =
      searchTerm === '' ||
      `${cita.pacientes.nombres} ${cita.pacientes.apellidos} ${cita.pacientes.numero_documento ?? ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const espMatch = selectedEspecialista === '' || cita.podologo_id === selectedEspecialista;

    let estMatch = true;
    if (selectedEstado === 'Sin Resolver') {
      const esEstadoFinal = ESTADOS_FINALES.has(cita.estado as EstadoCita);
      const [cY, cM, cD] = cita.fecha_cita.split('-').map(Number);
      const fechaCita = new Date(cY, cM - 1, cD);
      const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isOldDay = fechaCita < hoy;
      const isTodayAcc = fechaCita.getTime() === hoy.getTime();
      const [hC, mC] = cita.hora_cita.split(':').map(Number);
      const isExpiredHour = isTodayAcc && hC * 60 + mC + 60 < minHoy;
      estMatch = (isOldDay || isExpiredHour) && !esEstadoFinal;
    } else {
      estMatch = selectedEstado === '' || cita.estado === selectedEstado;
    }

    return searchMatch && espMatch && estMatch;
  });

  const isFiltering = searchTerm !== '' || selectedEspecialista !== '' || selectedEstado !== '';

  // ── Ordenamiento inteligente (hoy: próximas primero) ─────────────────────
  let renderCitas = [...citasFiltradas];
  if (!isGlobalSearch && isToday) {
    const grupoA = renderCitas.filter(c => {
      const [h, m] = c.hora_cita.split(':').map(Number);
      return h * 60 + m >= minHoy - 30;
    });
    const grupoB = renderCitas.filter(c => {
      const [h, m] = c.hora_cita.split(':').map(Number);
      return h * 60 + m < minHoy - 30;
    });
    renderCitas = [...grupoA, ...grupoB];
  }

  // ── Estado vacío ──────────────────────────────────────────────────────────
  if (citasFiltradas.length === 0) {
    return (
      <div className="text-center py-24 bg-white/50 rounded-3xl border border-gray-200 shadow-sm border-dashed">
        <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-5 opacity-50" />
        <h3 className="text-2xl font-black text-[#004975] mb-2 tracking-tight">Sin coincidencias</h3>
        <p className="text-gray-500 font-bold max-w-sm mx-auto">
          No hay citas que coincidan con los filtros de búsqueda aplicados.
        </p>
        {isFiltering && (
          <button
            onClick={onClearFilters}
            className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-bold transition-colors inline-flex items-center gap-2"
          >
            <X className="w-4 h-4" /> Limpiar Filtros
          </button>
        )}
      </div>
    );
  }

  // ── Lista de cards ────────────────────────────────────────────────────────
  return (
    <>
      {isFiltering && (
        <div className="flex justify-between items-center px-2">
          <span className="text-sm font-bold text-gray-500">
            Mostrando {citasFiltradas.length} resultados filtrados
          </span>
          <button
            onClick={onClearFilters}
            className="text-sm font-bold text-[#004975] hover:text-[#00C288] transition-colors flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Limpiar filtros
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5">
        {renderCitas.map(cita => {
          const wafmt = formatPhone(cita.pacientes.telefono);
          const style = ESTADOS_MAP[cita.estado as EstadoCita] ?? ESTADOS_MAP['Programada'];
          const esEstadoFinal = ESTADOS_FINALES.has(cita.estado as EstadoCita);

          const [hC, mC] = cita.hora_cita.split(':').map(Number);
          const minutosCita = hC * 60 + mC;
          const isPasada = isToday && !isGlobalSearch && minutosCita < minHoy - 30 && !esEstadoFinal;
          const enCurso =
            isToday && !isGlobalSearch && minHoy >= minutosCita && minHoy < minutosCita + 30 && !esEstadoFinal;

          const [cY, cM, cD] = cita.fecha_cita.split('-').map(Number);
          const fechaCita = new Date(cY, cM - 1, cD);
          const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const isOldDay = fechaCita < hoy;
          const isTodayAcc = fechaCita.getTime() === hoy.getTime();
          const isExpiredHour = isTodayAcc && minutosCita + 60 < minHoy;
          const esTurnoFantasma = (isOldDay || isExpiredHour) && !esEstadoFinal;

          const handleEnviarWhatsApp = () => {
            if (!wafmt) return;
            const nombre = cita.pacientes.nombres.split(' ')[0];
            const hora = formatearHora(cita.hora_cita);
            const clinicaNombre   = sucursalActiva?.nombre_comercial ?? CLINIC_INFO.nombre;
            const clinicaTelefono = sucursalActiva?.telefono ?? CLINIC_INFO.telefono;
            const clinicaDireccion = sucursalActiva?.direccion ?? CLINIC_INFO.direccion;
            const mensaje =
              cita.estado === 'Cancelada'
                ? `Hola ${nombre}, te escribimos de ${clinicaNombre}.\n\nTe confirmamos que tu cita de hoy a las ${hora} hrs ha sido cancelada en nuestro sistema.\n\nSi deseas reprogramarla para otra fecha, puedes contactarnos al ${clinicaTelefono}.\n\n¡Gracias por avisarnos!`
                : `Hola ${nombre}, te saludamos de ${clinicaNombre}.\n\nQueremos recordarte tu cita para hoy a las ${hora} hrs.\n\nUbicación: ${clinicaDireccion}\nContacto: ${clinicaTelefono}\n\n${CLINIC_INFO.mensaje_pie}\n\n¡Te esperamos!`;
            window.open(`https://wa.me/${wafmt}?text=${encodeURIComponent(mensaje)}`, '_blank');
          };

          return (
            <div
              key={cita.id}
              className={`rounded-2xl border shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] p-4 lg:p-6 hover:shadow-lg transition-all relative overflow-hidden flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5 ${
                esEstadoFinal
                  ? 'opacity-75 bg-gray-50 ' + style.border
                  : esTurnoFantasma
                  ? 'bg-red-50 border-red-500 ring-1 ring-red-500'
                  : isPasada
                  ? 'opacity-60 bg-gray-50 grayscale-[0.3] ' + style.border
                  : 'bg-white ' + style.border
              } ${enCurso ? 'ring-2 ring-[#00C288] ring-offset-2' : ''}`}
            >
              {/* Timeline Color bar */}
              <div className={`absolute left-0 inset-y-0 w-2.5 ${style.color.split(' ')[0]}`} />

              {/* Fila 1: Hora + Paciente */}
              <div className="flex flex-wrap items-center gap-3 lg:gap-5 flex-1 min-w-0">
              {/* Hora Analógica */}
              <div className="flex flex-row items-center gap-3 ml-3 shrink-0">
                <div className={`p-2.5 rounded-xl ${style.color}`}>
                  <Clock className="w-6 h-6 border-transparent" />
                </div>
                <div className="flex flex-col justify-center">
                  {esTurnoFantasma && (
                    <span className="text-[10px] font-black text-white bg-red-500 uppercase tracking-wider mb-1 px-2 py-0.5 rounded-full w-fit shadow-sm flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Sin Resolver
                    </span>
                  )}
                  {enCurso && (
                    <span className="text-[10px] font-black text-white bg-[#00C288] uppercase tracking-wider mb-1 px-2 py-0.5 rounded-full w-fit animate-pulse shadow-sm">
                      En Curso
                    </span>
                  )}
                  {isGlobalSearch && (
                    <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                      {(() => {
                        const [y, mo, d] = cita.fecha_cita.split('-');
                        return format(new Date(+y, +mo - 1, +d), 'EEE d MMM', { locale: es });
                      })()}
                    </span>
                  )}
                  <span className="text-2xl font-black text-[#004975] tracking-tighter whitespace-nowrap leading-none">
                    {formatearHora(cita.hora_cita)}
                  </span>
                </div>
              </div>

              {/* Patient Context Bundle */}
              <div className="flex-1 min-w-[220px] bg-gray-50/50 p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2.5 mb-2">
                  <User className="w-5 h-5 text-[#00C288]" />
                  <h4 className="text-lg font-black text-[#004975] truncate">
                    {cita.pacientes.nombres} {cita.pacientes.apellidos}
                  </h4>
                </div>
                <p className="text-sm font-bold text-gray-500 pl-7 truncate pr-4">{cita.motivo}</p>

                {cita.podologos && (
                  <div className="flex items-center gap-1.5 mt-3 pl-7 flex-wrap">
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border shadow-sm"
                      style={{
                        backgroundColor: `${cita.podologos.color_etiqueta}12`,
                        color: cita.podologos.color_etiqueta,
                        borderColor: `${cita.podologos.color_etiqueta}30`,
                      }}
                    >
                      <Stethoscope className="w-4 h-4" />
                      <span>Atiende: {cita.podologos.nombres}</span>
                    </div>
                    {Number(cita.adelanto ?? 0) > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border shadow-sm bg-[#00C288]/10 text-[#00C288] border-[#00C288]/20">
                        Adelanto: S/ {Number(cita.adelanto).toFixed(2)}
                        {cita.adelanto_metodo_pago && (
                          <span className="text-[9px] font-bold text-[#004975]/50 normal-case">
                            ({cita.adelanto_metodo_pago})
                          </span>
                        )}
                      </div>
                    )}
                    {Number(cita.pacientes.sellos ?? 0) >= SELLOS_PARA_GRATIS && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border shadow-sm bg-gradient-to-r from-[#00C288] to-[#00ab78] text-white border-[#00C288] animate-pulse">
                        <Gift className="w-3.5 h-3.5" />
                        Visita Gratis Disponible
                      </div>
                    )}
                  </div>
                )}
              </div>
              </div>

              {/* Fila 2: Acciones + Estado */}
              <div className="flex items-center gap-2 lg:gap-3 flex-wrap ml-3 lg:ml-0">
              <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                <button
                  onClick={() => onEditCita(cita)}
                  disabled={esEstadoFinal}
                  className={`flex justify-center items-center w-11 h-11 rounded-xl border shadow-sm transition-all ${
                    esEstadoFinal
                      ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'
                      : 'bg-gray-50 text-gray-400 hover:text-[#004975] hover:bg-blue-50 border-gray-200 hover:border-blue-100 hover:-translate-y-0.5'
                  }`}
                  title={esEstadoFinal ? 'Edición bloqueada' : 'Editar Turno'}
                >
                  <Edit className="w-5 h-5" />
                </button>

                {cita.estado === 'En Sala de Espera' ? (
                  <button
                    onClick={() => onNavigateToAtender(cita.paciente_id, cita.id)}
                    className="flex items-center justify-center gap-2 bg-[#00C288] text-white hover:bg-[#00ab78] px-5 py-2.5 hover:-translate-y-0.5 rounded-xl transition-all font-black tracking-wide shadow-md"
                  >
                    <Stethoscope className="w-5 h-5" />
                    Atender
                  </button>
                ) : cita.estado === 'Atendida' ? (
                  <span className="text-[10px] font-black text-gray-400 px-5 py-3 bg-gray-50 rounded-xl border border-gray-200 shadow-sm uppercase tracking-widest text-center">
                    En Clínica
                  </span>
                ) : wafmt ? (
                  <button
                    onClick={handleEnviarWhatsApp}
                    className="flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#075E54] hover:bg-[#25D366]/20 border border-[#25D366]/20 px-5 py-2.5 hover:-translate-y-0.5 rounded-xl transition-all font-black tracking-wide shadow-sm"
                  >
                    <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
                    Notificar
                  </button>
                ) : (
                  <span className="text-[10px] font-black text-gray-400 px-5 py-3 bg-gray-50 rounded-xl border border-gray-200 shadow-sm uppercase tracking-widest">
                    Sin Celular
                  </span>
                )}
              </div>

              {/* Dropdown de Estado */}
              <div className="relative shrink-0 w-full lg:w-48" onClick={e => e.stopPropagation()}>
                <div
                  className={`relative rounded-xl border shadow-sm ${style.color} ${style.border} ${!esEstadoFinal ? 'transition-all hover:scale-[1.02]' : 'opacity-80'}`}
                >
                  <select
                    value={cita.estado}
                    disabled={esEstadoFinal}
                    onChange={e => onUpdateEstado(cita.id, e.target.value)}
                    className={`w-full appearance-none bg-transparent px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] outline-none ${esEstadoFinal ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {ESTADOS_CITA_OPTIONS.filter(s => s !== 'Atendida').map(opc => (
                      <option key={opc} value={opc} className="text-gray-900 bg-white font-bold">
                        {opc}
                      </option>
                    ))}
                    {cita.estado === 'Atendida' && (
                      <option value="Atendida" className="text-gray-900 bg-white font-bold">
                        Atendida
                      </option>
                    )}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5">
                    <span className="text-xs opacity-70">▼</span>
                  </div>
                </div>
              </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
});
