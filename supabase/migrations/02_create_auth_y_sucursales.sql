-- 1. Tabla de Roles (Para definir Dueño, Admin, Podólogo)
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar roles iniciales
INSERT INTO public.roles (nombre, descripcion) VALUES
('dueno', 'Acceso global a todas las sucursales y configuraciones'),
('administrativo', 'Gestiona agenda, caja y pacientes de una sucursal'),
('podologo', 'Atiende pacientes y ve su propia agenda de trabajo');

-- 2. Tabla de Sucursales / Tiendas
CREATE TABLE public.sucursales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_comercial VARCHAR(150) NOT NULL,
    razon_social VARCHAR(150),
    ruc VARCHAR(20),
    direccion TEXT,
    telefono VARCHAR(20),
    whatsapp VARCHAR(20),
    logo_bg_url TEXT,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Perfiles de Usuario (Adaptado para CLERK)
-- No usamos auth.users de Supabase. El ID será el de Clerk (VARCHAR), que suele lucir como "user_2Pabc..."
CREATE TABLE public.perfiles (
    id VARCHAR(100) PRIMARY KEY,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla Intermedia: Usuarios <-> Sucursales
-- Indica en qué sucursal(es) trabaja un empleado
CREATE TABLE public.usuarios_sucursales (
    usuario_id VARCHAR(100) REFERENCES public.perfiles(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE CASCADE,
    asignado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY(usuario_id, sucursal_id)
);

-- Trigger para automatizar el updated_at en sucursales y perfiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sucursales_modtime
BEFORE UPDATE ON public.sucursales
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_perfiles_modtime
BEFORE UPDATE ON public.perfiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security) iniciales habilitadas
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_sucursales ENABLE ROW LEVEL SECURITY;

-- Acceso general para probar desde app (Se mejorará si pasamos los JWT de Clerk a Supabase luego)
CREATE POLICY "Accesos base public" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Accesos base public" ON public.sucursales FOR ALL USING (true);
CREATE POLICY "Accesos base public" ON public.perfiles FOR ALL USING (true);
CREATE POLICY "Accesos base public" ON public.usuarios_sucursales FOR ALL USING (true);
