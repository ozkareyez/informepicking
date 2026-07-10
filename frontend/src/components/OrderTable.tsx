import { useState, useEffect, useMemo } from 'react';
import { Search, ArrowUpDown, Edit, Trash2, FileSpreadsheet, ChevronLeft, ChevronRight, Trash, User, Truck, Download } from 'lucide-react';
import { getOrders, deleteOrder, clearAllData, deleteOrdersByDateRange, getAllDespachos, getUnloadings } from '../api';
import type { Order, Despacho, Unloading } from '../types';
import { calculateKgPerHour, calculateEfficiency, getOverdueDays, getWeekNumber } from '../utils';
import * as XLSX from 'xlsx';

const EXCEL_COL_WIDTHS = [
  { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 10 },
  { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
  { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 16 },
  { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
  { wch: 14 },
];

const EXCEL_HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, size: 11 },
  fill: { fgColor: { rgb: '2563EB' } },
  alignment: { horizontal: 'center', vertical: 'center' as const },
  border: {
    top: { style: 'thin' as const, color: { rgb: 'CCCCCC' } },
    bottom: { style: 'thin' as const, color: { rgb: 'CCCCCC' } },
    left: { style: 'thin' as const, color: { rgb: 'CCCCCC' } },
    right: { style: 'thin' as const, color: { rgb: 'CCCCCC' } },
  },
};
import PasswordModal from './PasswordModal';

interface Props {
  refreshTrigger: number;
  onEdit: (order: Order) => void;
  onDelete: () => void;
}

const PAGE_SIZE = 10;

export default function OrderTable({ refreshTrigger, onEdit, onDelete }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cliente, setCliente] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [passwordAction, setPasswordAction] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [showDateDelete, setShowDateDelete] = useState(false);
  const [deleteStartDate, setDeleteStartDate] = useState('');
  const [deleteEndDate, setDeleteEndDate] = useState('');
  const [deleteWeek, setDeleteWeek] = useState('');

  useEffect(() => {
    load();
  }, [refreshTrigger, sortBy, sortOrder, statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const data = await getOrders({ cliente, date, type, status: statusFilter || undefined, sortBy, sortOrder });
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

  function applyHeaderStyle(ws: XLSX.WorkSheet) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[addr]) ws[addr].s = EXCEL_HEADER_STYLE;
    }
    for (let r = 1; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws[addr]) {
          ws[addr].s = {
            alignment: { vertical: 'center' as const },
            border: {
              top: { style: 'thin' as const, color: { rgb: 'EEEEEE' } },
              bottom: { style: 'thin' as const, color: { rgb: 'EEEEEE' } },
              left: { style: 'thin' as const, color: { rgb: 'EEEEEE' } },
              right: { style: 'thin' as const, color: { rgb: 'EEEEEE' } },
            },
          };
        }
      }
    }
  }

  function calcEfficiencyFromKgph(kgph: number | null): string {
    if (kgph == null || kgph === 0) return '';
    return `${calculateEfficiency(kgph).toFixed(2)}%`;
  }

  function parseHours(timeSpent: string | null): number {
    if (!timeSpent) return 0;
    const m = timeSpent.match(/(\d+)h\s*(\d+)m/);
    return m ? parseInt(m[1]) + parseInt(m[2]) / 60 : 0;
  }

  async function exportToExcel() {
    if (orders.length === 0) {
      alert('No hay pedidos para exportar');
      return;
    }

    const wb = XLSX.utils.book_new();

    // ─── Sheet 1: Registros (orders + despachos unificados) ───
    const despachoRows: Record<number, Despacho[]> = {};
    try {
      const allDespachos = await getAllDespachos();
      for (const d of allDespachos) {
        if (!despachoRows[d.order_id]) despachoRows[d.order_id] = [];
        despachoRows[d.order_id].push(d);
      }
    } catch {}

    const registros: any[] = [];
    for (const o of orders) {
      const despachos = despachoRows[o.id] || [];
      const kgph = o.kg_per_hour ?? calculateKgPerHour(o.kg, parseHours(o.time_spent));
      const eficiencia = calcEfficiencyFromKgph(kgph);
      const diasRetraso = getOverdueDays(o.date, o.type);

      const semana = getWeekNumber(o.date);
      if (despachos.length === 0) {
        registros.push({
          Semana: semana,
          Fecha: o.date,
          Cliente: o.cliente,
          PLC: '',
          Placa: '',
          SKU: o.sku,
          Kg: o.kg,
          Operario: o.operator,
          Eficiencia: eficiencia,
          'Tiempo alistamiento': o.time_spent ?? '',
          'Fecha despacho': '',
          'Tiempo cargue': '',
          'Kg despachados': o.despachado_kg,
          'Días retraso': diasRetraso,
        });
      } else {
        for (const d of despachos) {
          registros.push({
            Semana: semana,
            Fecha: o.date,
            Cliente: o.cliente,
            PLC: d.plc,
            Placa: d.placa,
            SKU: o.sku,
            Kg: o.kg,
            Operario: o.operator,
            Eficiencia: eficiencia,
            'Tiempo alistamiento': o.time_spent ?? '',
            'Fecha despacho': d.created_at?.slice(0, 10) ?? '',
            'Tiempo cargue': d.cargue_time,
            'Kg despachados': d.kg,
            'Días retraso': diasRetraso,
          });
        }
      }
    }

    const wsReg = XLSX.utils.json_to_sheet(registros);
    wsReg['!cols'] = [
      { wch: 8 }, { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 14 },
      { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 10 },
      { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 12 },
    ];
    applyHeaderStyle(wsReg);
    XLSX.utils.book_append_sheet(wb, wsReg, 'Registros');

    // ─── Sheet 2: Descargues ───
    try {
      const allUnloadings = await getUnloadings();
      if (allUnloadings.length > 0) {
        const uncData = allUnloadings.map(u => ({
          Fecha: u.date,
          PTM: u.ptm,
          Kg: u.kg,
          Operarios: u.operators.join(', '),
          'Hora inicio': u.start_time,
          'Hora final': u.end_time,
          'Tiempo descargue': u.time_spent ?? '',
        }));
        const wsUnc = XLSX.utils.json_to_sheet(uncData);
        wsUnc['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
        applyHeaderStyle(wsUnc);
        XLSX.utils.book_append_sheet(wb, wsUnc, 'Descargues');
      }
    } catch {}

    // ─── Sheet 3: Resumen ───
    const totalOrders = orders.length;
    const totalKg = orders.reduce((s, o) => s + o.kg, 0);
    const completed = orders.filter(o => o.status === 'completed' || o.status === 'despachado');
    const avgEff = completed.length > 0 ? completed.reduce((s, o) => s + (o.efficiency ?? 0), 0) / completed.length : 0;
    const avgKgph = completed.length > 0 ? completed.reduce((s, o) => s + (o.kg_per_hour ?? 0), 0) / completed.length : 0;
    let totalHours = 0;
    for (const o of completed) totalHours += parseHours(o.time_spent);

    const opMap = new Map<string, { kg: number; count: number; sumEff: number }>();
    const tpMap = new Map<string, { kg: number; count: number }>();
    for (const o of orders) {
      const op = opMap.get(o.operator || 'Sin asignar') ?? { kg: 0, count: 0, sumEff: 0 };
      op.kg += o.kg; op.count++; op.sumEff += o.efficiency ?? 0; opMap.set(o.operator || 'Sin asignar', op);
      const tp = tpMap.get(o.type) ?? { kg: 0, count: 0 };
      tp.kg += o.kg; tp.count++; tpMap.set(o.type, tp);
    }

    const summary = [
      { Indicador: 'Total de pedidos', Valor: totalOrders },
      { Indicador: 'Total de kg', Valor: totalKg },
      { Indicador: 'Promedio de eficiencia', Valor: avgEff > 0 ? `${avgEff.toFixed(2)}%` : 'N/A' },
      { Indicador: 'Promedio de kg/h', Valor: avgKgph > 0 ? avgKgph.toFixed(2) : 'N/A' },
      { Indicador: 'Total de horas', Valor: totalHours.toFixed(2) },
      { Indicador: '', Valor: '' },
      { Indicador: 'Producción por operario', Valor: '' },
      ...Array.from(opMap.entries()).map(([op, d]) => ({
        Indicador: op,
        Valor: `${d.kg} kg (${d.count} pedidos) · Efic: ${(d.sumEff / d.count).toFixed(2)}%`,
      })),
      { Indicador: '', Valor: '' },
      { Indicador: 'Producción por tipo', Valor: '' },
      ...Array.from(tpMap.entries()).map(([tp, d]) => ({ Indicador: tp, Valor: `${d.kg} kg (${d.count} pedidos)` })),
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summary);
    applyHeaderStyle(wsSummary);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleClearAll() {
    await clearAllData();
    onDelete();
    load();
  }

  async function handleDeleteByDateRange() {
    setPasswordAction({
      title: 'Limpiar por rango de fechas',
      message: `Se eliminarán los pedidos, despachos y descargues desde ${deleteStartDate} hasta ${deleteEndDate}. ¿Continuar?`,
      action: async () => {
        await deleteOrdersByDateRange(deleteStartDate, deleteEndDate);
        setShowDateDelete(false);
        setDeleteStartDate('');
        setDeleteEndDate('');
        setDeleteWeek('');
        onDelete();
        load();
      },
    });
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

  const filtered = useMemo(() => {
    let result = orders;
    if (cliente) result = result.filter(o => o.cliente.toLowerCase().includes(cliente.toLowerCase()));
    if (date) result = result.filter(o => o.date === date);
    if (type) result = result.filter(o => o.type === type);
    return result;
  }, [orders, cliente, date, type]);

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
    <div className="space-y-3">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[140px] relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" placeholder="Buscar cliente..." value={cliente}
              onChange={e => { setCliente(e.target.value); setPage(0); }}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="w-[140px]">
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setPage(0); }}
              className="w-full px-2.5 py-1.5 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={type} onChange={e => { setType(e.target.value); setPage(0); }}
            className="w-[120px] px-2.5 py-1.5 rounded-md border border-gray-300 text-sm">
            <option value="">Tipo</option>
            <option value="Masivo">Masivo</option>
            <option value="Venta Directa">Venta Directa</option>
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            className="w-[130px] px-2.5 py-1.5 rounded-md border border-gray-300 text-sm">
            <option value="">Estado</option>
            <option value="sin_operario">Sin operario</option>
            <option value="pending">En progreso</option>
            <option value="completed">Completado</option>
            <option value="despachado">Despachado</option>
          </select>
          <button onClick={exportToExcel}
            className="inline-flex items-center gap-1 bg-green-600 text-white px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-green-700">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel
          </button>
          <button onClick={() => setPasswordAction({
            title: 'Limpiar datos',
            message: 'Se eliminarán TODOS los pedidos de la base de datos. Esta acción no se puede deshacer.',
            action: handleClearAll,
          })}
            className="inline-flex items-center gap-1 bg-red-600 text-white px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-red-700">
            <Trash className="w-3.5 h-3.5" />
            Limpiar
          </button>
          <button onClick={() => {
            if (orders.length === 0) { alert('No hay datos para descargar'); return; }
            setPasswordAction({
              title: 'Descargar y limpiar',
              message: 'Se descargará el Excel y luego se eliminarán TODOS los pedidos. ¿Continuar?',
              action: async () => {
                await exportToExcel();
                await clearAllData();
                onDelete();
                load();
              },
            });
          }}
            className="inline-flex items-center gap-1 bg-orange-600 text-white px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-orange-700">
            <Download className="w-3.5 h-3.5" />
            D/L + Limpiar
          </button>
          <button onClick={() => setShowDateDelete(true)}
            className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-red-200">
            <Trash className="w-3.5 h-3.5" />
            Limpiar por fecha
          </button>
        </div>
      </div>

      {showDateDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Eliminar por rango de fechas</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Semana</label>
                  <input type="number" min="1" max="53" value={deleteWeek} onChange={e => handleWeekChange(e.target.value)}
                    placeholder="Ej: 28"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <span className="text-xs text-gray-400 mt-5">o</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fecha inicio</label>
                  <input type="date" value={deleteStartDate} onChange={e => { setDeleteStartDate(e.target.value); setDeleteWeek(''); }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fecha fin</label>
                  <input type="date" value={deleteEndDate} onChange={e => { setDeleteEndDate(e.target.value); setDeleteWeek(''); }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button onClick={() => { setShowDateDelete(false); setDeleteStartDate(''); setDeleteEndDate(''); setDeleteWeek(''); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">
                  Cancelar
                </button>
                <button onClick={handleDeleteByDateRange} disabled={!deleteStartDate || !deleteEndDate}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
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
                <SortHeader column="efficiency">Efic.</SortHeader>
                <SortHeader column="type">Tipo</SortHeader>
                <SortHeader column="plc">PLC</SortHeader>
                <SortHeader column="placa">Placa</SortHeader>
                <SortHeader column="cargue_time">Cargue</SortHeader>
                <SortHeader column="status">Estado</SortHeader>
                <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Creado por</th>
                <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={16} className="px-3 py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-3 py-8 text-center text-gray-500 text-sm">No hay pedidos</td>
                </tr>
              ) : (
                paginated.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 py-1.5 text-xs text-gray-900 whitespace-nowrap">{order.date}</td>
                    <td className="px-2 py-1.5 text-xs font-medium text-gray-900 truncate max-w-[100px]">{order.cliente}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-700">{order.sku}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-700">{order.kg}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-700">{order.operator}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 whitespace-nowrap">{order.start_time}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 whitespace-nowrap">{val(order.end_time)}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-700">{val(order.time_spent)}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-700">{val(order.kg_per_hour)}</td>
                    <td className="px-2 py-1.5 text-xs">
                      {order.efficiency != null ? (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          order.efficiency >= 100 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.efficiency.toFixed(1)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-xs">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        order.type === 'Masivo' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {order.type === 'Masivo' ? 'M' : 'VD'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-700">{val(order.plc)}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-700">{val(order.placa)}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-700">{val(order.cargue_time)}</td>
                    <td className="px-2 py-1.5 text-xs">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        order.status === 'despachado' ? 'bg-green-100 text-green-800' : order.status === 'completed' ? 'bg-blue-100 text-blue-800' : order.status === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status === 'despachado' ? 'Desp' : order.status === 'completed' ? 'Comp' : order.status === 'pending' ? 'Prog' : 'Sin Op'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-500">{order.created_by || '-'}</td>
                    <td className="px-2 py-1.5 text-xs">
                      <div className="flex items-center gap-1">
                        <button onClick={() => onEdit(order)}
                          className="p-1 rounded text-blue-600 hover:bg-blue-50 transition-colors">
                          <Edit className="w-3 h-3" />
                        </button>
                        {confirmDelete === order.id ? (
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => handleDelete(order.id)}
                              className="px-1.5 py-0.5 text-[10px] bg-red-600 text-white rounded hover:bg-red-700">Sí</button>
                            <button onClick={() => setConfirmDelete(null)}
                              className="px-1.5 py-0.5 text-[10px] bg-gray-200 text-gray-700 rounded hover:bg-gray-300">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(order.id)}
                            className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3 h-3" />
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

        {/* Mobile cards */}
        <div className="block md:hidden divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">No hay pedidos</div>
          ) : (
            paginated.map(order => (
              <div key={order.id} className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold text-gray-900 truncate">{order.cliente}</span>
                    <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      order.type === 'Masivo' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>{order.type === 'Masivo' ? 'M' : 'VD'}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onEdit(order)} className="p-1 rounded text-blue-600 hover:bg-blue-50">
                      <Edit className="w-3 h-3" />
                    </button>
                    {confirmDelete === order.id ? (
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => handleDelete(order.id)} className="px-1.5 py-0.5 text-[10px] bg-red-600 text-white rounded">Sí</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-1.5 py-0.5 text-[10px] bg-gray-200 rounded">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(order.id)} className="p-1 rounded text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600 mt-0.5">
                  <span>{order.date}</span>
                  <span>{order.kg} kg</span>
                  <span>{order.operator}</span>
                  <span>{order.start_time}-{val(order.end_time)}</span>
                  <span>{val(order.time_spent)}</span>
                  {order.efficiency != null && <span className={order.efficiency >= 100 ? 'text-green-600' : 'text-orange-500'}>{order.efficiency.toFixed(1)}%</span>}
                  {order.plc && <span>PLC:{order.plc}</span>}
                  {order.placa && <span>Placa:{order.placa}</span>}
                  {order.cargue_time && <span>Cargue:{order.cargue_time}</span>}
                  {order.created_by && <span className="text-gray-400">Por: {order.created_by}</span>}
                  <span className={`inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium ${
                    order.status === 'despachado' ? 'bg-green-100 text-green-800' : order.status === 'completed' ? 'bg-blue-100 text-blue-800' : order.status === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status === 'despachado' ? 'Desp' : order.status === 'completed' ? 'Comp' : order.status === 'pending' ? 'Prog' : 'Sin Op'}
                  </span>
                </div>
              </div>
            ))
          )}
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

      {passwordAction && (
        <PasswordModal
          title={passwordAction.title}
          message={passwordAction.message}
          onConfirm={() => { passwordAction.action(); setPasswordAction(null); }}
          onCancel={() => setPasswordAction(null)}
        />
      )}
    </div>
  );
}
