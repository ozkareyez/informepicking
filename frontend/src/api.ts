import type { Order, OrderFormData, RegisterOrderData, DashboardData, StatisticsData, Client } from './types';
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

export async function getDashboard(): Promise<DashboardData> {
  return active.getDashboard();
}

export async function getStatistics(params: { operator?: string; period?: string; date?: string } = {}): Promise<StatisticsData> {
  return active.getStatistics(params);
}

export async function createOrder(data: RegisterOrderData): Promise<Order> {
  return active.createOrder(data);
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
