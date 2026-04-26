ALTER TABLE atenciones ADD COLUMN IF NOT EXISTS productos_usados TEXT[] DEFAULT '{}';
