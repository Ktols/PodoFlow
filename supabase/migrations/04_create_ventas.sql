-- Ventas / POS Module
CREATE TABLE ventas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID REFERENCES pacientes(id),
  atencion_id UUID,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  descuento NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  metodo_pago VARCHAR(50) NOT NULL DEFAULT 'Efectivo',
  estado VARCHAR(20) NOT NULL DEFAULT 'Completada',
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_ventas_paciente ON ventas(paciente_id);
CREATE INDEX idx_ventas_created ON ventas(created_at);
CREATE INDEX idx_ventas_estado ON ventas(estado);
