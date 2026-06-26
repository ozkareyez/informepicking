import type { Order, OrderFormData, DashboardData, StatisticsData, Client } from './types';
import { calculateTimeSpent, calculateHours, calculateKgPerHour, calculateEfficiency } from './utils';

const STORAGE_KEY = 'pedidos_orders';

function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOrders(orders: Order[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

let nextId = 1;
function ensureNextId(orders: Order[]) {
  const max = orders.reduce((m, o) => Math.max(m, o.id), 0);
  if (max >= nextId) nextId = max + 1;
}

// ─── Public API ────────────────────────────────────────────────

export async function getOrders(params: {
  search?: string;
  operator?: string;
  date?: string;
  type?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
} = {}): Promise<Order[]> {
  let orders = loadOrders();

  if (params.search) {
    const q = params.search.toLowerCase();
    orders = orders.filter(o => o.sku.toLowerCase().includes(q));
  }
  if (params.operator) {
    const q = params.operator.toLowerCase();
    orders = orders.filter(o => o.operator.toLowerCase().includes(q));
  }
  if (params.date) {
    orders = orders.filter(o => o.date === params.date);
  }
  if (params.type) {
    orders = orders.filter(o => o.type === params.type);
  }
  if (params.status) {
    orders = orders.filter(o => o.status === params.status);
  }

  if (params.sortBy) {
    const desc = params.sortOrder === 'desc';
    orders.sort((a: any, b: any) => {
      const av = a[params.sortBy!] ?? '';
      const bv = b[params.sortBy!] ?? '';
      if (typeof av === 'number') return desc ? bv - av : av - bv;
      return desc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
  } else {
    orders.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  }

  return orders;
}

export async function getPendingOrders(): Promise<Order[]> {
  return loadOrders().filter(o => o.status === 'pending');
}

export async function getClients(): Promise<Client[]> {
  const clients = new Set<string>();
  for (const o of loadOrders()) {
    if (o.cliente) clients.add(o.cliente);
  }
  return Array.from(clients).sort().map(c => ({ cliente: c }));
}

export async function createOrder(data: OrderFormData): Promise<Order> {
  const orders = loadOrders();
  ensureNextId(orders);
  const order: Order = {
    id: nextId++,
    date: data.date,
    cliente: data.cliente,
    sku: data.sku,
    kg: data.kg,
    operator: data.operator,
    start_time: data.start_time,
    end_time: null,
    type: data.type,
    status: 'pending',
    time_spent: null,
    kg_per_hour: null,
    efficiency: null,
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
  orders.push(order);
  saveOrders(orders);
  return order;
}

export async function completeOrder(id: number, end_time: string): Promise<Order> {
  const orders = loadOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) throw new Error('Pedido no encontrado');
  const order = orders[idx];
  if (order.status !== 'pending') throw new Error('El pedido ya está completado');

  const hours = calculateHours(order.start_time, end_time);
  const kgph = calculateKgPerHour(order.kg, hours);
  order.end_time = end_time;
  order.time_spent = calculateTimeSpent(order.start_time, end_time);
  order.kg_per_hour = kgph;
  order.efficiency = calculateEfficiency(kgph);
  order.status = 'completed';
  saveOrders(orders);
  return order;
}

export async function updateOrder(id: number, data: OrderFormData & { end_time: string }): Promise<Order> {
  const orders = loadOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) throw new Error('Pedido no encontrado');

  const hours = calculateHours(data.start_time, data.end_time);
  const kgph = calculateKgPerHour(data.kg, hours);
  orders[idx] = {
    ...orders[idx],
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
  };
  saveOrders(orders);
  return orders[idx];
}

export async function deleteOrder(id: number): Promise<void> {
  const orders = loadOrders().filter(o => o.id !== id);
  saveOrders(orders);
}

export async function getDashboard(): Promise<DashboardData> {
  const completed = loadOrders().filter(o => o.status === 'completed');
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
    // Operator
    let op = opMap.get(o.operator);
    if (!op) { op = { total_kg: 0, total_orders: 0, sum_kgph: 0, sum_eff: 0 }; opMap.set(o.operator, op); }
    op.total_kg += o.kg;
    op.total_orders++;
    op.sum_kgph += o.kg_per_hour ?? 0;
    op.sum_eff += o.efficiency ?? 0;

    // Day
    let d = dayMap.get(o.date);
    if (!d) { d = { total_kg: 0, total_orders: 0, sum_eff: 0 }; dayMap.set(o.date, d); }
    d.total_kg += o.kg;
    d.total_orders++;
    d.sum_eff += o.efficiency ?? 0;

    // Type
    let t = typeMap.get(o.type);
    if (!t) { t = { total_kg: 0, total_orders: 0, sum_eff: 0 }; typeMap.set(o.type, t); }
    t.total_kg += o.kg;
    t.total_orders++;
    t.sum_eff += o.efficiency ?? 0;
  }

  const kgByOperator = Array.from(opMap.entries()).map(([operator, d]) => ({
    operator, total_kg: d.total_kg, total_orders: d.total_orders,
    avg_kg_per_hour: d.total_orders > 0 ? Math.round((d.sum_kgph / d.total_orders) * 100) / 100 : 0,
    avg_efficiency: d.total_orders > 0 ? Math.round((d.sum_eff / d.total_orders) * 100) / 100 : 0,
  })).sort((a, b) => b.total_kg - a.total_kg);

  const productionByDay = Array.from(dayMap.entries()).map(([date, d]) => ({
    date, total_kg: d.total_kg, total_orders: d.total_orders,
    avg_efficiency: d.total_orders > 0 ? Math.round((d.sum_eff / d.total_orders) * 100) / 100 : 0,
  })).sort((a, b) => a.date.localeCompare(b.date));

  const productionByType = Array.from(typeMap.entries()).map(([type, d]) => ({
    type, total_kg: d.total_kg, total_orders: d.total_orders,
    avg_efficiency: d.total_orders > 0 ? Math.round((d.sum_eff / d.total_orders) * 100) / 100 : 0,
  }));

  return { total_orders: totalOrders, total_kg: totalKg, avg_kg_per_hour: avgKgPerHour, avg_efficiency: avgEfficiency, total_hours: totalHours, kgByOperator, productionByDay, productionByType };
}

export async function getStatistics(params: { operator?: string; period?: string; date?: string } = {}): Promise<StatisticsData> {
  let orders = loadOrders().filter(o => o.status === 'completed');

  if (params.operator) {
    orders = orders.filter(o => o.operator === params.operator);
  }
  if (params.period && params.date) {
    if (params.period === 'day') {
      orders = orders.filter(o => o.date === params.date);
    } else if (params.period === 'month') {
      orders = orders.filter(o => o.date.startsWith(params.date!.slice(0, 7)));
    } else if (params.period === 'year') {
      orders = orders.filter(o => o.date.startsWith(params.date!.slice(0, 4)));
    } else if (params.period === 'week') {
      const d = new Date(params.date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      const mStr = monday.toISOString().split('T')[0];
      const sStr = sunday.toISOString().split('T')[0];
      orders = orders.filter(o => o.date >= mStr && o.date <= sStr);
    }
  }

  const opMap = new Map<string, { total_orders: number; total_kg: number; total_hours: number; sum_kgph: number; sum_eff: number }>();
  for (const o of orders) {
    let op = opMap.get(o.operator);
    if (!op) { op = { total_orders: 0, total_kg: 0, total_hours: 0, sum_kgph: 0, sum_eff: 0 }; opMap.set(o.operator, op); }
    op.total_orders++;
    op.total_kg += o.kg;
    const m = o.time_spent?.match(/(\d+)h\s*(\d+)m/);
    if (m) op.total_hours += parseInt(m[1]) + parseInt(m[2]) / 60;
    op.sum_kgph += o.kg_per_hour ?? 0;
    op.sum_eff += o.efficiency ?? 0;
  }

  const stats = Array.from(opMap.entries()).map(([operator, d]) => ({
    operator, total_orders: d.total_orders, total_kg: d.total_kg, total_hours: Math.round(d.total_hours * 100) / 100,
    avg_kg_per_hour: d.total_orders > 0 ? Math.round((d.sum_kgph / d.total_orders) * 100) / 100 : 0,
    avg_efficiency: d.total_orders > 0 ? Math.round((d.sum_eff / d.total_orders) * 100) / 100 : 0,
  })).sort((a, b) => b.total_kg - a.total_kg);

  const dayKg = new Map<string, number>();
  for (const o of orders) {
    dayKg.set(o.date, (dayKg.get(o.date) || 0) + o.kg);
  }
  let bestDay: { date: string; total_kg: number } | null = null;
  for (const [date, kg] of dayKg) {
    if (!bestDay || kg > bestDay.total_kg) bestDay = { date, total_kg: kg };
  }

  const bestEff = orders.reduce((max, o) => Math.max(max, o.efficiency ?? 0), 0);
  const operators = Array.from(new Set(loadOrders().map(o => o.operator))).sort().map(o => ({ operator: o }));

  return { stats, bestDay, bestEfficiency: bestEff > 0 ? { best_efficiency: bestEff } : null, operators };
}

export async function getAllClients(): Promise<string[]> {
  return Array.from(new Set(loadOrders().map(o => o.cliente).filter(Boolean))).sort();
}

export async function clearAllData(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY);
}
