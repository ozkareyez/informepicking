export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Order {
  id: number;
  date: string;
  cliente: string;
  sku: string;
  kg: number;
  operator: string;
  start_time: string;
  end_time: string | null;
  type: 'Masivo' | 'Venta Directa';
  status: 'sin_operario' | 'pending' | 'completed' | 'despachado';
  time_spent: string | null;
  kg_per_hour: number | null;
  efficiency: number | null;
  plc: string | null;
  placa: string | null;
  cargue_start: string | null;
  cargue_end: string | null;
  cargue_time: string | null;
  despachado_kg: number;
  created_by: string;
  created_at: string;
}

export interface Despacho {
  id: number;
  order_id: number;
  ruta: string;
  placa: string;
  plc: string;
  kg: number;
  date: string;
  cargue_start: string;
  cargue_end: string;
  cargue_time: string;
  created_by: string;
  created_at: string;
}

export interface OrderFormData {
  date: string;
  cliente: string;
  sku: string;
  kg: number;
  operator: string;
  start_time: string;
  type: 'Masivo' | 'Venta Directa';
}

export interface RegisterOrderData {
  date: string;
  cliente: string;
  sku: string;
  kg: number;
  type: 'Masivo' | 'Venta Directa';
}

export interface CompleteOrderData {
  end_time: string;
}

export interface DashboardData {
  total_orders: number;
  total_kg: number;
  avg_kg_per_hour: number;
  avg_efficiency: number;
  total_hours: number;
  kgByOperator: { operator: string; total_kg: number; avg_kg_per_hour: number; avg_efficiency: number; total_orders: number }[];
  productionByDay: { date: string; total_kg: number; total_orders: number; avg_efficiency: number }[];
  productionByType: { type: string; total_kg: number; total_orders: number; avg_efficiency: number }[];
  despachos: { total_kg: number; total_vehiculos: number; total_rutas: number; avg_kg_per_hour: number; avg_efficiency: number };
  descargues: { total_kg: number; total_ptm: number; total_hours: number; avg_kg_per_hour: number; avg_efficiency: number };
}

export interface StatisticsData {
  stats: {
    operator: string;
    total_orders: number;
    total_kg: number;
    total_hours: number;
    avg_kg_per_hour: number;
    avg_efficiency: number;
  }[];
  bestDay: { date: string; total_kg: number } | null;
  bestEfficiency: { best_efficiency: number } | null;
  operators: { operator: string }[];
}

export interface Client {
  cliente: string;
}

export interface Operator {
  id: number;
  name: string;
  created_at: string;
}

export interface Unloading {
  id: number;
  date: string;
  ptm: string;
  kg: number;
  operators: string[];
  start_time: string;
  end_time: string;
  time_spent: string | null;
  novedad: string | null;
  novedad_resuelta: boolean;
  created_by: string;
  created_at: string;
}

export interface UnloadingFormData {
  date: string;
  ptm: string;
  kg: number;
  operators: string[];
  start_time: string;
  end_time: string;
  novedad?: string;
}

export interface CitaCargue {
  id: number;
  ruta: string;
  placa: string;
  kg: number;
  tipo: 'Masivo' | 'Venta Directa';
  hora_cita: string;
  hora_llegada: string | null;
  retraso_minutos: number | null;
  cumplio_cita: boolean | null;
  observaciones: string | null;
  ruta_cargada: boolean;
  plc: string | null;
  created_by: string;
  created_at: string;
}

export interface CitaCargueFormData {
  ruta: string;
  placa: string;
  kg: number;
  tipo: 'Masivo' | 'Venta Directa';
  hora_cita: string;
  hora_llegada?: string | null;
  retraso_minutos?: number | null;
  cumplio_cita?: boolean | null;
  observaciones?: string;
  ruta_cargada?: boolean;
  plc?: string | null;
}
