import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, User, Package } from 'lucide-react';
import { getPendingOrders, completeOrder } from '../api';
import type { Order } from '../types';
import { getCurrentTime, calculateHours, calculateKgPerHour, calculateEfficiency, formatEfficiency } from '../utils';

interface Props {
  onCompleted: () => void;
}

function ElapsedTime({ start }: { start: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    function update() {
      const [sh, sm] = start.split(':').map(Number);
      const now = new Date();
      const nh = now.getHours();
      const nm = now.getMinutes();
      let diff = (nh * 60 + nm) - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      setElapsed(`${h}h ${m.toString().padStart(2, '0')}m`);
    }
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [start]);

  return <span className="font-mono text-sm">{elapsed}</span>;
}

export default function PendingOrders({ onCompleted }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState<number | null>(null);
  const [summary, setSummary] = useState<{
    order: Order;
    kg_per_hour: number;
    efficiency: number;
    time_spent: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPendingOrders();
      setOrders(data);
    } catch {
      console.error('Error loading pending orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  async function handleFinalize(order: Order) {
    const end = getCurrentTime();
    if (end <= order.start_time) {
      alert('Debe esperar a que pase al menos un minuto para finalizar');
      return;
    }
    setFinalizing(order.id);
    try {
      const updated = await completeOrder(order.id, end);
      const time_spent = `${Math.floor(
        (parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]) -
        parseInt(order.start_time.split(':')[0]) * 60 - parseInt(order.start_time.split(':')[1])) / 60
      )}h ${(
        (parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]) -
        parseInt(order.start_time.split(':')[0]) * 60 - parseInt(order.start_time.split(':')[1])) % 60
      )}m`;
      const hours = calculateHours(order.start_time, end);
      const kgph = calculateKgPerHour(order.kg, hours);
      const eff = calculateEfficiency(kgph);
      setSummary({
        order: updated,
        kg_per_hour: kgph,
        efficiency: eff,
        time_spent,
      });
      load();
      onCompleted();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFinalizing(null);
    }
  }

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 animate-slide-up">
          <h3 className="font-semibold text-green-800 text-sm flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4" />
            Pedido completado
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><span className="text-green-600">Cliente:</span> <strong className="text-green-900">{summary.order.cliente}</strong></div>
            <div><span className="text-green-600">SKU:</span> <strong className="text-green-900">{summary.order.sku}</strong></div>
            <div><span className="text-green-600">Tiempo:</span> <strong className="text-green-900">{summary.time_spent}</strong></div>
            <div><span className="text-green-600">Eficiencia:</span> <strong className="text-green-900">{formatEfficiency(summary.efficiency)}</strong></div>
            <div><span className="text-green-600">Kg/h:</span> <strong className="text-green-900">{summary.kg_per_hour}</strong></div>
          </div>
          <button onClick={() => setSummary(null)}
            className="mt-3 text-xs text-green-700 hover:text-green-800 font-medium">
            Cerrar
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            Pedidos en progreso
          </h2>
          <span className="text-xs text-gray-500">{orders.length} activos</span>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>No hay pedidos pendientes</p>
            <p className="text-xs mt-1">Asigne pedidos desde la pestaña Registro</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {orders.map(order => (
              <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-center">
                  <div>
                    <p className="text-xs text-gray-500">Cliente</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{order.cliente}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">SKU</p>
                    <p className="text-sm text-gray-700">{order.sku}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Kg</p>
                    <p className="text-sm font-medium text-gray-700">{order.kg}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <User className="w-3 h-3" /> Operario
                    </p>
                    <p className="text-sm text-gray-700">{order.operator}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Inicio</p>
                    <p className="text-sm text-gray-700">{order.start_time}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Transcurrido</p>
                    <ElapsedTime start={order.start_time} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    order.type === 'Masivo' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {order.type}
                  </span>
                  <button onClick={() => handleFinalize(order)} disabled={finalizing === order.id}
                    className="inline-flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm">
                    <CheckCircle className="w-4 h-4" />
                    {finalizing === order.id ? 'Finalizando...' : 'Finalizar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
