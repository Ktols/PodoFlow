-- Migración: Agregar sucursal_id a tablas operativas
-- EJECUTAR EN SUPABASE SQL EDITOR

ALTER TABLE public.citas ADD COLUMN sucursal_id UUID REFERENCES public.sucursales(id);
ALTER TABLE public.atenciones ADD COLUMN sucursal_id UUID REFERENCES public.sucursales(id);
ALTER TABLE public.pagos ADD COLUMN sucursal_id UUID REFERENCES public.sucursales(id);
