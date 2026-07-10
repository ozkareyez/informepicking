import { useState, useEffect, useRef } from 'react';
import { getPendingOrders } from '../api';
import { AlertTriangle, Clock } from 'lucide-react';

interface AlertInfo {
  orderId: number;
  cliente: string;
  operator: string;
  minutes: number;
}

export default function ThirtyMinuteAlert() {
  const [alert, setAlert] = useState<AlertInfo | null>(null);
  const alerted = useRef(new Set<number>());

  useEffect(() => {
    async function check() {
      try {
        const orders = await getPendingOrders();
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        for (const order of orders) {
          if (!order.start_time) continue;

          const [sh, sm] = order.start_time.split(':').map(Number);
          let elapsed = currentMinutes - (sh * 60 + sm);
          if (elapsed < 0) elapsed += 24 * 60;

          if (elapsed >= 30 && !alerted.current.has(order.id)) {
            alerted.current.add(order.id);
            setAlert({
              orderId: order.id,
              cliente: order.cliente,
              operator: order.operator,
              minutes: elapsed,
            });
          }
        }
      } catch {}
    }

    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  if (!alert) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl mx-4 max-w-sm w-full p-6 animate-slide-up">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Alerta de tiempo</h2>
          <p className="text-sm text-gray-500 mb-4">
            Un pedido lleva más de 30 minutos en progreso
          </p>
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 w-full mb-5 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Cliente</span>
              <span className="font-semibold text-gray-900">{alert.cliente}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Operario</span>
              <span className="font-semibold text-gray-900">{alert.operator}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Tiempo</span>
              <span className="font-semibold text-red-600 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {alert.minutes} minutos
              </span>
            </div>
          </div>
          <button
            onClick={() => setAlert(null)}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
