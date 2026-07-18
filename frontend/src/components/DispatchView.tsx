import { useState, useEffect, useCallback, useMemo } from 'react';
import { Truck, Package, Search, CheckCircle, AlertTriangle, Calendar, Edit, RotateCcw } from 'lucide-react';
import { getOrdersForDispatch, getDespachos, createDespacho, updateDespachoKg, finishOrderWithDevolucion } from '../api';
import type { Order, Despacho } from '../types';
import { getOverdueDays, getToday, getWeekRange, getWeekNumber, toUpperCase } from '../utils';
import DispatchModal from './DispatchModal';
import PasswordModal from './PasswordModal';

function isOverdue(order: Order): boolean {
  return getOverdueDays(order.date, order.type) > 0;
}

type Period = '' | 'day' | 'week' | 'month';
type TypeTab = 'Masivo' | 'Venta Directa';

export default function DispatchView({ onOrderChange }: { onOrderChange?: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [despachosMap, setDespachosMap] = useState<Record<number, Despacho[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);
  const [showFullyDispatched, setShowFullyDispatched] = useState(false);
  const [period, setPeriod] = useState<Period>('');
  const [date, setDate] = useState(getToday());
  const [weekInput, setWeekInput] = useState('');
  const [deleteWeek, setDeleteWeek] = useState('');
  const [deleteStartDate, setDeleteStartDate] = useState('');
  const [deleteEndDate, setDeleteEndDate] = useState('');
  const [typeTab, setTypeTab] = useState<TypeTab>('Masivo');

  // Password modal state
  const [passwordModal, setPasswordModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: (password: string) => Promise<void>;
  } | null>(null);

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
    date: string;
    cargue_start: string;
    cargue_end: string;
    ruta: string;
  }) {
    await createDespacho(orderId, data);
    setDispatchOrder(null);
    load();
    onOrderChange?.();
  }

  function handleEditDespacho(despacho: Despacho) {
    setPasswordModal({
      open: true,
      title: 'Editar peso del despacho',
      message: `Despacho: Placa ${despacho.placa} (PLC: ${despacho.plc})\nPeso actual: ${despacho.kg} kg\n\nIngrese nuevo peso en kg:`,
      action: async (password) => {
        const newKg = prompt(`Nuevo peso para ${despacho.placa} (actual: ${despacho.kg} kg):`);
        if (newKg === null) return;
        const kg = Number(newKg);
        if (isNaN(kg) || kg <= 0) throw new Error('Peso inválido');
        await updateDespachoKg(despacho.id, kg, password);
        load();
        onOrderChange?.();
      },
    });
  }

  function handleFinishWithDevolucion(order: Order) {
    const saldo = order.kg - order.despachado_kg;
    setPasswordModal({
      open: true,
      title: 'Finalizar con devolución',
      message: `Pedido: ${order.cliente} - ${order.sku}\nTotal: ${order.kg} kg | Despachado: ${order.despachado_kg} kg | Saldo: ${saldo} kg\n\n¿Desea marcar como devolución ${saldo} kg y finalizar el pedido?`,
      action: async (password) => {
        await finishOrderWithDevolucion(order.id, saldo, password);
        load();
        onOrderChange?.();
      },
    });
  }

  const filteredByDate = useMemo(() => {
    if (!period) return orders;
    if (period === 'day') return orders.filter(o => o.date === date);
    if (period === 'week') {
      const { start, end } = getWeekRange(parseInt(weekInput), new Date(date).getFullYear());
      return orders.filter(o => o.date >= start && o.date <= end);
    }
    if (period === 'month') {
      const prefix = date.slice(0, 7);
      return orders.filter(o => o.date.startsWith(prefix));
    }
    return orders;
  }, [orders, period, date, weekInput]);

  const pendingOrders = filteredByDate.filter(o => (o.despachado_kg ?? 0) < o.kg);
  const doneOrders = filteredByDate.filter(o => (o.despachado_kg ?? 0) >= o.kg);


  const pendingMasivo = pendingOrders.filter(o => o.type === 'Masivo');
  const pendingVd = pendingOrders.filter(o => o.type === 'Venta Directa');
  const doneMasivo = doneOrders.filter(o => o.type === 'Masivo');
  const doneVd = doneOrders.filter(o => o.type === 'Venta Directa');

  const currentPending = typeTab === 'Masivo' ? pendingMasivo : pendingVd;
  const currentDone = typeTab === 'Masivo' ? doneMasivo : doneVd;

  const filteredPending = currentPending.filter(o => {
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
  if (!loading && orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center text-gray-500">
        <Truck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No hay pedidos pendientes de despachar</p>
      </div>
    );
  }

  function handleWeekChange(week: string) {
    setDeleteWeek(week);
    if (!week) return;
    const year = new Date().getFullYear();
    const firstJan = new Date(year, 0, 1);
    const days = (parseInt(week) - 1) * 7;
    const start = new Date(firstJan);
    start.setDate(firstJan.getDate() + days - firstJan.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    setDeleteStartDate(start.toISOString().split('T')[0]);
    setDeleteEndDate(end.toISOString().split('T')[0]);
  }

  const overdue = pendingOrders.filter(isOverdue);
  const d1 = overdue.filter(o => getOverdueDays(o.date, o.type) === 1).length;
  const many = overdue.length - d1;

  return (
    <div className="space-y-3">
      {/* ── Overdue alert ── */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700">
            <strong>{overdue.length}</strong> pedido{overdue.length !== 1 ? 's' : ''} con retraso
            {d1 > 0 && <span> · 1 día: <strong>{d1}</strong></span>}
            {many > 0 && <span> · 2+ días: <strong>{many}</strong></span>}
          </p>
        </div>
      )}

      {/* ── Period filter ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => { setPeriod(''); setWeekInput(''); }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${!period ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Todo</button>
          <button onClick={() => { setPeriod('day'); setDate(getToday()); setWeekInput(''); }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${period === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Hoy</button>
          <button onClick={() => {
            setPeriod('week');
            const wn = getWeekNumber(getToday());
            setWeekInput(String(wn));
            handleWeekChange(String(wn));
          }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${period === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Semana</button>
          <button onClick={() => { setPeriod('month'); setDate(getToday()); setWeekInput(''); }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${period === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Mes</button>

          <div className="flex-1 min-w-[140px] relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" placeholder="Buscar pedido..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {period === 'week' && (
          <div className="flex items-center gap-2 mt-2">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <input type="number" min="1" max="53" value={weekInput} onChange={e => { setWeekInput(e.target.value); handleWeekChange(e.target.value); setPeriod('week'); }}
              placeholder="Semana"
              className="w-20 rounded-md border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500" />
            {deleteStartDate && deleteEndDate && (
              <span className="text-xs text-gray-500">{deleteStartDate} → {deleteEndDate}</span>
            )}
          </div>
        )}

        {period === 'day' && (
          <div className="flex items-center gap-2 mt-2">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500" />
          </div>
        )}

        {period === 'month' && (
          <div className="flex items-center gap-2 mt-2">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <input type="month" value={date.slice(0, 7)} onChange={e => setDate(e.target.value + '-01')}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500" />
          </div>
        )}
      </div>

      {/* ── Type tabs ── */}
      <div className="flex gap-1">
        <button onClick={() => setTypeTab('Masivo')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            typeTab === 'Masivo' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>
          Masivo {pendingMasivo.length > 0 && <span className="ml-1 text-xs opacity-80">({pendingMasivo.length})</span>}
        </button>
        <button onClick={() => setTypeTab('Venta Directa')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            typeTab === 'Venta Directa' ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>
          Venta Directa {pendingVd.length > 0 && <span className="ml-1 text-xs opacity-80">({pendingVd.length})</span>}
        </button>
      </div>

      {/* ── Pending orders ── */}
      {filteredPending.length === 0 && currentDone.length === 0 ? (
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
                        {order.created_by && <span> · Creado: {order.created_by}</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Fecha pedido: {order.date}</p>
                    </div>
                  </div>
                  <button onClick={() => setDispatchOrder(order)}
                    className="shrink-0 inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700">
                    <Truck className="w-4 h-4" />
                    Agregar vehículo
                  </button>
                </div>

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
                  {saldo > 0 && (
                    <button onClick={() => handleFinishWithDevolucion(order)}
                      className="mt-2 w-full py-1.5 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 flex items-center justify-center gap-1.5">
                      <RotateCcw className="w-3 h-3" />
                      Finalizar con devolución ({saldo} kg)
                    </button>
                  )}
                </div>

{despachos.length > 0 && (
                  <div className="mt-3 bg-gray-50 rounded-md p-2 space-y-1">
                    <p className="text-xs font-medium text-gray-500">
                      Vehículo{despachos.length !== 1 ? 's' : ''} ({despachos.length})
                      {despachos[0]?.ruta && <span className="text-blue-600 ml-1">· Ruta: {despachos[0].ruta}</span>}:
                    </p>
                    {despachos.map(d => (
                      <div key={d.id} className="text-xs text-gray-700 flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                        <span>Placa: <strong>{toUpperCase(d.placa)}</strong></span>
                        <span>PLC: {toUpperCase(d.plc)}</span>
                        <span>{d.kg} kg</span>
                        <span>Cargue: {d.cargue_time}</span>
                        <span>Inicio: {d.cargue_start}</span>
                        <span>Fin: {d.cargue_end}</span>
                        {d.ruta && <span className="text-blue-600">Ruta: {toUpperCase(d.ruta)}</span>}
                        {d.date && <span>Fecha: {d.date}</span>}
                        {d.created_at && <span>Registrado: {d.created_at.slice(0, 16).replace('T', ' ')}</span>}
                        {d.created_by && <span className="text-gray-400">Por: {toUpperCase(d.created_by)}</span>}
                        <button onClick={() => handleEditDespacho(d)} className="text-blue-600 hover:text-blue-800 underline text-[10px] px-1 py-0.5 rounded">Editar</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Fully dispatched ── */}
          {currentDone.length > 0 && (
            <div>
              <button onClick={() => setShowFullyDispatched(!showFullyDispatched)}
                className="w-full flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg border border-green-200 text-sm">
                <span className="font-medium text-green-800">
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  Despachos completados ({currentDone.length})
                </span>
                <span className="text-green-600">{showFullyDispatched ? '▲' : '▼'}</span>
              </button>
              {showFullyDispatched && (
                <div className="mt-1.5 space-y-1.5">
                  {currentDone.map(order => {
                    const despachos = despachosMap[order.id] || [];
                    return (
                      <div key={order.id} className="bg-green-50 rounded-lg border border-green-200 p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-green-900 text-sm">{order.cliente}</span>
                          <span className="text-xs text-green-700">{order.kg} kg</span>
                          {order.created_by && <span className="text-xs text-green-500">Creado: {order.created_by}</span>}
                        </div>
                        <p className="text-xs text-green-500 pl-6">Fecha pedido: {order.date}</p>
{despachos.map(d => (
                      <div key={d.id} className="text-xs text-gray-700 flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                        <span>Placa: <strong>{d.placa}</strong></span>
                        <span>PLC: {d.plc}</span>
                        <span>{d.kg} kg</span>
                        <span>Cargue: {d.cargue_time}</span>
                        <span>Inicio: {d.cargue_start}</span>
                        <span>Fin: {d.cargue_end}</span>
                        {d.ruta && <span className="text-blue-600">Ruta: {toUpperCase(d.ruta)}</span>}
                        {d.date && <span>Fecha: {d.date}</span>}
                        {d.created_at && <span>Registrado: {d.created_at.slice(0, 16).replace('T', ' ')}</span>}
                        {d.created_by && <span className="text-gray-400">Por: {toUpperCase(d.created_by)}</span>}
                        <button onClick={() => handleEditDespacho(d)}
                          className="text-blue-600 hover:text-blue-800 underline text-[10px] px-1 py-0.5 rounded"
                          title="Editar peso">
                          <Edit className="w-3 h-3 inline mr-0.5" /> Editar
                        </button>
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

      {passwordModal && (
        <PasswordModal
          title={passwordModal.title}
          message={passwordModal.message}
          onConfirm={passwordModal.action}
          onCancel={() => setPasswordModal(null)}
        />
      )}
    </div>
  );
}