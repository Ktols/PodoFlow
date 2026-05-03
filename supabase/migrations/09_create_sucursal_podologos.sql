-- Migración: Relación muchos-a-muchos entre Sucursales y Podólogos
-- EJECUTAR EN SUPABASE SQL EDITOR

CREATE TABLE IF NOT EXISTS public.sucursal_podologos (
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE CASCADE,
    podologo_id UUID REFERENCES public.podologos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (sucursal_id, podologo_id)
);

-- Backfill: Asignar todos los podólogos actuales a la primera sede activa
DO $$
DECLARE
  sede_principal UUID;
BEGIN
  SELECT id INTO sede_principal 
  FROM public.sucursales 
  WHERE activa = true 
  ORDER BY created_at 
  LIMIT 1;

  IF sede_principal IS NOT NULL THEN
    INSERT INTO public.sucursal_podologos (sucursal_id, podologo_id)
    SELECT sede_principal, id FROM public.podologos
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE public.sucursal_podologos ENABLE ROW LEVEL SECURITY;

-- Política simple para service_role
CREATE POLICY "service role full access sucursal_podologos"
ON public.sucursal_podologos FOR ALL TO service_role USING (true) WITH CHECK (true);
