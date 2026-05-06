-- Log detallado de cada sesión/uso de un pack
CREATE TABLE pack_sesiones_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  credito_id UUID REFERENCES pack_creditos(id) ON DELETE CASCADE,
  sesion_numero INTEGER NOT NULL,
  fecha_uso TIMESTAMPTZ DEFAULT NOW(),
  cita_id UUID REFERENCES citas(id),
  pago_id UUID REFERENCES pagos(id),
  monto_pagado NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pack_sesiones_log_credito ON pack_sesiones_log(credito_id);

ALTER TABLE pack_sesiones_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_pack_sesiones_log" ON pack_sesiones_log FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_pack_sesiones_log" ON pack_sesiones_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
