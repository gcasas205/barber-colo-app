/** Formatea una duración: 30 → "30 min", 120 → "2 h", 90 → "1 h 30 min". */
export function formatDuration(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes <= 0) throw new Error(`Duración inválida: ${minutes}`);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
