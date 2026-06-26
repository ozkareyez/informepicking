import { useState, useCallback, useEffect } from 'react';
import { ToastContainer, toast } from './components/Toast';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import PendingOrders from './components/PendingOrders';
import OrderTable from './components/OrderTable';
import Statistics from './components/Statistics';
import EditOrderModal from './components/EditOrderModal';
import { createOrder, updateOrder, getPendingOrders } from './api';
import type { Order } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const triggerRefresh = useCallback(() => setRefreshTrigger(t => t + 1), []);

  useEffect(() => {
    async function fetchPending() {
      try {
        const data = await getPendingOrders();
        setPendingCount(data.length);
      } catch {}
    }
    fetchPending();
    const id = setInterval(fetchPending, 15000);
    return () => clearInterval(id);
  }, [refreshTrigger]);

  async function handleAssign(data: any) {
    try {
      await createOrder(data);
      toast('Pedido asignado correctamente', 'success');
      triggerRefresh();
    } catch (err: any) {
      toast(err.message || 'Error al asignar pedido', 'error');
    }
  }

  async function handleEditSave(id: number, data: any) {
    try {
      await updateOrder(id, data);
      toast('Pedido actualizado correctamente', 'success');
      setEditingOrder(null);
      triggerRefresh();
    } catch (err: any) {
      toast(err.message || 'Error al actualizar', 'error');
    }
  }

  function handleEdit(order: Order) {
    setEditingOrder(order);
  }

  function handleDelete() {
    triggerRefresh();
  }

  function handleOrderCompleted() {
    triggerRefresh();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} pendingCount={pendingCount} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && <Dashboard />}

        {activeTab === 'registro' && (
          <OrderForm onSubmit={handleAssign} />
        )}

        {activeTab === 'pendientes' && (
          <PendingOrders onCompleted={handleOrderCompleted} />
        )}

        {activeTab === 'pedidos' && (
          <OrderTable
            refreshTrigger={refreshTrigger}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        {activeTab === 'estadisticas' && <Statistics />}
      </main>

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onSave={handleEditSave}
          onClose={() => setEditingOrder(null)}
        />
      )}

      <ToastContainer />
    </div>
  );
}
