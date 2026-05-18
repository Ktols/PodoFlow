import { z } from 'zod';

export const packSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(150, 'Maximo 150 caracteres'),
  descripcion: z.string().optional(),
  tipo: z.enum(['pack_servicios', 'pack_sesiones_prepago', 'pack_sesiones_fraccionado'], {
    message: 'Seleccione un tipo',
  }),
  precio_pack: z.string().optional(),
  total_sesiones: z.string().optional(),
  fecha_inicio: z.string().optional(),
  fecha_fin: z.string().optional(),
  servicios_ids: z.array(z.string()).optional(),
  productos_ids: z.array(z.object({
    id: z.string(),
    cantidad: z.number().min(1),
  })).optional(),
}).superRefine((data, ctx) => {
  if (!data.precio_pack || parseFloat(data.precio_pack) <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El precio del pack es requerido', path: ['precio_pack'] });
  }
  if (data.tipo.startsWith('pack_sesiones')) {
    if (!data.total_sesiones || parseInt(data.total_sesiones) < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Minimo 2 sesiones', path: ['total_sesiones'] });
    }
  }
  if (data.fecha_fin && data.fecha_inicio && data.fecha_fin < data.fecha_inicio) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Fecha fin debe ser posterior a fecha inicio', path: ['fecha_fin'] });
  }
});

export type PackFormValues = z.infer<typeof packSchema>;
