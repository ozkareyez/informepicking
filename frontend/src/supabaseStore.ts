import { supabase } from './supabase';
import type { Order, RegisterOrderData, OrderFormData, DashboardData, StatisticsData, Client } from './types';
import { calculateTimeSpent, calculateHours, calculateKgPerHour, calculateEfficiency, calculateCargueTime } from './utils';

function mapOrder(row: any): Order {
  return {
    id: row.id,
    date: row.date,
    cliente: row.cliente,
    sku: row.sku,
    kg: Number(row.kg),
    operator: row.operator ?? '',
    start_time: row.start_time ?? '',
    end_time: row.end_time,
    type: row.type,
    status: row.status,
    time_spent: row.time_spent,
    kg_per_hour: row.kg_per_hour ? Number(row.kg_per_hour) : null,
    efficiency: row.efficiency ? Number(row.efficiency) : null,
    plc: row.plc ?? null,
    placa: row.placa ?? null,
    cargue_start: row.cargue_start ?? null,
    cargue_end: row.cargue_end ?? null,
    cargue_time: row.cargue_time ?? null,
    created_at: row.created_at,
  };
}

export async function getOrders(params: {
  cliente?: string;
  date?: string;
  type?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
} = {}): Promise<Order[]> {
  let query = supabase.from('orders').select('*');

  if (params.cliente) query = query.ilike('cliente', `%${params.cliente}%`);
  if (params.date) query = query.eq('date', params.date);
  if (params.type) query = query.eq('type', params.type);
  if (params.status) query = query.eq('status', params.status);

  const sortCol = params.sortBy || 'created_at';
  const sortDir = params.sortOrder === 'desc' ? false : true;
  query = query.order(sortCol as any, { ascending: sortDir });

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map(mapOrder);
}

export async function getPendingOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from('orders').select('*').eq('status', 'pending');
  if (error) throw new Error(error.message);
  return (data || []).map(mapOrder);
}

export async function getUnassignedOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from('orders').select('*').eq('status', 'sin_operario');
  if (error) throw new Error(error.message);
  return (data || []).map(mapOrder);
}

export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase.from('orders').select('cliente');
  if (error) throw new Error(error.message);
  const set = new Set<string>();
  for (const row of data || []) {
    if (row.cliente) set.add(row.cliente);
  }
  return Array.from(set).sort().map(c => ({ cliente: c }));
}

export async function createOrder(data: RegisterOrderData): Promise<Order> {
  const { data: row, error } = await supabase.from('orders').insert({
    date: data.date,
    cliente: data.cliente,
    sku: data.sku,
    kg: data.kg,
    type: data.type,
    operator: '',
    start_time: '',
    status: 'sin_operario',
  }).select().single();
  if (error) throw new Error(error.message);
  return mapOrder(row);
}

export async function assignOperator(id: number, operator: string, start_time: string): Promise<Order> {
  const { data: row, error } = await supabase.from('orders').update({
    operator,
    start_time,
    status: 'pending',
  }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return mapOrder(row);
}

export async function completeOrder(id: number, end_time: string): Promise<Order> {
  const { data: current, error: fetchError } = await supabase.from('orders').select('*').eq('id', id).single();
  if (fetchError) throw new Error('Pedido no encontrado');

  const order = mapOrder(current);
  const hours = calculateHours(order.start_time, end_time);
  const kgph = calculateKgPerHour(order.kg, hours);

  const { data: row, error } = await supabase.from('orders').update({
    end_time,
    time_spent: calculateTimeSpent(order.start_time, end_time),
    kg_per_hour: kgph,
    efficiency: calculateEfficiency(kgph),
    status: 'completed',
  }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return mapOrder(row);
}

export async function updateOrder(id: number, data: OrderFormData & { end_time: string }): Promise<Order> {
  const hours = calculateHours(data.start_time, data.end_time);
  const kgph = calculateKgPerHour(data.kg, hours);

  const { data: row, error } = await supabase.from('orders').update({
    date: data.date,
    cliente: data.cliente,
    sku: data.sku,
    kg: data.kg,
    operator: data.operator,
    start_time: data.start_time,
    end_time: data.end_time,
    type: data.type,
    status: 'completed',
    time_spent: calculateTimeSpent(data.start_time, data.end_time),
    kg_per_hour: kgph,
    efficiency: calculateEfficiency(kgph),
  }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return mapOrder(row);
}

export async function deleteOrder(id: number): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getDashboard(): Promise<DashboardData> {
  const { data, error } = await supabase.from('orders').select('*').eq('status', 'completed');
  if (error) throw new Error(error.message);
  const completed = (data || []).map(mapOrder);

  const totalOrders = completed.length;
  const totalKg = completed.reduce((s, o) => s + o.kg, 0);
  const avgKgPerHour = totalOrders > 0 ? completed.reduce((s, o) => s + (o.kg_per_hour ?? 0), 0) / totalOrders : 0;
  const avgEfficiency = totalOrders > 0 ? completed.reduce((s, o) => s + (o.efficiency ?? 0), 0) / totalOrders : 0;
  const totalHours = completed.reduce((s, o) => {
    const m = o.time_spent?.match(/(\d+)h\s*(\d+)m/);
    return m ? s + parseInt(m[1]) + parseInt(m[2]) / 60 : s;
  }, 0);

  const opMap = new Map<string, { total_kg: number; total_orders: number; sum_kgph: number; sum_eff: number }>();
  const dayMap = new Map<string, { total_kg: number; total_orders: number; sum_eff: number }>();
  const typeMap = new Map<string, { total_kg: number; total_orders: number; sum_eff: number }>();

  for (const o of completed) {
    let op = opMap.get(o.operator);
    if (!op) { op = { total_kg: 0, total_orders: 0, sum_kgph: 0, sum_eff: 0 }; opMap.set(o.operator, op); }
    op.total_kg += o.kg; op.total_orders++; op.sum_kgph += o.kg_per_hour ?? 0; op.sum_eff += o.efficiency ?? 0;

    let d = dayMap.get(o.date);
    if (!d) { d = { total_kg: 0, total_orders: 0, sum_eff: 0 }; dayMap.set(o.date, d); }
    d.total_kg += o.kg; d.total_orders++; d.sum_eff += o.efficiency ?? 0;

    let t = typeMap.get(o.type);
    if (!t) { t = { total_kg: 0, total_orders: 0, sum_eff: 0 }; typeMap.set(o.type, t); }
    t.total_kg += o.kg; t.total_orders++; t.sum_eff += o.efficiency ?? 0;
  }

  return {
    total_orders: totalOrders, total_kg: totalKg,
    avg_kg_per_hour: avgKgPerHour, avg_efficiency: avgEfficiency, total_hours: totalHours,
    kgByOperator: Array.from(opMap.entries()).map(([operator, d]) => ({
      operator, total_kg: d.total_kg, total_orders: d.total_orders,
      avg_kg_per_hour: d.total_orders > 0 ? Math.round((d.sum_kgph / d.total_orders) * 100) / 100 : 0,
      avg_efficiency: d.total_orders > 0 ? Math.round((d.sum_eff / d.total_orders) * 100) / 100 : 0,
    })).sort((a, b) => b.total_kg - a.total_kg),
    productionByDay: Array.from(dayMap.entries()).map(([date, d]) => ({
      date, total_kg: d.total_kg, total_orders: d.total_orders,
      avg_efficiency: d.total_orders > 0 ? Math.round((d.sum_eff / d.total_orders) * 100) / 100 : 0,
    })).sort((a, b) => a.date.localeCompare(b.date)),
    productionByType: Array.from(typeMap.entries()).map(([type, d]) => ({
      type, total_kg: d.total_kg, total_orders: d.total_orders,
      avg_efficiency: d.total_orders > 0 ? Math.round((d.sum_eff / d.total_orders) * 100) / 100 : 0,
    })),
  };
}

export async function getStatistics(params: { operator?: string; period?: string; date?: string } = {}): Promise<StatisticsData> {
  let query = supabase.from('orders').select('*').eq('status', 'completed');

  if (params.operator) query = query.eq('operator', params.operator);
  if (params.period && params.date) {
    if (params.period === 'day') {
      query = query.eq('date', params.date);
    } else if (params.period === 'month') {
      const prefix = params.date.slice(0, 7);
      query = query.gte('date', `${prefix}-01`).lte('date', `${prefix}-31`);
    } else if (params.period === 'year') {
      const prefix = params.date.slice(0, 4);
      query = query.gte('date', `${prefix}-01-01`).lte('date', `${prefix}-12-31`);
    } else if (params.period === 'week') {
      const d = new Date(params.date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      query = query.gte('date', monday.toISOString().split('T')[0]).lte('date', sunday.toISOString().split('T')[0]);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const orders = (data || []).map(mapOrder);

  const opMap = new Map<string, { total_orders: number; total_kg: number; total_hours: number; sum_kgph: number; sum_eff: number }>();
  for (const o of orders) {
    let op = opMap.get(o.operator);
    if (!op) { op = { total_orders: 0, total_kg: 0, total_hours: 0, sum_kgph: 0, sum_eff: 0 }; opMap.set(o.operator, op); }
    op.total_orders++; op.total_kg += o.kg;
    const m = o.time_spent?.match(/(\d+)h\s*(\d+)m/);
    if (m) op.total_hours += parseInt(m[1]) + parseInt(m[2]) / 60;
    op.sum_kgph += o.kg_per_hour ?? 0; op.sum_eff += o.efficiency ?? 0;
  }

  const stats = Array.from(opMap.entries()).map(([operator, d]) => ({
    operator, total_orders: d.total_orders, total_kg: d.total_kg, total_hours: Math.round(d.total_hours * 100) / 100,
    avg_kg_per_hour: d.total_orders > 0 ? Math.round((d.sum_kgph / d.total_orders) * 100) / 100 : 0,
    avg_efficiency: d.total_orders > 0 ? Math.round((d.sum_eff / d.total_orders) * 100) / 100 : 0,
  })).sort((a, b) => b.total_kg - a.total_kg);

  const dayKg = new Map<string, number>();
  for (const o of orders) dayKg.set(o.date, (dayKg.get(o.date) || 0) + o.kg);
  let bestDay: { date: string; total_kg: number } | null = null;
  for (const [date, kg] of dayKg) if (!bestDay || kg > bestDay.total_kg) bestDay = { date, total_kg: kg };

  const bestEff = orders.reduce((max, o) => Math.max(max, o.efficiency ?? 0), 0);

  const { data: allOps } = await supabase.from('orders').select('operator').neq('operator', '');
  const operators = Array.from(new Set((allOps || []).map((r: any) => r.operator).filter(Boolean))).sort().map(o => ({ operator: o }));

  return { stats, bestDay, bestEfficiency: bestEff > 0 ? { best_efficiency: bestEff } : null, operators };
}

export async function getOrdersForDispatch(): Promise<Order[]> {
  const { data, error } = await supabase.from('orders').select('*').eq('status', 'completed');
  if (error) throw new Error(error.message);
  return (data || []).map(mapOrder);
}

export async function dispatchOrder(id: number, data: {
  plc: string;
  placa: string;
  cargue_start: string;
  cargue_end: string;
}): Promise<Order> {
  const cargue_time = calculateCargueTime(data.cargue_start, data.cargue_end);
  const { data: row, error } = await supabase.from('orders').update({
    plc: data.plc,
    placa: data.placa,
    cargue_start: data.cargue_start,
    cargue_end: data.cargue_end,
    cargue_time,
    status: 'despachado',
  }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return mapOrder(row);
}

export async function clearAllData(): Promise<void> {
  const { error } = await supabase.from('orders').delete().neq('id', 0);
  if (error) throw new Error(error.message);
}
