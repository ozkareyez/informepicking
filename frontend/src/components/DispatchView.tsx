import { useState, useEffect, useCallback } from 'react';
import { Truck, Package, Search, CheckCircle, Clock, User, AlertTriangle } from 'lucide-react';
import { getOrdersForDispatch, dispatchOrder } from '../api';
import type { Order } from '../types';
import { formatEfficiency, getToday } from '../utils';
import DispatchModal from './DispatchModal';

function isOverdue(order: Order): boolean {
  return order.date < getToday();
}

export default function DispatchView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatched, setDispatched] = useState<Order[]>([]);
  const [showDispatched, setShowDispatched] = useState(false);
  const [dispatchOrderData, setDispatchOrderData] = useState<Order | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrdersForDispatch();
      setOrders(data);
    } catch {
      console.error('Error loading orders for dispatch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  async function handleDispatch(id: number, data: {
    plc: string;
    placa: string;
    cargue_start: string;
    cargue_end: string;
  }) {
    await dispatchOrder(id, data);
    const done = orders.find(o => o.id === id);
    if (done) setDispatched(prev => [done, ...prev]);
    load();
  }

  const filtered = orders.filter(o => {
    if (search && !o.cliente.toLowerCase().includes(search.toLowerCase()) && !o.sku.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && o.type !== typeFilter) return false;
    return true;
  });

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const overdueCount = orders.filter(isOverdue).length;

  return (
    <div className="space-y-3">
      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700">
            <strong>{overdueCount}</strong> pedido{overdueCount !== 1 ? 's' : ''} con retraso — se completaron antes de hoy y aún no se despachan
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[160px] relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" placeholder="Buscar..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="w-[130px] px-2.5 py-1.5 rounded-md border border-gray-300 text-sm">
            <option value="">Todos</option>
            <option value="Masivo">Masivo</option>
            <option value="Venta Directa">Venta Directa</option>
          </select>
          <button onClick={() => setShowDispatched(!showDispatched)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              showDispatched ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            <CheckCircle className="w-3 h-3" />
            Despachados ({dispatched.length})
          </button>
          <span className="text-xs text-gray-500 ml-auto">
            {filtered.length} pedido{filtered.length !== 1 ? 's' : ''}
            {overdueCount > 0 && <span className="ml-1 text-red-600 font-medium">({overdueCount} retr.)</span>}
          </span>
        </div>
      </div>

      {showDispatched && dispatched.length > 0 && (
        <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 overflow-hidden">
          <div className="px-3 py-2 border-b border-green-200 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            <h2 className="text-xs font-semibold text-green-800">Últimos despachados</h2>
          </div>
          <div className="divide-y divide-green-200">
            {dispatched.slice(0, 5).map(order => (
              <div key={order.id} className="px-3 py-1.5 text-xs flex flex-wrap gap-x-4 gap-y-0.5">
                <span><span className="text-green-600">Cliente:</span> <strong className="text-green-900">{order.cliente}</strong></span>
                <span><span className="text-green-600">PLC:</span> {order.plc}</span>
                <span><span className="text-green-600">Placa:</span> {order.placa}</span>
                <span><span className="text-green-600">Cargue:</span> {order.cargue_time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center text-gray-500">
          <Truck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No hay pedidos pendientes de despachar</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-1.5">
          {filtered.map(order => (
            <div key={order.id} className={`rounded-lg sm:rounded-lg shadow-sm border p-4 sm:px-3 sm:py-2 ${
              isOverdue(order) ? 'bg-red-50 border-red-300' : 'bg-white border-gray-100'
            }`}>
              {/* Mobile: stacked */}
              <div className="sm:hidden space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isOverdue(order) && <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
                    <span className="font-semibold text-gray-900 text-base truncate">{order.cliente}</span>
                    {isOverdue(order) && (
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Retrasado
                      </span>
                    )}
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    order.type === 'Masivo' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>{order.type}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                  <span>SKU: {order.sku}</span>
                  <span>{order.kg} kg</span>
                  <span>Op: {order.operator}</span>
                  <span>{order.start_time}-{order.end_time}</span>
                </div>
                <button onClick={() => setDispatchOrderData(order)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg text-base font-medium hover:bg-blue-700">
                  <Truck className="w-5 h-5" />
                  Despachar
                </button>
              </div>
              {/* Desktop: inline */}
              <div className="hidden sm:flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  {isOverdue(order) && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                  <span className="font-medium text-gray-900 truncate">{order.cliente}</span>
                  <span className="text-gray-500 shrink-0">{order.sku}</span>
                  <span className="text-gray-700 shrink-0">{order.kg} kg</span>
                  <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                    order.type === 'Masivo' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>{order.type}</span>
                  <span className="text-gray-400 shrink-0">{order.start_time}-{order.end_time}</span>
                  {isOverdue(order) && (
                    <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800">
                      Retrasado
                    </span>
                  )}
                </div>
                <button onClick={() => setDispatchOrderData(order)}
                  className="shrink-0 inline-flex items-center gap-1 bg-blue-600 text-white px-2.5 py-1 rounded-md text-xs font-medium hover:bg-blue-700">
                  <Truck className="w-3 h-3" />
                  Despachar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dispatchOrderData && (
        <DispatchModal
          order={dispatchOrderData}
          onSave={handleDispatch}
          onClose={() => setDispatchOrderData(null)}
        />
      )}
    </div>
  );
}
