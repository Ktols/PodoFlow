-- Migrations for EasyPod - Pacientes Table

CREATE TYPE tipo_documento_enum AS ENUM ('DNI', 'CE', 'PASAPORTE');

CREATE TABLE pacientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_documento tipo_documento_enum NOT NULL DEFAULT 'DNI',
  numero_documento VARCHAR(12) UNIQUE NOT NULL,
  nombres VARCHAR(255) NOT NULL,
  apellidos VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  fecha_nacimiento DATE,
  alergias_alertas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Index recommendations for searches
CREATE INDEX idx_pacientes_numero_documento ON pacientes(numero_documento);
CREATE INDEX idx_pacientes_apellidos ON pacientes(apellidos);
