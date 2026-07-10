import { useState, useEffect, useCallback } from 'react';
import { Truck, Package, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import { getOrdersForDispatch, getDespachos, createDespacho } from '../api';
import type { Order, Despacho } from '../types';
import { getOverdueDays } from '../utils';
import DispatchModal from './DispatchModal';

function isOverdue(order: Order): boolean {
  return getOverdueDays(order.date, order.type) > 0;
}

export default function DispatchView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [despachosMap, setDespachosMap] = useState<Record<number, Despacho[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);
  const [showFullyDispatched, setShowFullyDispatched] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrdersForDispatch();
      setOrders(data);

      const dMap: Record<number, Despacho[]> = {};
      for (const o of data) {
        dMap[o.id] = await getDespachos(o.id);
      }
      setDespachosMap(dMap);
    } catch {
      console.error('Error loading dispatch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  async function handleDespacho(orderId: number, data: {
    placa: string;
    plc: string;
    kg: number;
    cargue_start: string;
    cargue_end: string;
    ruta: string;
  }) {
    await createDespacho(orderId, data);
    setDispatchOrder(null);
    load();
  }

  const pendingOrders = orders.filter(o => o.despachado_kg < o.kg);
  const doneOrders = orders.filter(o => o.despachado_kg >= o.kg);

  const filteredPending = pendingOrders.filter(o => {
    if (search && !o.cliente.toLowerCase().includes(search.toLowerCase()) && !o.sku.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Overdue alert ── */}
      {(() => {
        const overdue = pendingOrders.filter(isOverdue);
        const totalDays = overdue.reduce((s, o) => s + getOverdueDays(o.date, o.type), 0);
        return overdue.length > 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700">
              <strong>{overdue.length}</strong> pedido{overdue.length !== 1 ? 's' : ''} con retraso
              {totalDays > 0 && <span> — <strong>{totalDays}</strong> día{totalDays !== 1 ? 's' : ''} en total</span>}
            </p>
          </div>
        ) : null;
      })()}

      {/* ── Search ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[160px] relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" placeholder="Buscar pedido..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <span className="text-xs text-gray-500">
            {filteredPending.length} pendiente{filteredPending.length !== 1 ? 's' : ''}
            {doneOrders.length > 0 && ` · ${doneOrders.length} completado${doneOrders.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* ── Pending orders (with saldo) ── */}
      {filteredPending.length === 0 && doneOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center text-gray-500">
          <Truck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No hay pedidos pendientes de despachar</p>
        </div>
      ) : (
        <>
          {filteredPending.map(order => {
            const saldo = order.kg - order.despachado_kg;
            const despachos = despachosMap[order.id] || [];
            const pct = (order.despachado_kg / order.kg) * 100;
            return (
              <div key={order.id} className={`rounded-lg shadow-sm border p-4 ${
                isOverdue(order) ? 'bg-red-50 border-red-300' : 'bg-white border-gray-100'
              }`}>
                {/* Order header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {isOverdue(order) && <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {order.cliente}
                        {isOverdue(order) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                            {getOverdueDays(order.date, order.type)} día{getOverdueDays(order.date, order.type) !== 1 ? 's' : ''}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500">
                        SKU: {order.sku} · {order.kg} kg · {order.type}
                        {order.despachado_kg > 0 && ` · Op: ${order.operator}`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setDispatchOrder(order)}
                    className="shrink-0 inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700">
                    <Truck className="w-4 h-4" />
                    Agregar vehículo
                  </button>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Despachado</span>
                    <span className="font-medium text-gray-900">
                      {order.despachado_kg} kg / {order.kg} kg
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">{order.despachado_kg} kg despachados</span>
                    <span className="text-amber-600 font-medium">{saldo} kg saldo</span>
                  </div>
                </div>

                {/* Vehicles */}
                {despachos.length > 0 && (
                  <div className="mt-3 bg-gray-50 rounded-md p-2 space-y-1">
                    <p className="text-xs font-medium text-gray-500">
                      Vehículo{despachos.length !== 1 ? 's' : ''} ({despachos.length})
                      {despachos[0]?.ruta && <span className="text-blue-600 ml-1">· Ruta: {despachos[0].ruta}</span>}:
                    </p>
                    {despachos.map(d => (
                      <div key={d.id} className="text-xs text-gray-700 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>Placa: <strong>{d.placa}</strong></span>
                        <span>PLC: {d.plc}</span>
                        <span>{d.kg} kg</span>
                        <span>Cargue: {d.cargue_time}</span>
                        {d.ruta && <span className="text-blue-600">Ruta: {d.ruta}</span>}
                        {d.created_by && <span className="text-gray-400">Por: {d.created_by}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Fully dispatched orders ── */}
          {doneOrders.length > 0 && (
            <div>
              <button onClick={() => setShowFullyDispatched(!showFullyDispatched)}
                className="w-full flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg border border-green-200 text-sm">
                <span className="font-medium text-green-800">
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  Despachos completados ({doneOrders.length})
                </span>
                <span className="text-green-600">{showFullyDispatched ? '▲' : '▼'}</span>
              </button>
              {showFullyDispatched && (
                <div className="mt-1.5 space-y-1.5">
                  {doneOrders.map(order => {
                    const despachos = despachosMap[order.id] || [];
                    return (
                      <div key={order.id} className="bg-green-50 rounded-lg border border-green-200 p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-green-900 text-sm">{order.cliente}</span>
                          <span className="text-xs text-green-700">{order.kg} kg</span>
                        </div>
                        {despachos.map(d => (
                          <div key={d.id} className="text-xs text-green-700 pl-6 flex flex-wrap gap-x-3">
                            <span>Placa: {d.placa}</span>
                            <span>PLC: {d.plc}</span>
                            <span>{d.kg} kg</span>
                            {d.ruta && <span>Ruta: {d.ruta}</span>}
                            {d.created_by && <span>Por: {d.created_by}</span>}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {dispatchOrder && (
        <DispatchModal
          order={dispatchOrder}
          despachos={despachosMap[dispatchOrder.id] || []}
          onSave={handleDespacho}
          onClose={() => setDispatchOrder(null)}
        />
      )}
    </div>
  );
}
