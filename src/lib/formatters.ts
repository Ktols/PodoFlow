export function formatearHora(horaFull: string): string {
  if (!horaFull) return '';
  const [hourStr, minStr] = horaFull.split(':');
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${minStr} ${ampm}`;
}

export function formatPhone(phone: string | null): string | null {
  if (!phone) return null;
  const p = phone.replace(/\D/g, '');
  if (p.length === 9) return `51${p}`;
  return p;
}
