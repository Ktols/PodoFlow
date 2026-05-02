import { z } from 'zod';

// Re-exporta el enum de estados desde el módulo de tipos compartidos
export { EstadoCitaSchema, ESTADOS_CITA_OPTIONS, ESTADOS_FINALES, ESTADOS_MAP } from '@/types/agenda';
export type { EstadoCita } from '@/types/agenda';

export const citaSchema = z.object({
  paciente_id: z.string().uuid("Seleccione un paciente extraído del buscador"),
  podologo_id: z.string().optional(),
  fecha_cita: z.string().min(1, "La fecha del turno es requerida"),
  hora_cita: z.string().min(1, "Especifique a qué hora comienza el turno"),
  motivo: z.string().optional(),
  servicios_preseleccionados: z.array(z.string()).optional(),
  adelanto: z.string().optional(),
  adelanto_metodo_pago: z.string().optional(),
});

export type CitaFormValues = z.infer<typeof citaSchema>;
