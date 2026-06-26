import type { Order, OrderFormData, DashboardData, StatisticsData, Client } from './types';
import * as store from './store';

export async function getOrders(params: {
  search?: string;
  operator?: string;
  date?: string;
  type?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
} = {}): Promise<Order[]> {
  return store.getOrders(params);
}

export async function getPendingOrders(): Promise<Order[]> {
  return store.getPendingOrders();
}

export async function getClients(): Promise<Client[]> {
  return store.getClients();
}

export async function getDashboard(): Promise<DashboardData> {
  return store.getDashboard();
}

export async function getStatistics(params: { operator?: string; period?: string; date?: string } = {}): Promise<StatisticsData> {
  return store.getStatistics(params);
}

export async function createOrder(data: OrderFormData): Promise<Order> {
  return store.createOrder(data);
}

export async function completeOrder(id: number, end_time: string): Promise<Order> {
  return store.completeOrder(id, end_time);
}

export async function updateOrder(id: number, data: OrderFormData & { end_time: string }): Promise<Order> {
  return store.updateOrder(id, data);
}

export async function deleteOrder(id: number): Promise<void> {
  return store.deleteOrder(id);
}

export async function clearAllData(): Promise<void> {
  return store.clearAllData();
}
