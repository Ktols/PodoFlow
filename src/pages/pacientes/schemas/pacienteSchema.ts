import { z } from 'zod';

export const pacienteSchema = z.object({
  tipo_documento: z.enum(['DNI', 'CE', 'PASAPORTE'], {
    message: "Seleccione un tipo de documento",
  }),
  numero_documento: z.string().min(1, "Requerido").max(12, "Máximo 12 caracteres"),
  nombres: z.string().min(1, "Requerido"),
  apellidos: z.string().min(1, "Requerido"),
  telefono: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
  alergias_alertas: z.string().optional(),
  diabetes: z.boolean().optional(),
  hipertension: z.boolean().optional(),
  enfermedad_vascular: z.boolean().optional(),
  tratamiento_oncologico: z.boolean().optional(),
  alergias_detalle: z.string().optional(),
  sexo: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.tipo_documento === 'DNI') {
    if (!/^\d{8}$/.test(data.numero_documento)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DNI debe tener 8 dígitos numéricos",
        path: ['numero_documento'],
      });
    }
  } else {
    if (!/^[A-Za-z0-9]{6,12}$/.test(data.numero_documento)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Documento debe tener 6-12 caracteres alfanuméricos",
        path: ['numero_documento'],
      });
    }
  }
});

export type PacienteFormValues = z.infer<typeof pacienteSchema>;
