import { useState, useCallback, useEffect } from 'react';
import { ToastContainer, toast } from './components/Toast';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DashboardProduccion from './components/DashboardProduccion';
import DashboardDespacho from './components/DashboardDespacho';
import DashboardDescargue from './components/DashboardDescargue';
import DashboardCitas from './components/DashboardCitas';
import DashboardBodega from './components/DashboardBodega';
import OrderForm from './components/OrderForm';
import PendingOrders from './components/PendingOrders';
import OrderTable from './components/OrderTable';
import Statistics from './components/Statistics';
import EditOrderModal from './components/EditOrderModal';
import DispatchView from './components/DispatchView';
import UnloadingView from './components/UnloadingView';
import NovedadesDescargueView from './components/NovedadesDescargueView';
import CitasCargueView from './components/CitasCargueView';
import OperatorView from './components/OperatorView';
import LoginScreen from './components/LoginScreen';
import ThirtyMinuteAlert from './components/ThirtyMinuteAlert';
import { useAuth } from './auth';
import { createOrder, assignOperator, updateOrder, getPendingOrders, getUnassignedOrders, getCitasCargue, getUnloadings, createDespacho } from './api';
import type { Order } from './types';

export default function App() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dash-produccion');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [citasPendientes, setCitasPendientes] = useState(0);
  const [novedadesPendientes, setNovedadesPendientes] = useState(0);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const triggerRefresh = useCallback(() => setRefreshTrigger(t => t + 1), []);

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [pending, unassigned, citas, unc] = await Promise.all([
          getPendingOrders(),
          getUnassignedOrders(),
          getCitasCargue(),
          getUnloadings(),
        ]);
        setPendingCount(pending.length);
        setUnassignedCount(unassigned.length);
        setCitasPendientes(citas.filter(c => c.cumplio_cita === false).length);
        setNovedadesPendientes(unc.filter(u => u.novedad && !u.novedad_resuelta).length);
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

  async function handleDispatchFromCita(cita: any) {
    try {
      toast('Cita seleccionada para despacho. Ve a la pestaña Despacho y selecciona un pedido.', 'info');
      setActiveTab('despacho');
    } catch (err: any) {
      toast(err.message || 'Error al preparar despacho', 'error');
    }
  }

  if (!user) return <LoginScreen />;

  return (
    <div className="page">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        unassignedCount={unassignedCount}
        citasPendientes={citasPendientes}
        novedadesPendientes={novedadesPendientes}
        user={user}
        onLogout={logout}
      />

      <main className="main-content">
        <div className="content">
          {/* Dashboards especializados */}
          {activeTab === 'dash-produccion' && <DashboardProduccion key="dash-produccion" />}
          {activeTab === 'dash-despacho' && <DashboardDespacho key="dash-despacho" />}
          {activeTab === 'dash-descargue' && <DashboardDescargue key="dash-descargue" />}
          {activeTab === 'dash-citas' && <DashboardCitas key="dash-citas" />}
          {activeTab === 'dash-bodega' && <DashboardBodega key="dash-bodega" />}
          
          {/* Proceso de Cargue */}
          {activeTab === 'registro' && <OrderForm onSubmit={handleRegister} />}
          {activeTab === 'pendientes' && <PendingOrders onCompleted={handleOrderCompleted} onAssignOperator={handleAssignOperator} />}
          {activeTab === 'despacho' && <DispatchView onOrderChange={triggerRefresh} />}
          {activeTab === 'citas' && <CitasCargueView onDispatchFromCita={handleDispatchFromCita} />}

          {/* Proceso de Descargue */}
          {activeTab === 'descargue' && <UnloadingView />}
          {activeTab === 'novedades' && <NovedadesDescargueView />}

          {/* Administración */}
          {activeTab === 'pedidos' && (
            <OrderTable
              refreshTrigger={refreshTrigger}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
          {activeTab === 'operarios' && <OperatorView />}
          {activeTab === 'estadisticas' && <Statistics />}
        </div>
      </main>

      <ThirtyMinuteAlert />
      <ToastContainer />
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onSave={handleEditSave}
          onClose={() => setEditingOrder(null)}
        />
      )}
    </div>
  );
}
