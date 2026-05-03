-- Migración: Agregar sucursal_id a la tabla ventas
-- EJECUTAR EN SUPABASE SQL EDITOR

-- Paso 1: Agregar la columna
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES public.sucursales(id);

-- Paso 2: Backfill - asignar todas las ventas existentes a la sede principal
DO $$
DECLARE
  sede_principal UUID;
  row_count INTEGER;
BEGIN
  SELECT id INTO sede_principal 
  FROM public.sucursales 
  WHERE activa = true 
  ORDER BY created_at 
  LIMIT 1;

  IF sede_principal IS NULL THEN
    RAISE EXCEPTION 'No hay sucursales activas.';
  END IF;

  UPDATE public.ventas 
  SET sucursal_id = sede_principal 
  WHERE sucursal_id IS NULL;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  RAISE NOTICE 'Ventas actualizadas: %', row_count;
  RAISE NOTICE '✅ Backfill de ventas completado.';
END $$;
