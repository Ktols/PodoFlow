// ── Entidades principales del dominio ──

export interface Paciente {
  id: string;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  alergias_alertas: string | null;
  fecha_nacimiento?: string | null;
  diabetes?: boolean;
  hipertension?: boolean;
  enfermedad_vascular?: boolean;
  tratamiento_oncologico?: boolean;
  alergias_detalle?: string | null;
  sexo?: string | null;
  sellos?: number;
  sellos_canjeados?: number;
}

export interface Especialista {
  id: string;
  dni: string;
  nombres: string;
  especialidad: string;
  telefono: string;
  correo: string;
  color_etiqueta: string;
  estado: boolean;
  created_at: string;
}

export interface CitaList {
  id: string;
  paciente_id: string;
  podologo_id: string;
  fecha_cita: string;
  hora_cita: string;
  motivo: string;
  estado: string;
  pacientes: {
    nombres: string;
    apellidos: string;
    telefono: string | null;
    numero_documento: string | null;
    sellos?: number;
  };
  podologos: {
    nombres: string;
    color_etiqueta: string;
  };
  adelanto?: number;
  adelanto_metodo_pago?: string | null;
}

export interface Atencion {
  id: string;
  paciente_id: string;
  motivo_consulta: string;
  diagnostico?: string | null;
  tratamiento: string | null;
  recomendaciones?: string | null;
  indicaciones: string | null;
  fotos: string[] | null;
  created_at: string;
  evaluacion_piel?: string[];
  evaluacion_unas?: string[];
  tratamientos_realizados?: string[];
  productos_usados?: string[];
  medicamentos_recetados?: string[];
  proxima_cita?: string | null;
  podologo_id?: string;
  podologos?: {
    id: string;
    nombres: string;
    color_etiqueta: string;
  };
}

export interface Producto {
  id: string;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  precio: number;
  stock: number;
  stock_minimo: number;
  estado: boolean;
  created_at?: string;
}

export interface Servicio {
  id: string;
  nombre: string;
  precio_base: number;
  estado: boolean;
  created_at?: string;
}

export interface Venta {
  id: string;
  paciente_id: string | null;
  items: VentaItem[];
  subtotal: number;
  descuento: number;
  total: number;
  metodo_pago: string;
  estado: string;
  notas: string | null;
  created_at: string;
  pacientes: { nombres: string; apellidos: string; numero_documento: string } | null;
}

export interface VentaItem {
  producto_id: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
}

export interface Sucursal {
  id: string;
  nombre_comercial: string;
  razon_social: string | null;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  whatsapp: string | null;
  activa: boolean;
}

export interface Perfil {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  role_id: string | null;
  rol_nombre: string | null;
}

export interface PagoRegistrado {
  id: string;
  cita_id: string;
  monto_total: number;
  metodo_pago: string;
  estado: string;
  codigo_referencia?: string;
  fecha_pago?: string;
  numero_ticket?: number;
}

export interface CitaCaja {
  id: string;
  paciente_id: string;
  podologo_id: string;
  fecha_cita: string;
  hora_cita: string;
  motivo: string;
  estado: string;
  adelanto?: number;
  adelanto_metodo_pago?: string | null;
  pacientes: {
    nombres: string;
    apellidos: string;
    numero_documento: string | null;
    telefono?: string | null;
  };
  podologos: {
    nombres: string;
    color_etiqueta: string;
  };
}

export interface CitaParaCobro {
  id: string;
  paciente_id: string;
  hora_cita: string;
  motivo: string;
  adelanto?: number;
  adelanto_metodo_pago?: string | null;
  pacientes: {
    nombres: string;
    apellidos: string;
    numero_documento: string | null;
  };
  podologos: {
    nombres: string;
    color_etiqueta: string;
  };
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
}
