import { useState, useEffect, useMemo } from 'react';
import { Search, ArrowUpDown, Edit, Trash2, FileSpreadsheet, ChevronLeft, ChevronRight, Trash } from 'lucide-react';
import { getOrders, deleteOrder, clearAllData } from '../api';
import type { Order } from '../types';
import * as XLSX from 'xlsx';

interface Props {
  refreshTrigger: number;
  onEdit: (order: Order) => void;
  onDelete: () => void;
}

const PAGE_SIZE = 10;

export default function OrderTable({ refreshTrigger, onEdit, onDelete }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [operator, setOperator] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, [refreshTrigger, sortBy, sortOrder]);

  async function load() {
    setLoading(true);
    try {
      const data = await getOrders({ search, operator, date, type, status: 'completed', sortBy, sortOrder });
      setOrders(data);
    } catch {
      console.error('Error loading orders');
    } finally {
      setLoading(false);
    }
  }

  function handleSort(column: string) {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteOrder(id);
      setConfirmDelete(null);
      onDelete();
      load();
    } catch {
      alert('Error al eliminar');
    }
  }

  async function exportToExcel() {
    const completed = orders.filter(o => o.status === 'completed');
    const data = completed.map(o => ({
      Fecha: o.date,
      Cliente: o.cliente,
      SKU: o.sku,
      Kg: o.kg,
      Operario: o.operator,
      'Hora inicio': o.start_time,
      'Hora final': o.end_time ?? '',
      'Tiempo empleado': o.time_spent ?? '',
      'Kg por hora': o.kg_per_hour ?? '',
      'Eficiencia %': o.efficiency != null ? `${o.efficiency.toFixed(2)}%` : '',
      'Tipo de pedido': o.type,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');

    const totalOrders = completed.length;
    const totalKg = completed.reduce((s, o) => s + o.kg, 0);
    const avgEff = totalOrders > 0 ? completed.reduce((s, o) => s + (o.efficiency ?? 0), 0) / totalOrders : 0;
    const avgKgph = totalOrders > 0 ? completed.reduce((s, o) => s + (o.kg_per_hour ?? 0), 0) / totalOrders : 0;
    let totalHours = 0;
    for (const o of completed) {
      const m = o.time_spent?.match(/(\d+)h\s*(\d+)m/);
      if (m) totalHours += parseInt(m[1]) + parseInt(m[2]) / 60;
    }

    const opMap = new Map<string, { kg: number; count: number }>();
    const tpMap = new Map<string, { kg: number; count: number }>();
    for (const o of completed) {
      const op = opMap.get(o.operator) ?? { kg: 0, count: 0 };
      op.kg += o.kg; op.count++; opMap.set(o.operator, op);
      const tp = tpMap.get(o.type) ?? { kg: 0, count: 0 };
      tp.kg += o.kg; tp.count++; tpMap.set(o.type, tp);
    }

    const summary = [
      { Indicador: 'Total de pedidos', Valor: totalOrders },
      { Indicador: 'Total de kg', Valor: totalKg },
      { Indicador: 'Promedio de eficiencia', Valor: `${avgEff.toFixed(2)}%` },
      { Indicador: 'Promedio de kg/h', Valor: avgKgph.toFixed(2) },
      { Indicador: 'Total de horas', Valor: totalHours.toFixed(2) },
      { Indicador: '', Valor: '' },
      { Indicador: 'Producción por operario', Valor: '' },
      ...Array.from(opMap.entries()).map(([op, d]) => ({ Indicador: op, Valor: `${d.kg} kg (${d.count} pedidos)` })),
      { Indicador: '', Valor: '' },
      { Indicador: 'Producción por tipo de pedido', Valor: '' },
      ...Array.from(tpMap.entries()).map(([tp, d]) => ({ Indicador: tp, Valor: `${d.kg} kg (${d.count} pedidos)` })),
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const file = new File([blob], `pedidos_${new Date().toISOString().slice(0, 10)}.xlsx`, { type: blob.type });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Pedidos' });
        return;
      } catch {}
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleClearAll() {
    if (!confirm('¿Eliminar TODOS los datos? Esta acción no se puede deshacer.')) return;
    await clearAllData();
    onDelete();
    load();
  }

  const filtered = useMemo(() => {
    let result = orders;
    if (search) result = result.filter(o => o.sku.toLowerCase().includes(search.toLowerCase()));
    if (operator) result = result.filter(o => o.operator.toLowerCase().includes(operator.toLowerCase()));
    if (date) result = result.filter(o => o.date === date);
    if (type) result = result.filter(o => o.type === type);
    return result;
  }, [orders, search, operator, date, type]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const SortHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
      onClick={() => handleSort(column)}>
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`w-3 h-3 ${sortBy === column ? 'text-blue-600' : 'text-gray-400'}`} />
      </div>
    </th>
  );

  function val(v: any) {
    return v ?? '-';
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buscar por SKU..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <input type="text" placeholder="Buscar por operario..." value={operator}
              onChange={e => { setOperator(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="w-[160px]">
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="w-[150px]">
            <select value={type} onChange={e => { setType(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">Todos los tipos</option>
              <option value="Masivo">Masivo</option>
              <option value="Venta Directa">Venta Directa</option>
            </select>
          </div>
          <button onClick={exportToExcel}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel
          </button>
          <button onClick={handleClearAll}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
            <Trash className="w-4 h-4" />
            Limpiar datos
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <SortHeader column="date">Fecha</SortHeader>
                <SortHeader column="cliente">Cliente</SortHeader>
                <SortHeader column="sku">SKU</SortHeader>
                <SortHeader column="kg">Kg</SortHeader>
                <SortHeader column="operator">Operario</SortHeader>
                <SortHeader column="start_time">Inicio</SortHeader>
                <SortHeader column="end_time">Final</SortHeader>
                <SortHeader column="time_spent">Tiempo</SortHeader>
                <SortHeader column="kg_per_hour">Kg/h</SortHeader>
                <SortHeader column="efficiency">Eficiencia</SortHeader>
                <SortHeader column="type">Tipo</SortHeader>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-3 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-12 text-center text-gray-500">No hay pedidos completados</td>
                </tr>
              ) : (
                paginated.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">{order.date}</td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-900 truncate max-w-[120px]">{order.cliente}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">{order.sku}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">{order.kg}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">{order.operator}</td>
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{order.start_time}</td>
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{val(order.end_time)}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">{val(order.time_spent)}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">{val(order.kg_per_hour)}</td>
                    <td className="px-3 py-3 text-sm">
                      {order.efficiency != null ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          order.efficiency >= 100 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.efficiency.toFixed(2)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.type === 'Masivo' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {order.type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button onClick={() => onEdit(order)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        {confirmDelete === order.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(order.id)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700">Sí</button>
                            <button onClick={() => setConfirmDelete(null)}
                              className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(order.id)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              {filtered.length} registros — Página {page + 1} de {totalPages}
            </p>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className={`px-3 py-1.5 text-sm rounded-lg ${
                    page === i ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'
                  }`}>
                  {i + 1}
                </button>
              ))}
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
