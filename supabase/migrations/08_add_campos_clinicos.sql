ALTER TABLE atenciones ADD COLUMN IF NOT EXISTS diagnostico TEXT;
ALTER TABLE atenciones ADD COLUMN IF NOT EXISTS recomendaciones TEXT;
ALTER TABLE atenciones ADD COLUMN IF NOT EXISTS proxima_cita DATE;
ALTER TABLE atenciones ADD COLUMN IF NOT EXISTS medicamentos_recetados TEXT[] DEFAULT '{}';
