import { z } from 'zod';

export const citaSchema = z.object({
  paciente_id: z.string().uuid("Seleccione un paciente extraído del buscador"),
  podologo_id: z.string().uuid("Seleccione al especialista asignado"),
  fecha_cita: z.string().min(1, "La fecha del turno es requerida"),
  hora_cita: z.string().min(1, "Especifique a qué hora comienza el turno"),
  motivo: z.string().min(1, "Describa brevemente el motivo de la cita"),
  adelanto: z.string().optional(),
  adelanto_metodo_pago: z.string().optional(),
});

export type CitaFormValues = z.infer<typeof citaSchema>;
