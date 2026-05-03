-- Migración 11: Agregar sucursal_id a servicios y productos
-- EJECUTAR EN SUPABASE SQL EDITOR

-- 1. Agregar columna a servicios
ALTER TABLE public.servicios ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES public.sucursales(id);

-- 2. Productos ya no necesita (verificar si ya existe)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='sucursal_id') THEN
    ALTER TABLE public.productos ADD COLUMN sucursal_id UUID REFERENCES public.sucursales(id);
  END IF;
END $$;

-- 3. Backfill: Asignar todos los registros existentes a la primera sede activa
DO $$
DECLARE sede UUID;
BEGIN
  SELECT id INTO sede FROM public.sucursales WHERE activa = true ORDER BY created_at LIMIT 1;
  IF sede IS NOT NULL THEN
    UPDATE public.servicios SET sucursal_id = sede WHERE sucursal_id IS NULL;
    UPDATE public.productos SET sucursal_id = sede WHERE sucursal_id IS NULL;
  END IF;
END $$;

-- 4. RLS para servicios (si no existe)
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read servicios" ON public.servicios FOR SELECT TO anon USING (true);
CREATE POLICY "auth read servicios" ON public.servicios FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write servicios" ON public.servicios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service role servicios" ON public.servicios FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. RLS para productos (si no existe)
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read productos" ON public.productos FOR SELECT TO anon USING (true);
CREATE POLICY "auth read productos" ON public.productos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write productos" ON public.productos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service role productos" ON public.productos FOR ALL TO service_role USING (true) WITH CHECK (true);
