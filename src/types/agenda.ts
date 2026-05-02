/**
 * Tipos de dominio compartidos para el módulo de Agenda.
 * Centraliza los estados válidos como z.enum para type-safety en toda la app.
 */
import { z } from 'zod';

// ── Estados de Cita ───────────────────────────────────────────────────────────
// Regla: schema-use-enums — strings mágicos reemplazados por un enum validado
export const EstadoCitaSchema = z.enum([
  'Programada',
  'Confirmada',
  'En Sala de Espera',
  'Atendida',
  'Cancelada',
  'No Asistió',
]);

export type EstadoCita = z.infer<typeof EstadoCitaSchema>;

// Array derivado del enum para uso en select/dropdowns — única fuente de verdad
export const ESTADOS_CITA_OPTIONS = EstadoCitaSchema.options;

// Estados que cierran el ciclo de vida de una cita
export const ESTADOS_FINALES = new Set<EstadoCita>(['Atendida', 'Cancelada', 'No Asistió']);

// Paleta visual derivada del enum (type-safe: TS avisa si falta un estado)
export const ESTADOS_MAP: Record<EstadoCita, { color: string; border: string }> = {
  'Programada':        { color: 'bg-gray-100 text-gray-600',      border: 'border-gray-200' },
  'Confirmada':        { color: 'bg-[#00C288]/10 text-[#00C288]', border: 'border-[#00C288]/30' },
  'En Sala de Espera': { color: 'bg-orange-50 text-orange-600',   border: 'border-orange-200' },
  'Atendida':          { color: 'bg-[#004975]/10 text-[#004975]', border: 'border-[#004975]/30' },
  'Cancelada':         { color: 'bg-red-50 text-red-600',         border: 'border-red-200' },
  'No Asistió':        { color: 'bg-slate-100 text-slate-600',    border: 'border-slate-300' },
};

// ── Tipos de respuesta Supabase (elimina `any` en queries) ───────────────────

/** Fila devuelta por supabase de la tabla `atenciones` con join a podologos */
export interface AtencionRow {
  created_at: string;
  motivo_consulta: string;
  tratamientos_realizados: string[];
  podologos: { nombres: string } | null;
}

/** Fila devuelta por supabase de la tabla `usuarios_sucursales` con join */
export interface UsuarioSucursalRow {
  sucursales: {
    id: string;
    nombre_comercial: string;
    razon_social: string | null;
    ruc: string | null;
    direccion: string | null;
    telefono: string | null;
    whatsapp: string | null;
    activa: boolean;
  } | null;
}

/** Próxima cita del Dashboard */
export interface ProximaCitaRow {
  id: string;
  hora_cita: string;
  motivo: string;
  estado: EstadoCita;
  pacientes: { nombres: string; apellidos: string } | null;
  podologos: { nombres: string } | null;
}
