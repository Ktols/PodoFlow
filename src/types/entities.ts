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
  codigo_referencia: string | null;
  numero_ticket: number | null;
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
  pack_id?: string | null;
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
  pack_id?: string | null;
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

// ── Packs y Promociones ──

export type PackTipo = 'pack_servicios' | 'pack_sesiones_prepago' | 'pack_sesiones_fraccionado';

export interface Pack {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: PackTipo;
  precio_pack: number | null;
  descuento_porcentaje: number | null;
  descuento_monto: number | null;
  total_sesiones: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  stock_total: number | null;
  stock_usado: number | null;
  estado: boolean;
  sucursal_id: string;
  created_at: string;
  pack_items?: PackItem[];
}

export interface PackItem {
  id: string;
  pack_id: string;
  servicio_id: string | null;
  producto_id: string | null;
  cantidad: number;
  servicios?: { id: string; nombre: string; precio_base: number } | null;
  productos?: { id: string; nombre: string; precio: number } | null;
}

export interface PackCredito {
  id: string;
  pack_id: string;
  paciente_id: string;
  sesiones_total: number;
  sesiones_usadas: number;
  fecha_compra: string;
  pago_id: string | null;
  sucursal_id: string;
  estado: 'activo' | 'completado' | 'cancelado';
  packs_promociones?: { nombre: string; tipo: string; precio_pack: number | null } | null;
  pack_sesiones_log?: PackSesionLog[];
}

export interface PackSesionLog {
  id: string;
  credito_id: string;
  sesion_numero: number;
  fecha_uso: string;
  cita_id: string | null;
  pago_id: string | null;
  monto_pagado: number;
}
