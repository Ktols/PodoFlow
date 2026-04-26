ALTER TABLE citas ADD COLUMN IF NOT EXISTS servicios_preseleccionados TEXT[] DEFAULT '{}';
