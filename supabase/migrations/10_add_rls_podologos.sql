-- Migración 10: Políticas RLS para Podólogos y Sucursal_Podologos
-- Permite que los usuarios autenticados vean la información necesaria

-- 1. Políticas para la tabla podologos
ALTER TABLE public.podologos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver podologos"
ON public.podologos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar podologos"
ON public.podologos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar podologos"
ON public.podologos FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. Políticas para la tabla sucursal_podologos (Intermedia)
CREATE POLICY "Usuarios autenticados pueden ver asignaciones de sucursal"
ON public.sucursal_podologos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar asignaciones"
ON public.sucursal_podologos FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
