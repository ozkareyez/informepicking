import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, User, Package, UserPlus } from 'lucide-react';
import { getPendingOrders, getUnassignedOrders, completeOrder } from '../api';
import type { Order } from '../types';
import { getCurrentTime, calculateHours, calculateKgPerHour, calculateEfficiency, formatEfficiency } from '../utils';

interface Props {
  onCompleted: () => void;
  onAssignOperator: (id: number, operator: string) => Promise<void>;
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

export default function PendingOrders({ onCompleted, onAssignOperator }: Props) {
  const [pending, setPending] = useState<Order[]>([]);
  const [unassigned, setUnassigned] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState<number | null>(null);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [assignName, setAssignName] = useState('');
  const [summary, setSummary] = useState<{
    order: Order;
    kg_per_hour: number;
    efficiency: number;
    time_spent: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingData, unassignedData] = await Promise.all([
        getPendingOrders(),
        getUnassignedOrders(),
      ]);
      setPending(pendingData);
      setUnassigned(unassignedData);
    } catch {
      console.error('Error loading orders');
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

  async function handleAssign(order: Order) {
    if (!assignName.trim()) return;
    setAssigning(order.id);
    try {
      await onAssignOperator(order.id, assignName.trim());
      setAssignName('');
      setAssigning(null);
      load();
    } catch (err: any) {
      alert(err.message);
      setAssigning(null);
    }
  }

  if (loading && pending.length === 0 && unassigned.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {summary && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 animate-slide-up flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            <span><strong className="text-green-900">{summary.order.cliente}</strong> — {summary.time_spent} — {formatEfficiency(summary.efficiency)}</span>
          </div>
          <button onClick={() => setSummary(null)}
            className="text-xs text-green-700 hover:text-green-800 font-medium shrink-0">
            Cerrar
          </button>
        </div>
      )}

      {unassigned.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-purple-500" />
              Sin operario
            </h2>
            <span className="text-xs text-gray-500">{unassigned.length}</span>
          </div>

          <div className="divide-y divide-gray-100">
            {unassigned.map(order => (
              <div key={order.id} className="px-4 py-3 sm:px-4 sm:py-2.5 hover:bg-gray-50 transition-colors">
                {/* Mobile: stacked */}
                <div className="sm:hidden space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-base">{order.cliente}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      order.type === 'Masivo' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>{order.type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span>SKU: {order.sku}</span>
                    <span>{order.kg} kg</span>
                    <span>{order.date}</span>
                  </div>
                  {assigning === order.id ? (
                    <div className="flex items-center gap-2">
                      <input type="text" value={assignName} onChange={e => setAssignName(e.target.value)}
                        placeholder="Nombre del operario" autoFocus
                        className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 text-base focus:ring-2 focus:ring-blue-500"
                        onKeyDown={e => { if (e.key === 'Enter') handleAssign(order); if (e.key === 'Escape') { setAssigning(null); setAssignName(''); } }} />
                      <button onClick={() => handleAssign(order)} disabled={!assignName.trim()}
                        className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 min-h-[44px]">
                        Asignar
                      </button>
                      <button onClick={() => { setAssigning(null); setAssignName(''); }}
                        className="text-sm text-gray-500 px-2">Cancelar</button>
                    </div>
                  ) : (
                    <button onClick={() => { setAssigning(order.id); setAssignName(''); }}
                      className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-lg text-base font-medium hover:bg-purple-700">
                      <UserPlus className="w-5 h-5" />
                      Asignar operario
                    </button>
                  )}
                </div>
                {/* Desktop: inline */}
                <div className="hidden sm:flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-sm min-w-0">
                    <span className="font-medium text-gray-900 truncate">{order.cliente}</span>
                    <span className="text-gray-500 shrink-0">{order.sku}</span>
                    <span className="text-gray-700 shrink-0">{order.kg} kg</span>
                    <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      order.type === 'Masivo' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {order.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {assigning === order.id ? (
                      <div className="flex items-center gap-1.5">
                        <input type="text" value={assignName} onChange={e => setAssignName(e.target.value)}
                          placeholder="Operario" autoFocus
                          className="px-2 py-1 rounded-md border border-gray-300 text-sm w-32 focus:ring-2 focus:ring-blue-500"
                          onKeyDown={e => { if (e.key === 'Enter') handleAssign(order); if (e.key === 'Escape') { setAssigning(null); setAssignName(''); } }} />
                        <button onClick={() => handleAssign(order)} disabled={!assignName.trim()}
                          className="bg-blue-600 text-white px-2.5 py-1 rounded-md text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                          OK
                        </button>
                        <button onClick={() => { setAssigning(null); setAssignName(''); }}
                          className="text-xs text-gray-500">X</button>
                      </div>
                    ) : (
                      <button onClick={() => { setAssigning(order.id); setAssignName(''); }}
                        className="inline-flex items-center gap-1 bg-purple-600 text-white px-2.5 py-1 rounded-md text-xs font-medium hover:bg-purple-700">
                        <UserPlus className="w-3 h-3" />
                        Asignar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            En progreso
          </h2>
          <span className="text-xs text-gray-500">{pending.length} activos</span>
        </div>

        {pending.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No hay pedidos en progreso</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pending.map(order => (
              <div key={order.id} className="px-4 py-3 sm:px-4 sm:py-2.5 hover:bg-gray-50 transition-colors">
                {/* Mobile: stacked */}
                <div className="sm:hidden space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-base">{order.cliente}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      order.type === 'Masivo' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>{order.type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                    <span>SKU: {order.sku}</span>
                    <span>{order.kg} kg</span>
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {order.operator}</span>
                    <span>Inicio: {order.start_time}</span>
                    <span className="font-mono"><ElapsedTime start={order.start_time} /></span>
                  </div>
                  <button onClick={() => handleFinalize(order)} disabled={finalizing === order.id}
                    className="w-full inline-flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg text-base font-medium hover:bg-green-700 disabled:opacity-50">
                    <CheckCircle className="w-5 h-5" />
                    {finalizing === order.id ? 'Finalizando...' : 'Finalizar pedido'}
                  </button>
                </div>
                {/* Desktop: inline */}
                <div className="hidden sm:flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-sm min-w-0">
                    <span className="font-medium text-gray-900 truncate">{order.cliente}</span>
                    <span className="text-gray-500 shrink-0">{order.sku}</span>
                    <span className="text-gray-700 shrink-0">{order.kg} kg</span>
                    <span className="flex items-center gap-1 text-gray-500 shrink-0">
                      <User className="w-3 h-3" /> {order.operator}
                    </span>
                    <span className="text-gray-500 shrink-0">{order.start_time}</span>
                    <span className="text-gray-700 shrink-0 font-mono text-xs"><ElapsedTime start={order.start_time} /></span>
                    <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      order.type === 'Masivo' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {order.type}
                    </span>
                  </div>
                  <button onClick={() => handleFinalize(order)} disabled={finalizing === order.id}
                    className="shrink-0 inline-flex items-center gap-1 bg-green-600 text-white px-2.5 py-1 rounded-md text-xs font-medium hover:bg-green-700 disabled:opacity-50">
                    <CheckCircle className="w-3 h-3" />
                    {finalizing === order.id ? '...' : 'Finalizar'}
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
