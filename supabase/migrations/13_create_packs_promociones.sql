-- Modulo de Packs y Promociones

-- Tabla principal: packs y promociones
CREATE TABLE packs_promociones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('pack_servicios', 'pack_sesiones_prepago', 'pack_sesiones_fraccionado', 'promocion')),

  -- Precio/Descuento
  precio_pack NUMERIC(10,2),
  descuento_porcentaje NUMERIC(5,2),
  descuento_monto NUMERIC(10,2),

  -- Sesiones (solo para pack_sesiones_*)
  total_sesiones INTEGER,

  -- Vigencia (para promociones temporales)
  fecha_inicio DATE,
  fecha_fin DATE,

  -- Stock limite (opcional)
  stock_total INTEGER,
  stock_usado INTEGER DEFAULT 0,

  -- Estado y multi-tenant
  estado BOOLEAN DEFAULT TRUE,
  sucursal_id UUID REFERENCES sucursales(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items incluidos en cada pack (servicios y/o productos)
CREATE TABLE pack_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID REFERENCES packs_promociones(id) ON DELETE CASCADE,
  servicio_id UUID REFERENCES servicios(id) ON DELETE SET NULL,
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  cantidad INTEGER DEFAULT 1,
  CHECK (servicio_id IS NOT NULL OR producto_id IS NOT NULL)
);

-- Creditos de sesiones por paciente (tracking de uso)
CREATE TABLE pack_creditos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID REFERENCES packs_promociones(id),
  paciente_id UUID REFERENCES pacientes(id),
  sesiones_total INTEGER NOT NULL,
  sesiones_usadas INTEGER DEFAULT 0,
  fecha_compra TIMESTAMPTZ DEFAULT NOW(),
  pago_id UUID REFERENCES pagos(id),
  sucursal_id UUID REFERENCES sucursales(id),
  estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'completado', 'cancelado'))
);

-- Indices
CREATE INDEX idx_packs_sucursal ON packs_promociones(sucursal_id);
CREATE INDEX idx_packs_estado ON packs_promociones(estado, tipo);
CREATE INDEX idx_pack_items_pack ON pack_items(pack_id);
CREATE INDEX idx_pack_creditos_paciente ON pack_creditos(paciente_id, estado);

-- RLS
ALTER TABLE packs_promociones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_creditos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_packs" ON packs_promociones FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_packs" ON packs_promociones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_packs" ON packs_promociones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_packs" ON packs_promociones FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_read_pack_items" ON pack_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_pack_items" ON pack_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_pack_items" ON pack_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_pack_items" ON pack_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_read_pack_creditos" ON pack_creditos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_pack_creditos" ON pack_creditos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_pack_creditos" ON pack_creditos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Anon policies (requeridas por Supabase client con anon key)
CREATE POLICY "anon_all_packs" ON packs_promociones FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_pack_items" ON pack_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_pack_creditos" ON pack_creditos FOR ALL TO anon USING (true) WITH CHECK (true);

-- Agregar pack_id a citas para pre-asignar oferta al agendar
ALTER TABLE citas ADD COLUMN IF NOT EXISTS pack_id UUID REFERENCES packs_promociones(id);

-- Agregar pack_id a pagos para trazabilidad de qué pack/promo se usó en el cobro
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS pack_id UUID REFERENCES packs_promociones(id);
