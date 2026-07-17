import { getSupabase } from './supabase';
import type { Order, RegisterOrderData, OrderFormData, DashboardData, StatisticsData, Client, Despacho, Unloading, UnloadingFormData, Operator, User, CitaCargue, CitaCargueFormData, Rack, RackFormData, RackUpdateData } from './types';

function getCurrentUser(): string {
  return localStorage.getItem('current_user') || '';
}
import { calculateTimeSpent, calculateHours, calculateKgPerHour, calculateEfficiency, calculateCargueEfficiency, calculateDescargueEfficiency, calculateCargueTime, parseTimeSpentToHours } from './utils';

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
    despachado_kg: Number(row.despachado_kg ?? 0),
    created_by: row.created_by ?? '',
    created_at: row.created_at,
  };
}

function mapDespacho(row: any): Despacho {
  return {
    id: row.id,
    order_id: row.order_id,
    ruta: row.ruta ?? '',
    placa: row.placa,
    plc: row.plc,
    kg: Number(row.kg),
    date: row.date ?? '',
    cargue_start: row.cargue_start,
    cargue_end: row.cargue_end,
    cargue_time: row.cargue_time,
    created_by: row.created_by ?? '',
    created_at: row.created_at,
    novedad: row.novedad ?? false,
    cantidad_referencias_novedad: Number(row.cantidad_referencias_novedad ?? 0),
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
  let query = getSupabase().from('orders').select('*');

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
  const { data, error } = await getSupabase().from('orders').select('*').eq('status', 'pending');
  if (error) throw new Error(error.message);
  return (data || []).map(mapOrder);
}

export async function getUnassignedOrders(): Promise<Order[]> {
  const { data, error } = await getSupabase().from('orders').select('*').eq('status', 'sin_operario');
  if (error) throw new Error(error.message);
  return (data || []).map(mapOrder);
}

export async function getClients(): Promise<Client[]> {
  const { data, error } = await getSupabase().from('orders').select('cliente');
  if (error) throw new Error(error.message);
  const set = new Set<string>();
  for (const row of data || []) {
    if (row.cliente) set.add(row.cliente);
  }
  return Array.from(set).sort().map(c => ({ cliente: c }));
}

export async function createOrder(data: RegisterOrderData): Promise<Order> {
  const { data: row, error } = await getSupabase().from('orders').insert({
    date: data.date,
    cliente: data.cliente,
    sku: data.sku,
    kg: data.kg,
    type: data.type,
    operator: '',
    start_time: '',
    status: 'sin_operario',
    created_by: getCurrentUser(),
  }).select().single();
  if (error) throw new Error(error.message);
  return mapOrder(row);
}

export async function createOrders(items: RegisterOrderData[]): Promise<number> {
  if (items.length === 0) return 0;
  const rows = items.map(d => ({
    date: d.date,
    cliente: d.cliente,
    sku: d.sku,
    kg: d.kg,
    type: d.type,
    operator: '',
    start_time: '',
    status: 'sin_operario' as const,
    created_by: getCurrentUser(),
  }));
  const { error } = await getSupabase().from('orders').insert(rows);
  if (error) throw new Error(error.message);
  return items.length;
}

export async function assignOperator(id: number, operator: string, start_time: string): Promise<Order> {
  const { data: row, error } = await getSupabase().from('orders').update({
    operator,
    start_time,
    status: 'pending',
  }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return mapOrder(row);
}

export async function completeOrder(id: number, end_time: string): Promise<Order> {
  const { data: current, error: fetchError } = await getSupabase().from('orders').select('*').eq('id', id).single();
  if (fetchError) throw new Error('Pedido no encontrado');

  const order = mapOrder(current);
  const hours = calculateHours(order.start_time, end_time);
  const kgph = calculateKgPerHour(order.kg, hours);

  const { data: row, error } = await getSupabase().from('orders').update({
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

  const { data: row, error } = await getSupabase().from('orders').update({
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
  const { error } = await getSupabase().from('orders').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

function getDateRange(period: string, date: string): { start: string; end: string } {
  if (period === 'day') {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    return { start: date, end: next.toISOString().split('T')[0] };
  }
  if (period === 'month') {
    const prefix = date.slice(0, 7);
    const d = new Date(`${prefix}-01`);
    const next = new Date(d);
    next.setMonth(next.getMonth() + 1);
    return { start: `${prefix}-01`, end: next.toISOString().split('T')[0] };
  }
  if (period === 'week') {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const next = new Date(sunday);
    next.setDate(next.getDate() + 1);
    return { start: monday.toISOString().split('T')[0], end: next.toISOString().split('T')[0] };
  }
  return { start: '', end: '' };
}

function applyDateFilter(query: any, period: string | undefined, date: string | undefined, column = 'date'): any {
  if (!period || !date) return query;
  if (period === 'day') return query.eq(column, date);
  if (period === 'month') {
    const prefix = date.slice(0, 7);
    return query.gte(column, `${prefix}-01`).lte(column, `${prefix}-31`);
  }
  if (period === 'week') {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return query.gte(column, monday.toISOString().split('T')[0]).lte(column, sunday.toISOString().split('T')[0]);
  }
  return query;
}

export async function getDashboard(params: { period?: string; date?: string } = {}): Promise<DashboardData> {
  console.log('🔍 getDashboard called with params:', params);
  let orderQuery = getSupabase().from('orders').select('*').in('status', ['completed', 'despachado']);
  orderQuery = applyDateFilter(orderQuery, params.period, params.date);
  const { data: orderData, error: orderError } = await orderQuery;
  if (orderError) throw new Error(orderError.message);
  const completed = (orderData || []).map(mapOrder);
  console.log('📦 Orders fetched:', completed.length, completed);

  let despQuery = getSupabase().from('despachos').select('*');
  if (params.period && params.date) {
    const { start, end } = getDateRange(params.period, params.date);
    despQuery = despQuery.gte('created_at', start).lt('created_at', end);
  }
  const { data: despData } = await despQuery;
  const despachos = (despData || []).map(mapDespacho);
  console.log('🚚 Despachos fetched:', despachos.length, despachos);

  let uncQuery = getSupabase().from('unloadings').select('*');
  uncQuery = applyDateFilter(uncQuery, params.period, params.date);
  const { data: uncData } = await uncQuery;
  const unloadings = (uncData || []).map(mapUnloading);
  console.log('📦 Unloadings fetched:', unloadings.length, unloadings);

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

  const despKg = despachos.reduce((s, d) => s + d.kg, 0);
  const despVehiculos = despachos.length;
  const despRutas = new Set(despachos.map(d => d.ruta).filter(Boolean)).size;
  const despHours = despachos.reduce((s, d) => s + parseTimeSpentToHours(d.cargue_time), 0);
  const despKgPerHour = despHours > 0 ? despKg / despHours : 0;
  const despEfficiency = calculateCargueEfficiency(despKgPerHour);

  const uncKg = unloadings.reduce((s, u) => s + u.kg, 0);
  const uncPtm = unloadings.length;
  const uncHours = unloadings.reduce((s, u) => s + parseTimeSpentToHours(u.time_spent), 0);
  const uncKgPerHour = uncHours > 0 ? uncKg / uncHours : 0;
  const uncEfficiency = calculateDescargueEfficiency(uncKgPerHour);

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
    despachos: {
      total_kg: despKg, total_vehiculos: despVehiculos, total_rutas: despRutas,
      avg_kg_per_hour: Math.round(despKgPerHour * 100) / 100,
      avg_efficiency: Math.round(despEfficiency * 100) / 100,
    },
    descargues: {
      total_kg: uncKg, total_ptm: uncPtm, total_hours: Math.round(uncHours * 100) / 100,
      avg_kg_per_hour: Math.round(uncKgPerHour * 100) / 100,
      avg_efficiency: Math.round(uncEfficiency * 100) / 100,
    },
  };
}

export async function getStatistics(params: { operator?: string; period?: string; date?: string } = {}): Promise<StatisticsData> {
  let query = getSupabase().from('orders').select('*').in('status', ['completed', 'despachado']);

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

  const { data: allOps } = await getSupabase().from('orders').select('operator').neq('operator', '');
  const operators = Array.from(new Set((allOps || []).map((r: any) => r.operator).filter(Boolean))).sort().map(o => ({ operator: o }));

  return { stats, bestDay, bestEfficiency: bestEff > 0 ? { best_efficiency: bestEff } : null, operators };
}

export async function getOrdersForDispatch(): Promise<Order[]> {
  const { data, error } = await getSupabase().from('orders').select('*').eq('status', 'completed');
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
  const { data: row, error } = await getSupabase().from('orders').update({
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

// ─── Despachos ──────────────────────────────────────────────────

export async function getDespachos(orderId: number): Promise<Despacho[]> {
  const { data, error } = await getSupabase().from('despachos').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(mapDespacho);
}

export async function createDespacho(orderId: number, data: {
  placa: string;
  plc: string;
  kg: number;
  date: string;
  cargue_start: string;
  cargue_end: string;
  ruta?: string;
  novedad?: boolean;
  cantidad_referencias_novedad?: number;
}): Promise<Despacho> {
  const cargue_time = calculateCargueTime(data.cargue_start, data.cargue_end);

  const { data: despacho, error: insertError } = await getSupabase().from('despachos').insert({
    order_id: orderId,
    ruta: data.ruta ?? '',
    placa: data.placa,
    plc: data.plc,
    kg: data.kg,
    date: data.date,
    cargue_start: data.cargue_start,
    cargue_end: data.cargue_end,
    cargue_time,
    created_by: getCurrentUser(),
    novedad: data.novedad ?? false,
    cantidad_referencias_novedad: data.cantidad_referencias_novedad ?? 0,
  }).select().single();
  if (insertError) throw new Error(insertError.message);

  const { data: order } = await getSupabase().from('orders').select('kg, despachado_kg').eq('id', orderId).single();
  const newDespachado = Number(order?.despachado_kg ?? 0) + data.kg;
  const totalKg = Number(order?.kg ?? 0);
  const newStatus = newDespachado >= totalKg ? 'despachado' : 'completed';

  await getSupabase().from('orders').update({
    despachado_kg: newDespachado,
    status: newStatus,
  }).eq('id', orderId);

  return mapDespacho(despacho);
}

// ─── Todos los despachos (para Excel) ─────────────────────────

export async function getAllDespachos(): Promise<Despacho[]> {
  const { data, error } = await getSupabase().from('despachos').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapDespacho);
}

// ─── Descargue de contenedores ────────────────────────────────

function mapUnloading(row: any): Unloading {
  return {
    id: row.id,
    date: row.date,
    ptm: row.ptm,
    kg: Number(row.kg),
    operators: row.operators ?? [],
    start_time: row.start_time ?? '',
    end_time: row.end_time ?? '',
    time_spent: row.time_spent ?? null,
    novedad: row.novedad ?? null,
    novedad_resuelta: row.novedad_resuelta ?? false,
    created_by: row.created_by ?? '',
    created_at: row.created_at,
  };
}

export async function getUnloadings(): Promise<Unloading[]> {
  const { data, error } = await getSupabase().from('unloadings').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapUnloading);
}

export async function createUnloading(data: UnloadingFormData): Promise<Unloading> {
  const time_spent = calculateTimeSpent(data.start_time, data.end_time);
  const { data: row, error } = await getSupabase().from('unloadings').insert({
    date: data.date,
    ptm: data.ptm,
    kg: data.kg,
    operators: data.operators,
    start_time: data.start_time,
    end_time: data.end_time,
    time_spent,
    novedad: data.novedad || null,
    novedad_resuelta: false,
    created_by: getCurrentUser(),
  }).select().single();
  if (error) throw new Error(error.message);
  return mapUnloading(row);
}

export async function updateUnloadingNovedad(id: number, novedad: string, resuelta: boolean): Promise<void> {
  const { error } = await getSupabase().from('unloadings').update({
    novedad,
    novedad_resuelta: resuelta,
  }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteUnloading(id: number): Promise<void> {
  const { error } = await getSupabase().from('unloadings').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Operadores ──────────────────────────────────────────────────

export async function updateOperator(id: number, newName: string): Promise<void> {
  const { data: op, error: fetchError } = await getSupabase().from('operators').select('name').eq('id', id).single();
  if (fetchError) throw new Error(fetchError.message);
  const oldName = op.name;
  if (oldName === newName) return;
  const { error: updateError } = await getSupabase().from('operators').update({ name: newName }).eq('id', id);
  if (updateError) throw new Error(updateError.message);
  const { error: orderError } = await getSupabase().from('orders').update({ operator: newName }).eq('operator', oldName);
  if (orderError) throw new Error(orderError.message);
}

export async function getOperators(): Promise<Operator[]> {
  const { data, error } = await getSupabase().from('operators').select('*').order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({ id: r.id, name: r.name, created_at: r.created_at }));
}

export async function createOperator(name: string): Promise<Operator> {
  const { data, error } = await getSupabase().from('operators').insert({ name }).select().single();
  if (error) throw new Error(error.message);
  return { id: data.id, name: data.name, created_at: data.created_at };
}

export async function deleteOperator(id: number): Promise<void> {
  const { error } = await getSupabase().from('operators').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Limpiar ────────────────────────────────────────────────────

// ─── Autenticación ───────────────────────────────────────────────

export async function login(username: string, password: string): Promise<User | null> {
  const { data, error } = await getSupabase().from('usuarios').select('id, username, created_at')
    .eq('username', username)
    .eq('password', password)
    .single();
  if (error || !data) return null;
  return { id: data.id, username: data.username, created_at: data.created_at };
}

export async function clearAllData(): Promise<void> {
  await getSupabase().from('despachos').delete().neq('id', 0);
  await getSupabase().from('unloadings').delete().neq('id', 0);
  const { error } = await getSupabase().from('orders').delete().neq('id', 0);
  if (error) throw new Error(error.message);
}

export async function deleteOrdersByDateRange(startDate: string, endDate: string): Promise<void> {
  const { data: ordersToDelete, error: selectError } = await getSupabase().from('orders').select('id').gte('date', startDate).lte('date', endDate);
  if (selectError) throw new Error(`Error al buscar pedidos: ${selectError.message}`);

  if (ordersToDelete && ordersToDelete.length > 0) {
    const ids = ordersToDelete.map(o => o.id);
    const { error: despError } = await getSupabase().from('despachos').delete().in('order_id', ids);
    if (despError) throw new Error(`Error al eliminar despachos: ${despError.message}`);
    const { error: ordError } = await getSupabase().from('orders').delete().in('id', ids);
    if (ordError) throw new Error(`Error al eliminar pedidos: ${ordError.message}`);
  }

  const { error: uncError } = await getSupabase().from('unloadings').delete().gte('date', startDate).lte('date', endDate);
  if (uncError) throw new Error(`Error al eliminar descargues: ${uncError.message}`);
}
// ─── Citas de cargue ─────────────────────────────────────────────

function mapCitaCargue(row: any): CitaCargue {
  return {
    id: row.id,
    ruta: row.ruta,
    placa: row.placa,
    kg: row.kg,
    tipo: row.tipo,
    hora_cita: row.hora_cita,
    hora_llegada: row.hora_llegada,
    retraso_minutos: row.retraso_minutos,
    cumplio_cita: row.cumplio_cita,
    ruta_cargada: row.ruta_cargada,
    plc: row.plc,
    observaciones: row.observaciones,
    created_by: row.created_by ?? '',
    created_at: row.created_at,
  };
}

export async function getCitasCargue(): Promise<CitaCargue[]> {
  const { data, error } = await getSupabase().from('citas_cargue').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapCitaCargue);
}

export async function createCitaCargue(data: CitaCargueFormData): Promise<CitaCargue> {
  // Calculate delay if arrival time is provided
  let retraso_minutos = null;
  let cumplio_cita = null;
  if (data.hora_llegada && data.hora_cita) {
    const [citaH, citaM] = data.hora_cita.split(':').map(Number);
    const [llegH, llegM] = data.hora_llegada.split(':').map(Number);
    const citaMin = citaH * 60 + citaM;
    const llegMin = llegH * 60 + llegM;
    retraso_minutos = llegMin - citaMin;
    cumplio_cita = retraso_minutos <= 0;
  }

  const { data: row, error } = await getSupabase().from('citas_cargue').insert({
    ruta: data.ruta,
    placa: data.placa,
    kg: data.kg,
    tipo: data.tipo,
    hora_cita: data.hora_cita,
    hora_llegada: data.hora_llegada ?? null,
    retraso_minutos,
    cumplio_cita,
    observaciones: data.observaciones ?? null,
    created_by: getCurrentUser(),
  }).select().single();
  if (error) throw new Error(error.message);
  return mapCitaCargue(row);
}

export async function updateCitaCargue(id: number, data: Partial<CitaCargueFormData>): Promise<void> {
  const updateData: any = {};
  if (data.ruta !== undefined) updateData.ruta = data.ruta;
  if (data.placa !== undefined) updateData.placa = data.placa;
  if (data.kg !== undefined) updateData.kg = data.kg;
  if (data.tipo !== undefined) updateData.tipo = data.tipo;
  if (data.hora_cita !== undefined) updateData.hora_cita = data.hora_cita;
  if (data.hora_llegada !== undefined) updateData.hora_llegada = data.hora_llegada;
  if (data.cumplio_cita !== undefined) updateData.cumplio_cita = data.cumplio_cita;
  if (data.observaciones !== undefined) updateData.observaciones = data.observaciones;
  if (data.plc !== undefined) updateData.plc = data.plc;
  if (data.ruta_cargada !== undefined) updateData.ruta_cargada = data.ruta_cargada;

  // Calculate delay if arrival time and appointment time are provided
  if (data.hora_llegada && data.hora_cita) {
    const [citaH, citaM] = data.hora_cita.split(':').map(Number);
    const [llegH, llegM] = data.hora_llegada.split(':').map(Number);
    const citaMin = citaH * 60 + citaM;
    const llegMin = llegH * 60 + llegM;
    updateData.retraso_minutos = llegMin - citaMin;
    updateData.cumplio_cita = updateData.retraso_minutos <= 0;
  } else if (data.hora_llegada && updateData.hora_cita) {
    const [citaH, citaM] = updateData.hora_cita.split(':').map(Number);
    const [llegH, llegM] = data.hora_llegada.split(':').map(Number);
    const citaMin = citaH * 60 + citaM;
    const llegMin = llegH * 60 + llegM;
    updateData.retraso_minutos = llegMin - citaMin;
    updateData.cumplio_cita = updateData.retraso_minutos <= 0;
  } else if (data.hora_llegada && !updateData.hora_cita) {
    // Need to fetch existing hora_cita
    const { data: existing } = await getSupabase().from('citas_cargue').select('hora_cita').eq('id', id).single();
    if (existing?.hora_cita) {
      const [citaH, citaM] = existing.hora_cita.split(':').map(Number);
      const [llegH, llegM] = data.hora_llegada.split(':').map(Number);
      const citaMin = citaH * 60 + citaM;
      const llegMin = llegH * 60 + llegM;
      updateData.retraso_minutos = llegMin - citaMin;
      updateData.cumplio_cita = updateData.retraso_minutos <= 0;
    }
  }

  const { error } = await getSupabase().from('citas_cargue').update(updateData).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteCitaCargue(id: number): Promise<void> {
  const { error } = await getSupabase().from('citas_cargue').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Racks / Bodega ────────────────────────────────────────────────

function mapRack(row: any): Rack {
  return {
    id: row.id,
    codigo: row.codigo,
    posiciones: Number(row.posiciones),
    ocupacion: Number(row.ocupacion),
    disponible: Number(row.disponible),
    porcentaje_ocupacion: Number(row.porcentaje_ocupacion),
    updated_at: row.updated_at,
    updated_by: row.updated_by ?? '',
  };
}

export async function getRacks(): Promise<Rack[]> {
  const { data, error } = await getSupabase().from('racks').select('*').order('codigo', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(mapRack);
}

export async function createRack(data: RackFormData): Promise<Rack> {
  const { data: rack, error } = await getSupabase().from('racks').insert({
    codigo: data.codigo.toUpperCase(),
    posiciones: data.posiciones,
    ocupacion: data.ocupacion,
    updated_by: getCurrentUser(),
  }).select().single();
  if (error) throw new Error(error.message);
  return mapRack(rack);
}

export async function updateRack(id: number, data: { ocupacion: number }): Promise<void> {
  const updateData: any = { 
    ocupacion: data.ocupacion,
    updated_by: getCurrentUser() 
  };

  const { error } = await getSupabase().from('racks').update(updateData).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteRack(id: number): Promise<void> {
  const { error } = await getSupabase().from('racks').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
