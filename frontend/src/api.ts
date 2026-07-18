import type { Order, OrderFormData, RegisterOrderData, DashboardData, StatisticsData, Client, Despacho, Unloading, UnloadingFormData, Operator, User, CitaCargue, CitaCargueFormData, Rack, RackFormData, RackUpdateData } from './types';
import * as supabaseStore from './supabaseStore';

const active = supabaseStore;

export async function getOrders(params: {
  cliente?: string;
  date?: string;
  type?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
} = {}): Promise<Order[]> {
  return active.getOrders(params);
}

export async function getPendingOrders(): Promise<Order[]> {
  return active.getPendingOrders();
}

export async function getUnassignedOrders(): Promise<Order[]> {
  return active.getUnassignedOrders();
}

export async function getClients(): Promise<Client[]> {
  return active.getClients();
}

export async function getDashboard(params: { period?: string; date?: string } = {}): Promise<DashboardData> {
  return active.getDashboard(params);
}

export async function getStatistics(params: { operator?: string; period?: string; date?: string } = {}): Promise<StatisticsData> {
  return active.getStatistics(params);
}

export async function createOrder(data: RegisterOrderData): Promise<Order> {
  return active.createOrder(data);
}

export async function createOrders(items: RegisterOrderData[]): Promise<number> {
  return active.createOrders(items);
}

export async function assignOperator(id: number, operator: string, start_time: string): Promise<Order> {
  return active.assignOperator(id, operator, start_time);
}

export async function completeOrder(id: number, end_time: string): Promise<Order> {
  return active.completeOrder(id, end_time);
}

export async function updateOrder(id: number, data: OrderFormData & { end_time: string }): Promise<Order> {
  return active.updateOrder(id, data);
}

export async function deleteOrder(id: number): Promise<void> {
  return active.deleteOrder(id);
}

export async function getOrdersForDispatch(): Promise<Order[]> {
  return active.getOrdersForDispatch();
}

export async function dispatchOrder(id: number, data: {
  plc: string;
  placa: string;
  cargue_start: string;
  cargue_end: string;
}): Promise<Order> {
  return active.dispatchOrder(id, data);
}

export async function clearAllData(): Promise<void> {
  return active.clearAllData();
}

export async function deleteOrdersByDateRange(startDate: string, endDate: string): Promise<void> {
  return active.deleteOrdersByDateRange(startDate, endDate);
}

// ─── Autenticación ─────────────────────────────────────────────

export async function login(username: string, password: string): Promise<User | null> {
  return active.login(username, password);
}

// ─── Despachos ──────────────────────────────────────────────────

export async function getDespachos(orderId: number): Promise<Despacho[]> {
  return active.getDespachos(orderId);
}

export async function getAllDespachos(): Promise<Despacho[]> {
  return active.getAllDespachos();
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
  return active.createDespacho(orderId, data);
}

// ─── Descargue de contenedores ─────────────────────────────────

export async function getUnloadings(): Promise<Unloading[]> {
  return active.getUnloadings();
}

export async function createUnloading(data: UnloadingFormData): Promise<Unloading> {
  return active.createUnloading(data);
}

export async function updateUnloadingNovedad(id: number, novedad: string, resuelta: boolean): Promise<void> {
  return active.updateUnloadingNovedad(id, novedad, resuelta);
}

export async function deleteUnloading(id: number): Promise<void> {
  return active.deleteUnloading(id);
}

// ─── Citas de cargue ──────────────────────────────────────────────

export async function getCitasCargue(): Promise<CitaCargue[]> {
  return active.getCitasCargue();
}

export async function createCitaCargue(data: CitaCargueFormData): Promise<CitaCargue> {
  return active.createCitaCargue(data);
}

export async function updateCitaCargue(id: number, data: Partial<CitaCargueFormData>): Promise<void> {
  return active.updateCitaCargue(id, data);
}

export async function deleteCitaCargue(id: number): Promise<void> {
  return active.deleteCitaCargue(id);
}

// ─── Operadores ────────────────────────────────────────────────

export async function getOperators(): Promise<Operator[]> {
  return active.getOperators();
}

export async function createOperator(name: string): Promise<Operator> {
  return active.createOperator(name);
}

export async function updateOperator(id: number, name: string): Promise<void> {
  return active.updateOperator(id, name);
}

export async function deleteOperator(id: number): Promise<void> {
  return active.deleteOperator(id);
}

// ─── Racks / Bodega ────────────────────────────────────────────────

export async function getRacks(): Promise<Rack[]> {
  return active.getRacks();
}

export async function createRack(data: RackFormData): Promise<Rack> {
  return active.createRack(data);
}

export async function updateRack(id: number, data: { ocupacion: number }): Promise<void> {
  return active.updateRack(id, data);
}

export async function deleteRack(id: number): Promise<void> {
  return active.deleteRack(id);
}

// ─── Type-Based Weekly KPIs ────────────────────────────────────────

export async function getTypeBasedWeeklyKPIs(): Promise<{
  production: { week: string; type: string; orders: number; kg: number; skus: number; avg_efficiency: number }[];
  despachos: { week: string; type: string; kg: number; vehiculos: number; avg_efficiency: number }[];
}> {
  return active.getTypeBasedWeeklyKPIs();
}

// ─── 4-Week Trend ────────────────────────────────────────────────────

export async function getFourWeekTrend(): Promise<{
  production: { week: string; total_kg: number; total_orders: number; avg_efficiency: number }[];
  despachos: { week: string; total_kg: number; total_vehiculos: number; avg_efficiency: number }[];
  descargues: { week: string; total_kg: number; total_ptm: number; avg_efficiency: number }[];
  citas: { week: string; total: number; cumplieron: number; pct_cumplimiento: number }[];
}> {
  return active.getFourWeekTrend();
}

// ─── Despachos - Edición y Devolución ──────────────────────────────

export async function updateDespachoKg(despachoId: number, newKg: number, password: string): Promise<void> {
  return active.updateDespachoKg(despachoId, newKg, password);
}

export async function finishOrderWithDevolucion(orderId: number, devolucionKg: number, password: string): Promise<Order> {
  return active.finishOrderWithDevolucion(orderId, devolucionKg, password);
}

