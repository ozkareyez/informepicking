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

const STANDARD_KG_PER_HOUR = 2500;
const CARGUE_STANDARD_KG_PER_HOUR = 4000; // 2000 kg / 30 min
const DESCARGUE_STANDARD_KG_PER_HOUR = 66666.67; // 200000 kg / 3 h

export function getStandardKgPerHour(): number {
  return STANDARD_KG_PER_HOUR;
}

export function getCargueStandardKgPerHour(): number {
  return CARGUE_STANDARD_KG_PER_HOUR;
}

export function getDescargueStandardKgPerHour(): number {
  return DESCARGUE_STANDARD_KG_PER_HOUR;
}

export function calculateEfficiency(kgPerHour: number): number {
  return Math.round((kgPerHour / STANDARD_KG_PER_HOUR) * 10000) / 100;
}

export function calculateCargueEfficiency(kgPerHour: number): number {
  return Math.round((kgPerHour / CARGUE_STANDARD_KG_PER_HOUR) * 10000) / 100;
}

export function calculateDescargueEfficiency(kgPerHour: number): number {
  return Math.round((kgPerHour / DESCARGUE_STANDARD_KG_PER_HOUR) * 10000) / 100;
}

export function parseTimeSpentToHours(time: string | null): number {
  if (!time) return 0;
  const m = time.match(/(\d+)h\s*(\d+)m/);
  return m ? parseInt(m[1]) + parseInt(m[2]) / 60 : 0;
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getWeekRange(weekNumber: number, year: number): { start: string; end: string } {
  const firstJan = new Date(year, 0, 1);
  const days = (weekNumber - 1) * 7;
  const start = new Date(firstJan);
  start.setDate(firstJan.getDate() + days - firstJan.getDay() + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function getOverdueDays(date: string, type: 'Masivo' | 'Venta Directa'): number {
  const today = getToday();
  const orderDate = new Date(date);
  const todayDate = new Date(today);

  if (type === 'Masivo') {
    const diff = Math.floor((todayDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }
  const limit = new Date(orderDate);
  limit.setDate(limit.getDate() + 1);
  const diff = Math.floor((todayDate.getTime() - limit.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
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

export function toUpperCase(value: string | null | undefined): string {
  return (value ?? '').toUpperCase();
}
