export const CHART_COLORS = {
  // 2 colores principales
  PRIMARY: '#2563eb',      // Azul corporativo
  SECONDARY: '#10b981',    // Verde esmeralda

  // Semáforo para KPIs/estado
  SEM_SUCCESS: '#10b981',  // Verde
  SEM_WARNING: '#f59e0b',  // Ámbar
  SEM_DANGER: '#ef4444',   // Rojo

  // Neutros
  GRID: '#f0f0f0',
  TEXT: '#6b7280',
  AXIS: '#9ca3af',
} as const;

// Para Pie charts con 2 segmentos (ej: Ocupación/Disponible, Masivo/Venta Directa)
export const PIE_TWO_COLORS = [CHART_COLORS.PRIMARY, CHART_COLORS.SECONDARY];

// Para barras agrupadas: [serie1, serie2]
export const BAR_GROUPED = [CHART_COLORS.PRIMARY, CHART_COLORS.SECONDARY];

// Para líneas múltiples
export const LINE_COLORS = [CHART_COLORS.PRIMARY, CHART_COLORS.SECONDARY, '#f59e0b'];

// KPI Card colors (bg-*)
export const KPI_COLORS = {
  blue: 'bg-blue-600',
  green: 'bg-emerald-600',
  purple: 'bg-purple-600',
  orange: 'bg-orange-600',
  red: 'bg-red-600',
  amber: 'bg-amber-600',
} as const;

// Semáforo para KPIs con umbrales
export function getSemaphoreColor(value: number, thresholds: { warning: number; danger: number; invert?: boolean }): string {
  const { warning, danger, invert = false } = thresholds;
  if (invert) {
    if (value >= warning) return CHART_COLORS.SEM_SUCCESS;
    if (value >= danger) return CHART_COLORS.SEM_WARNING;
    return CHART_COLORS.SEM_DANGER;
  }
  if (value <= warning) return CHART_COLORS.SEM_SUCCESS;
  if (value <= danger) return CHART_COLORS.SEM_WARNING;
  return CHART_COLORS.SEM_DANGER;
}