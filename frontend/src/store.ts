import type { Order, OrderFormData, RegisterOrderData, DashboardData, StatisticsData, Client, Despacho, Unloading, UnloadingFormData, Operator, CitaCargue, CitaCargueFormData } from './types';
import { calculateTimeSpent, calculateHours, calculateKgPerHour, calculateEfficiency, calculateCargueTime } from './utils';

const STORAGE_KEY = 'pedidos_orders';
const DESPACHOS_KEY = 'pedidos_despachos';
const UNLOADINGS_KEY = 'pedidos_unloadings';
const CITAS_KEY = 'pedidos_citas';

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

let nextDespachoId = 1;
let nextUnloadingId = 1;

function loadDespachos(): Despacho[] {
  try { return JSON.parse(localStorage.getItem(DESPACHOS_KEY) || '[]'); } catch { return []; }
}
function saveDespachos(despachos: Despacho[]) { localStorage.setItem(DESPACHOS_KEY, JSON.stringify(despachos)); }

function ensureDespachoIds(despachos: Despacho[]) {
  const max = despachos.reduce((m, d) => Math.max(m, d.id), 0);
  if (max >= nextDespachoId) nextDespachoId = max + 1;
}

function loadUnloadings(): Unloading[] {
  try { return JSON.parse(localStorage.getItem(UNLOADINGS_KEY) || '[]'); } catch { return []; }
}
function saveUnloadings(unloadings: Unloading[]) { localStorage.setItem(UNLOADINGS_KEY, JSON.stringify(unloadings)); }

function ensureUnloadingIds(unloadings: Unloading[]) {
  const max = unloadings.reduce((m, u) => Math.max(m, u.id), 0);
  if (max >= nextUnloadingId) nextUnloadingId = max + 1;
}

// ─── Despachos ────────────────────────────────────────────────

export async function getDespachos(orderId: number): Promise<Despacho[]> {
  return loadDespachos().filter(d => d.order_id === orderId).sort((a, b) => a.id - b.id);
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

  const despachos = loadDespachos();
  ensureDespachoIds(despachos);
  const despacho: Despacho = {
    id: nextDespachoId++,
    order_id: orderId,
    ruta: data.ruta ?? '',
    placa: data.placa,
    plc: data.plc,
    kg: data.kg,
    date: data.date,
    cargue_start: data.cargue_start,
    cargue_end: data.cargue_end,
    cargue_time,
    created_by: localStorage.getItem('current_user') || '',
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    novedad: data.novedad ?? false,
    cantidad_referencias_novedad: data.cantidad_referencias_novedad ?? 0,
  };
  despachos.push(despacho);
  saveDespachos(despachos);

  const orders = loadOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx !== -1) {
    const order = orders[idx];
    order.despachado_kg += data.kg;
    if (order.despachado_kg >= order.kg) {
      order.status = 'despachado';
    }
    saveOrders(orders);
  }

  return despacho;
}

// ─── Public API ────────────────────────────────────────────────

export async function getOrders(params: {
  cliente?: string;
  date?: string;
  type?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
} = {}): Promise<Order[]> {
  let orders = loadOrders();

  if (params.cliente) {
    const q = params.cliente.toLowerCase();
    orders = orders.filter(o => o.cliente.toLowerCase().includes(q));
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

export async function getUnassignedOrders(): Promise<Order[]> {
  return loadOrders().filter(o => o.status === 'sin_operario');
}

export async function getClients(): Promise<Client[]> {
  const clients = new Set<string>();
  for (const o of loadOrders()) {
    if (o.cliente) clients.add(o.cliente);
  }
  return Array.from(clients).sort().map(c => ({ cliente: c }));
}

export async function createOrder(data: RegisterOrderData): Promise<Order> {
  const orders = loadOrders();
  ensureNextId(orders);
  const order: Order = {
    id: nextId++,
    date: data.date,
    cliente: data.cliente,
    sku: data.sku,
    kg: data.kg,
    operator: '',
    start_time: '',
    end_time: null,
    type: data.type,
    status: 'sin_operario',
    time_spent: null,
    kg_per_hour: null,
    efficiency: null,
    plc: null,
    placa: null,
    cargue_start: null,
    cargue_end: null,
    cargue_time: null,
    despachado_kg: 0,
    created_by: localStorage.getItem('current_user') || '',
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
  orders.push(order);
  saveOrders(orders);
  return order;
}

export async function createOrders(items: RegisterOrderData[]): Promise<number> {
  const orders = loadOrders();
  ensureNextId(orders);
  for (const d of items) {
    const order: Order = {
      id: nextId++,
      date: d.date,
      cliente: d.cliente,
      sku: d.sku,
      kg: d.kg,
      operator: '',
      start_time: '',
      end_time: null,
      type: d.type,
      status: 'sin_operario',
      time_spent: null,
      kg_per_hour: null,
      efficiency: null,
      plc: null,
      placa: null,
      cargue_start: null,
      cargue_end: null,
      cargue_time: null,
      despachado_kg: 0,
      created_by: localStorage.getItem('current_user') || '',
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    orders.push(order);
  }
  saveOrders(orders);
  return items.length;
}

export async function assignOperator(id: number, operator: string, start_time: string): Promise<Order> {
  const orders = loadOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) throw new Error('Pedido no encontrado');
  const order = orders[idx];
  if (order.status !== 'sin_operario') throw new Error('El pedido ya tiene un operario asignado');
  order.operator = operator;
  order.start_time = start_time;
  order.status = 'pending';
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

function filterByDate<T>(items: T[], period: string | undefined, date: string | undefined, key: (item: T) => string): T[] {
  if (!period || !date) return items;
  if (period === 'day') return items.filter(i => key(i) === date);
  if (period === 'month') {
    const prefix = date.slice(0, 7);
    return items.filter(i => key(i).startsWith(prefix));
  }
  if (period === 'week') {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const mStr = monday.toISOString().split('T')[0];
    const sStr = sunday.toISOString().split('T')[0];
    return items.filter(i => key(i) >= mStr && key(i) <= sStr);
  }
  return items;
}

export async function getDashboard(params: { period?: string; date?: string } = {}): Promise<DashboardData> {
  const allOrders = loadOrders().filter(o => o.status === 'completed');
  const completed = filterByDate(allOrders, params.period, params.date, o => o.date);

  const allDespachos = loadDespachos();
  const despachos = filterByDate(allDespachos, params.period, params.date, d => d.created_at.split('T')[0]);

  const allUnloadings = loadUnloadings();
  const unloadings = filterByDate(allUnloadings, params.period, params.date, u => u.date);

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

  const uncKg = unloadings.reduce((s, u) => s + u.kg, 0);
  const uncPtm = unloadings.length;
  const uncHours = unloadings.reduce((s, u) => {
    const m = u.time_spent?.match(/(\d+)h\s*(\d+)m/);
    return m ? s + parseInt(m[1]) + parseInt(m[2]) / 60 : s;
  }, 0);

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
    despachos: { total_kg: despKg, total_vehiculos: despVehiculos, total_rutas: despRutas, avg_kg_per_hour: 0, avg_efficiency: 0 },
    descargues: { total_kg: uncKg, total_ptm: uncPtm, total_hours: Math.round(uncHours * 100) / 100, avg_kg_per_hour: 0, avg_efficiency: 0 },
  };
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
  const operators = Array.from(new Set(loadOrders().map(o => o.operator).filter(Boolean))).sort().map(o => ({ operator: o }));

  return { stats, bestDay, bestEfficiency: bestEff > 0 ? { best_efficiency: bestEff } : null, operators };
}

export async function getOrdersForDispatch(): Promise<Order[]> {
  return loadOrders().filter(o => o.status === 'completed');
}

export async function dispatchOrder(id: number, data: {
  plc: string;
  placa: string;
  cargue_start: string;
  cargue_end: string;
}): Promise<Order> {
  const orders = loadOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) throw new Error('Pedido no encontrado');

  const cargue_time = calculateCargueTime(data.cargue_start, data.cargue_end);
  orders[idx] = {
    ...orders[idx],
    plc: data.plc,
    placa: data.placa,
    cargue_start: data.cargue_start,
    cargue_end: data.cargue_end,
    cargue_time,
    status: 'despachado',
  };
  saveOrders(orders);
  return orders[idx];
}

export async function getAllClients(): Promise<string[]> {
  return Array.from(new Set(loadOrders().map(o => o.cliente).filter(Boolean))).sort();
}

// ─── Todos los despachos (para Excel) ─────────────────────────

export async function getAllDespachos(): Promise<Despacho[]> {
  return loadDespachos().sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

// ─── Descargue de contenedores ────────────────────────────────

export async function getUnloadings(): Promise<Unloading[]> {
  const u = loadUnloadings();
  ensureUnloadingIds(u);
  return u.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

export async function createUnloading(data: UnloadingFormData): Promise<Unloading> {
  const unloadings = loadUnloadings();
  ensureUnloadingIds(unloadings);
  const unloading: Unloading = {
    id: nextUnloadingId++,
    date: data.date,
    ptm: data.ptm,
    kg: data.kg,
    operators: data.operators,
    start_time: data.start_time,
    end_time: data.end_time,
    time_spent: calculateTimeSpent(data.start_time, data.end_time),
    novedad: data.novedad || null,
    novedad_resuelta: false,
    created_by: localStorage.getItem('current_user') || '',
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
  unloadings.push(unloading);
  saveUnloadings(unloadings);
  return unloading;
}

export async function updateUnloadingNovedad(id: number, novedad: string, resuelta: boolean): Promise<void> {
  const unloadings = loadUnloadings();
  const idx = unloadings.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('Descargue no encontrado');
  unloadings[idx].novedad = novedad;
  unloadings[idx].novedad_resuelta = resuelta;
  saveUnloadings(unloadings);
}

export async function deleteUnloading(id: number): Promise<void> {
  const unloadings = loadUnloadings().filter(u => u.id !== id);
  saveUnloadings(unloadings);
}

// ─── Operadores ──────────────────────────────────────────────────

const OPERATORS_KEY = 'pedidos_operators';

function loadOperators(): Operator[] {
  try { return JSON.parse(localStorage.getItem(OPERATORS_KEY) || '[]'); } catch { return []; }
}
function saveOperators(ops: Operator[]) { localStorage.setItem(OPERATORS_KEY, JSON.stringify(ops)); }

let nextOpId = 1;
function ensureOpIds(ops: Operator[]) {
  const max = ops.reduce((m, o) => Math.max(m, o.id), 0);
  if (max >= nextOpId) nextOpId = max + 1;
}

export async function getOperators(): Promise<Operator[]> {
  const ops = loadOperators();
  if (ops.length === 0) {
    const defaultNames = ['sebastian', 'edwin', 'gongora', 'emerson', 'neider', 'ovidio', 'jean marco', 'urbano', 'luis'];
    ops.push(...defaultNames.map((name, i) => ({
      id: i + 1, name, created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    })));
    saveOperators(ops);
    ensureOpIds(ops);
  }
  return ops.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createOperator(name: string): Promise<Operator> {
  const ops = loadOperators();
  ensureOpIds(ops);
  const op: Operator = {
    id: nextOpId++,
    name,
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
  ops.push(op);
  saveOperators(ops);
  return op;
}

export async function deleteOperator(id: number): Promise<void> {
  const ops = loadOperators().filter(o => o.id !== id);
  saveOperators(ops);
}

// ─── Citas de cargue ──────────────────────────────────────────────

function loadCitas(): CitaCargue[] {
  try { return JSON.parse(localStorage.getItem(CITAS_KEY) || '[]'); } catch { return []; }
}
function saveCitas(citas: CitaCargue[]) { localStorage.setItem(CITAS_KEY, JSON.stringify(citas)); }
let nextCitaId = 1;
function ensureCitaIds(citas: CitaCargue[]) {
  const max = citas.reduce((m, c) => Math.max(m, c.id), 0);
  if (max >= nextCitaId) nextCitaId = max + 1;
}

export async function getCitasCargue(): Promise<CitaCargue[]> {
  const citas = loadCitas();
  ensureCitaIds(citas);
  return citas.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

export async function createCitaCargue(data: CitaCargueFormData): Promise<CitaCargue> {
  const citas = loadCitas();
  ensureCitaIds(citas);
  
  const [citaH, citaM] = data.hora_cita.split(':').map(Number);
  let retraso_minutos: number | null = null;
  let cumplio_cita: boolean | null = null;
  
  if (data.hora_llegada) {
    const [llegH, llegM] = data.hora_llegada.split(':').map(Number);
    const citaMin = citaH * 60 + citaM;
    const llegMin = llegH * 60 + llegM;
    retraso_minutos = llegMin - citaMin;
    cumplio_cita = retraso_minutos <= 15;
  }

  const cita: CitaCargue = {
    id: nextCitaId++,
    ruta: data.ruta,
    placa: data.placa,
    kg: data.kg,
    tipo: data.tipo || 'Masivo',
    hora_cita: data.hora_cita,
    hora_llegada: data.hora_llegada ?? null,
    retraso_minutos,
    cumplio_cita,
    observaciones: data.observaciones ?? null,
    ruta_cargada: false,
    plc: data.plc ?? null,
    created_by: localStorage.getItem('current_user') || '',
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
  citas.push(cita);
  saveCitas(citas);
  return cita;
}

export async function updateCitaCargue(id: number, data: Partial<CitaCargueFormData>): Promise<void> {
  const citas = loadCitas();
  const idx = citas.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Cita no encontrada');
  
  const oldCita = citas[idx];
  const hora_cita = data.hora_cita ?? oldCita.hora_cita;
  const [citaH, citaM] = hora_cita.split(':').map(Number);
  
  let retraso_minutos = oldCita.retraso_minutos;
  let cumplio_cita = oldCita.cumplio_cita;
  
  if (data.hora_llegada) {
    const [llegH, llegM] = data.hora_llegada.split(':').map(Number);
    const citaMin = citaH * 60 + citaM;
    const llegMin = llegH * 60 + llegM;
    retraso_minutos = llegMin - citaMin;
    cumplio_cita = retraso_minutos <= 15;
  }

  citas[idx] = {
    ...citas[idx],
    ruta: data.ruta ?? oldCita.ruta,
    placa: data.placa ?? oldCita.placa,
    kg: data.kg ?? oldCita.kg,
    hora_cita,
    hora_llegada: data.hora_llegada ?? oldCita.hora_llegada,
    retraso_minutos,
    cumplio_cita,
    observaciones: data.observaciones ?? oldCita.observaciones,
  };
  saveCitas(citas);
}

export async function deleteCitaCargue(id: number): Promise<void> {
  const citas = loadCitas().filter(c => c.id !== id);
  saveCitas(citas);
}

export async function clearAllData(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DESPACHOS_KEY);
  localStorage.removeItem(UNLOADINGS_KEY);
  localStorage.removeItem(CITAS_KEY);
  localStorage.removeItem(OPERATORS_KEY);
}
