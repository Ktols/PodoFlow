-- Backfill: Asignar sucursal_id a registros existentes
-- Esto toma la PRIMERA sucursal activa como "sede principal" y la asigna 
-- a todos los registros que aún no tienen sucursal.

-- Paso 1: Ver qué sucursal se usará (ejecuta esto primero para confirmar)
-- SELECT id, nombre_comercial FROM public.sucursales WHERE activa = true ORDER BY created_at LIMIT 1;

-- Paso 2: Actualización masiva
DO $$
DECLARE
  sede_principal UUID;
BEGIN
  -- Obtener la primera sucursal activa
  SELECT id INTO sede_principal 
  FROM public.sucursales 
  WHERE activa = true 
  ORDER BY created_at 
  LIMIT 1;

  IF sede_principal IS NULL THEN
    RAISE EXCEPTION 'No hay sucursales activas. Crea una primero desde Tienda.';
  END IF;

  RAISE NOTICE 'Sede principal encontrada: %', sede_principal;

  -- Actualizar citas sin sucursal
  UPDATE public.citas 
  SET sucursal_id = sede_principal 
  WHERE sucursal_id IS NULL;
  RAISE NOTICE 'Citas actualizadas: %', (SELECT COUNT(*) FROM public.citas WHERE sucursal_id = sede_principal);

  -- Actualizar atenciones sin sucursal
  UPDATE public.atenciones 
  SET sucursal_id = sede_principal 
  WHERE sucursal_id IS NULL;
  RAISE NOTICE 'Atenciones actualizadas: %', (SELECT COUNT(*) FROM public.atenciones WHERE sucursal_id = sede_principal);

  -- Actualizar pagos sin sucursal  
  UPDATE public.pagos 
  SET sucursal_id = sede_principal 
  WHERE sucursal_id IS NULL;
  RAISE NOTICE 'Pagos actualizados: %', (SELECT COUNT(*) FROM public.pagos WHERE sucursal_id = sede_principal);

  RAISE NOTICE '✅ Backfill completado. Todos los registros ahora pertenecen a la sede principal.';
END $$;
