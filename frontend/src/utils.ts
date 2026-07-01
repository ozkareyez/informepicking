export function calculateTimeSpent(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function calculateHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  return Math.round((totalMinutes / 60) * 100) / 100;
}

export function calculateKgPerHour(kg: number, hours: number): number {
  if (hours === 0) return 0;
  return Math.round((kg / hours) * 100) / 100;
}

export function calculateEfficiency(kgPerHour: number): number {
  return Math.round((kgPerHour / 3000) * 10000) / 100;
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function formatNumber(n: number, decimals: number = 2): string {
  return n.toLocaleString('es', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatEfficiency(n: number): string {
  return `${formatNumber(n)}%`;
}

export function calculateCargueTime(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}
