// ── Constantes de la aplicación ──

export const METODOS_PAGO = [
  { value: 'Efectivo', label: '\u{1F4B5} Efectivo' },
  { value: 'Tarjeta', label: '\u{1F4B3} Tarjeta' },
  { value: 'Yape', label: '\u{1F4F1} Yape' },
  { value: 'Plin', label: '\u{1F4F1} Plin' },
  { value: 'Transferencia', label: '\u{1F3E6} Transferencia' },
] as const;

export const METODOS_PAGO_NOMBRES = ['Efectivo', 'Yape', 'Plin', 'Tarjeta', 'Transferencia'] as const;

export const CATEGORIAS_PRODUCTO = [
  'Cremas y Tópicos',
  'Plantillas',
  'Vendas y Apósitos',
  'Instrumental',
  'Higiene',
  'Otros',
] as const;

export const PATIENT_CATEGORIES = [
  { key: 'nuevo', label: 'Nuevo', min: 0, max: 0, color: 'bg-blue-50 text-blue-700 border-blue-200', desc: 'Sin visitas registradas' },
  { key: 'inicial', label: 'Inicial', min: 1, max: 1, color: 'bg-sky-50 text-sky-700 border-sky-200', desc: '1 visita realizada' },
  { key: 'regular', label: 'Regular', min: 2, max: 4, color: 'bg-amber-50 text-amber-700 border-amber-200', desc: '2 a 4 visitas' },
  { key: 'recurrente', label: 'Recurrente', min: 5, max: 9, color: 'bg-[#00C288]/10 text-[#00C288] border-[#00C288]/30', desc: '5 a 9 visitas' },
  { key: 'fiel', label: 'Fiel', min: 10, max: Infinity, color: 'bg-purple-50 text-purple-700 border-purple-200', desc: '10+ visitas' },
] as const;

export const TIME_OPTIONS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00", "21:30", "22:00"
].map(time => {
  const [h, m] = time.split(':');
  const hNum = parseInt(h, 10);
  const ampm = hNum >= 12 ? 'PM' : 'AM';
  const h12 = (hNum % 12) || 12;
  return { value: time, label: `${h12.toString().padStart(2, '0')}:${m} ${ampm}` };
});

export const PACK_TYPES = [
  { value: 'pack_servicios', label: 'Pack de Servicios', desc: 'Combina servicios con precio especial' },
  { value: 'pack_sesiones_prepago', label: 'Pack Sesiones (Prepago)', desc: 'Varias sesiones pagadas por adelantado' },
  { value: 'pack_sesiones_fraccionado', label: 'Pack Sesiones (Fraccionado)', desc: 'Varias sesiones con precio por sesion reducido' },
] as const;
