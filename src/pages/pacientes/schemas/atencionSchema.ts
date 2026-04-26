import { z } from 'zod';

export const atencionSchema = z.object({
  motivo_consulta: z.string().min(1, "El motivo es requerido"),
  podologo_id: z.string().min(1, 'Debe seleccionar un especialista a cargo'),
  diagnostico: z.string().optional(),
  tratamiento: z.string().optional(),
  recomendaciones: z.string().optional(),
  indicaciones: z.string().optional(),
  evaluacion_piel: z.array(z.string()).optional(),
  evaluacion_unas: z.array(z.string()).optional(),
  tratamientos_realizados: z.array(z.string()).min(1, 'Debe registrar al menos un tratamiento aplicado'),
  productos_usados: z.array(z.string()).optional(),
  medicamentos_recetados: z.array(z.string()).optional(),
  proxima_cita: z.string().optional(),
});

export type AtencionFormValues = z.infer<typeof atencionSchema>;
