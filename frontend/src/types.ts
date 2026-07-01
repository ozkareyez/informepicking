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
