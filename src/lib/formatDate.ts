/** Formato dd/m/yyyy (ej: 14/5/1985, 1/3/1990) */
export function formatearFecha(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Formato dd/m/yyyy HH:mm */
export function formatearFechaHora(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const fecha = formatearFecha(date);
  const h = date.getHours();
  const m = date.getMinutes();
  return `${fecha} ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
