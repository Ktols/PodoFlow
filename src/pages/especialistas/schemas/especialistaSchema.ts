import { z } from 'zod';

export const especialistaSchema = z.object({
  nombres: z.string().min(1, 'El nombre es obligatorio'),
  dni: z.string().min(8, 'DNI debe tener al menos 8 caracteres'),
  especialidad: z.string().optional(),
  telefono: z.string().optional(),
  correo: z.string().email('Debe ser un correo válido').optional().or(z.literal('')),
  color_etiqueta: z.string(),
  estado: z.boolean(),
});

export type EspecialistaFormValues = z.infer<typeof especialistaSchema>;
