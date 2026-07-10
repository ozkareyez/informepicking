import { useState, useCallback, useEffect } from 'react';
import { ToastContainer, toast } from './components/Toast';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import PendingOrders from './components/PendingOrders';
import OrderTable from './components/OrderTable';
import Statistics from './components/Statistics';
import EditOrderModal from './components/EditOrderModal';
import DispatchView from './components/DispatchView';
import UnloadingView from './components/UnloadingView';
import OperatorView from './components/OperatorView';
import LoginScreen from './components/LoginScreen';
import ThirtyMinuteAlert from './components/ThirtyMinuteAlert';
import { useAuth } from './auth';
import { createOrder, assignOperator, updateOrder, getPendingOrders, getUnassignedOrders } from './api';
import type { Order } from './types';

export default function App() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const triggerRefresh = useCallback(() => setRefreshTrigger(t => t + 1), []);

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [pending, unassigned] = await Promise.all([
          getPendingOrders(),
          getUnassignedOrders(),
        ]);
        setPendingCount(pending.length);
        setUnassignedCount(unassigned.length);
      } catch {}
    }
    fetchCounts();
    const id = setInterval(fetchCounts, 15000);
    return () => clearInterval(id);
  }, [refreshTrigger]);

  async function handleRegister(data: any) {
    try {
      await createOrder(data);
      toast('Pedido registrado correctamente', 'success');
      triggerRefresh();
    } catch (err: any) {
      toast(err.message || 'Error al registrar pedido', 'error');
    }
  }

  async function handleAssignOperator(id: number, operator: string) {
    try {
      const now = new Date();
      const start_time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      await assignOperator(id, operator, start_time);
      toast('Operario asignado correctamente', 'success');
      triggerRefresh();
    } catch (err: any) {
      toast(err.message || 'Error al asignar operario', 'error');
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

  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} pendingCount={pendingCount} unassignedCount={unassignedCount} user={user} />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3">
        {activeTab === 'dashboard' && <Dashboard />}

        {activeTab === 'registro' && (
          <OrderForm onSubmit={handleRegister} />
        )}

        {activeTab === 'pendientes' && (
          <PendingOrders onCompleted={handleOrderCompleted} onAssignOperator={handleAssignOperator} />
        )}

        {activeTab === 'despacho' && <DispatchView />}

        {activeTab === 'pedidos' && (
          <OrderTable
            refreshTrigger={refreshTrigger}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        {activeTab === 'descargue' && <UnloadingView />}

        {activeTab === 'operarios' && <OperatorView />}

        {activeTab === 'estadisticas' && <Statistics />}
      </main>

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onSave={handleEditSave}
          onClose={() => setEditingOrder(null)}
        />
      )}

      <ThirtyMinuteAlert />
      <ToastContainer />
    </div>
  );
}
