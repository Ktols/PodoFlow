import { z } from 'zod';

export const sucursalSchema = z.object({
  nombre_comercial: z.string().min(1, 'El nombre comercial es requerido'),
  razon_social: z.string().optional(),
  ruc: z.string()
    .optional()
    .refine(
      (val) => !val || /^\d{11}$/.test(val),
      { message: 'El RUC debe tener 11 dígitos numéricos' }
    ),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  whatsapp: z.string().optional(),
  activa: z.boolean().optional(),
});

export type SucursalFormValues = z.infer<typeof sucursalSchema>;
