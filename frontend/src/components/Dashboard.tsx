import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { Package, Scale, TrendingUp, Clock, Gauge, Truck, Container, MapPin, Users, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';
import { getDashboard, getOrdersForDispatch, getDespachos, getOrders } from '../api';
import type { DashboardData, Order } from '../types';
import { getToday, getOverdueDays, getCargueStandardKgPerHour, getDescargueStandardKgPerHour, formatEfficiency } from '../utils';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1d4ed8', '#db2777', '#f59e0b'];

type TabId = 'produccion' | 'despachos' | 'descargue';

interface TabDef {
  id: TabId;
  label: string;
  icon: any;
}

const TABS: TabDef[] = [
  { id: 'produccion', label: 'Producción', icon: Package },
  { id: 'despachos', label: 'Despachos', icon: Truck },
  { id: 'descargue', label: 'Descargue', icon: Container },
];

function KpiCard({ icon: Icon, label, value, color, trend, trendLabel }: {
  icon: any; label: string; value: string; color: string; trend?: number; trendLabel?: string;
}) {
  const isUp = (trend ?? 0) >= 0;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`${color} p-3 rounded-xl text-white shrink-0 shadow-sm`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
        {trend !== undefined && (
          <p className={`flex items-center gap-0.5 text-xs font-medium mt-0.5 ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
            {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trendLabel || `${Math.abs(trend)}%`}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>('');
  const [date, setDate] = useState(getToday());
  const [activeTab, setActiveTab] = useState<TabId>('produccion');
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueDays, setOverdueDays] = useState(0);

  useEffect(() => {
    load();
  }, [period, date]);

  async function load() {
    setLoading(true);
    try {
      const d = await getDashboard(period ? { period, date } : {});
      setData(d);

      // Calculate overdue stats from pending dispatch orders
      try {
        const pending = await getOrdersForDispatch();
        let count = 0;
        let days = 0;
        for (const o of pending) {
          const od = getOverdueDays(o.date, o.type);
          if (od > 0) { count++; days += od; }
        }
        setOverdueCount(count);
        setOverdueDays(days);
      } catch {}
    } catch {
      console.error('Error loading dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
            {[
              { id: '', label: 'Todo' },
              { id: 'day', label: 'Hoy' },
              { id: 'week', label: 'Semana' },
              { id: 'month', label: 'Mes' },
            ].map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={`px-3.5 py-2 text-xs font-medium transition-all ${
                  period === p.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          {period && (
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500" />
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 flex gap-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Producción ── */}
      {activeTab === 'produccion' && (
        <div className="space-y-4 animate-[fadeIn_0.2s_ease]">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            <KpiCard icon={Package} label="Pedidos" value={String(data.total_orders)} color="bg-blue-600" />
            <KpiCard icon={Scale} label="Kg procesados" value={`${data.total_kg.toLocaleString()} kg`} color="bg-emerald-600" />
            <KpiCard icon={TrendingUp} label="Eficiencia prom." value={`${data.avg_efficiency.toFixed(2)}%`} color="bg-purple-600" />
            <KpiCard icon={Gauge} label="Prom. kg/h" value={`${data.avg_kg_per_hour.toFixed(2)}`} color="bg-orange-600" />
            <KpiCard icon={Clock} label="Horas trabajadas" value={`${data.total_hours.toFixed(2)} h`} color="bg-red-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Kg por operario
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.kgByOperator}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="operator" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar dataKey="total_kg" fill="#2563eb" radius={[6, 6, 0, 0]} name="Kg" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                Eficiencia por operario
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.kgByOperator}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="operator" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar dataKey="avg_efficiency" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Eficiencia" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" />
                Producción por día
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.productionByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Line yAxisId="left" type="monotone" dataKey="total_kg" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: '#2563eb' }} name="Kg" />
                  <Line yAxisId="left" type="monotone" dataKey="total_orders" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} name="Pedidos" />
                  <Line yAxisId="right" type="monotone" dataKey="avg_efficiency" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: '#8b5cf6' }} name="Eficiencia %" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-600" />
                Producción por tipo
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.productionByType}
                    cx="50%" cy="50%"
                    labelLine={false}
                    label={({ type, total_kg }) => `${type}: ${total_kg} kg`}
                    outerRadius={80}
                    dataKey="total_kg" nameKey="type"
                  >
                    {data.productionByType.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Tabla resumen por operario ── */}
          {data.kgByOperator.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  Rendimiento por operario
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Operario</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Pedidos</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Kg</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Kg/h</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Eficiencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.kgByOperator.map(op => (
                      <tr key={op.operator} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{op.operator}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{op.total_orders}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{op.total_kg.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{op.avg_kg_per_hour.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                            op.avg_efficiency >= 100 ? 'bg-green-100 text-green-800' : op.avg_efficiency >= 80 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {op.avg_efficiency.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Despachos ── */}
      {activeTab === 'despachos' && (
        <div className="space-y-4 animate-[fadeIn_0.2s_ease]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard icon={Scale} label="Kg despachados" value={`${data.despachos.total_kg.toLocaleString()} kg`} color="bg-emerald-600" />
            <KpiCard icon={Truck} label="Vehículos cargados" value={String(data.despachos.total_vehiculos)} color="bg-blue-600" />
            <KpiCard icon={MapPin} label="Rutas diferentes" value={String(data.despachos.total_rutas)} color="bg-purple-600" />
            <KpiCard icon={Gauge} label="Eficiencia cargue" value={formatEfficiency(data.despachos.avg_efficiency)} color="bg-purple-600" />
            <KpiCard icon={AlertTriangle} label="Pedidos con retraso" value={`${overdueCount} (${overdueDays} días)`} color="bg-red-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-sm">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Total despachado</p>
                  <p className="text-2xl font-bold text-blue-900">{data.despachos.total_kg.toLocaleString()} kg</p>
                </div>
              </div>
              <div className="h-2 bg-blue-200/50 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, (data.despachos.total_kg / (data.total_kg || 1)) * 100)}%` }} />
              </div>
              <p className="text-xs text-blue-500 mt-1.5">{((data.despachos.total_kg / (data.total_kg || 1)) * 100).toFixed(1)}% del total producido</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Vehículos</h3>
              <p className="text-3xl font-bold text-gray-900">{data.despachos.total_vehiculos}</p>
              <p className="text-xs text-gray-500 mt-1">
                {data.despachos.total_vehiculos > 0
                  ? `Prom. ${(data.despachos.total_kg / data.despachos.total_vehiculos).toFixed(0)} kg/vehículo`
                  : 'Sin registros'}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Rutas</h3>
              <p className="text-3xl font-bold text-gray-900">{data.despachos.total_rutas}</p>
              <p className="text-xs text-gray-500 mt-1">
                {data.despachos.total_rutas > 0
                  ? `${(data.despachos.total_vehiculos / data.despachos.total_rutas).toFixed(1)} vehículos/ruta`
                  : 'Sin registros'}
              </p>
            </div>

            <div className={`rounded-xl border p-4 ${data.despachos.avg_efficiency >= 100 ? 'bg-purple-50 border-purple-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 text-gray-500">
                Cargue: {data.despachos.avg_kg_per_hour.toFixed(0)} kg/h
              </h3>
              <p className={`text-3xl font-bold ${data.despachos.avg_efficiency >= 100 ? 'text-purple-900' : 'text-yellow-900'}`}>
                {formatEfficiency(data.despachos.avg_efficiency)}
              </p>
              <p className="text-xs mt-1 text-gray-500">
                Estándar: {getCargueStandardKgPerHour().toLocaleString()} kg/h
              </p>
            </div>

            <div className="bg-red-50 rounded-xl border border-red-200 p-4">
              <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Retrasos</h3>
              <p className="text-3xl font-bold text-red-900">{overdueCount}</p>
              <p className="text-xs text-red-500 mt-1">
                {overdueDays > 0 ? `${overdueDays} días de retraso acumulados` : 'Sin retrasos'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Descargue ── */}
      {activeTab === 'descargue' && (
        <div className="space-y-4 animate-[fadeIn_0.2s_ease]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={Scale} label="Kg descargados" value={`${data.descargues.total_kg.toLocaleString()} kg`} color="bg-emerald-600" />
            <KpiCard icon={Container} label="PTM registrados" value={String(data.descargues.total_ptm)} color="bg-blue-600" />
            <KpiCard icon={Clock} label="Horas descargue" value={`${data.descargues.total_hours.toFixed(2)} h`} color="bg-red-600" />
            <KpiCard icon={Gauge} label="Eficiencia descargue" value={formatEfficiency(data.descargues.avg_efficiency)} color="bg-emerald-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-emerald-600 p-2.5 rounded-xl text-white shadow-sm">
                  <Container className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Total descargado</p>
                  <p className="text-2xl font-bold text-emerald-900">{data.descargues.total_kg.toLocaleString()} kg</p>
                </div>
              </div>
              <div className="h-2 bg-emerald-200/50 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.min(100, (data.descargues.total_kg / (data.total_kg || 1)) * 100)}%` }} />
              </div>
              <p className="text-xs text-emerald-500 mt-1.5">{((data.descargues.total_kg / (data.total_kg || 1)) * 100).toFixed(1)}% del total producido</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Contenedores (PTM)</h3>
              <p className="text-3xl font-bold text-gray-900">{data.descargues.total_ptm}</p>
              <p className="text-xs text-gray-500 mt-1">
                {data.descargues.total_ptm > 0
                  ? `Prom. ${(data.descargues.total_kg / data.descargues.total_ptm).toFixed(0)} kg/contenedor`
                  : 'Sin registros'}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Horas de descargue</h3>
              <p className="text-3xl font-bold text-gray-900">{data.descargues.total_hours.toFixed(2)} h</p>
              <p className="text-xs text-gray-500 mt-1">
                {data.descargues.total_hours > 0 && data.descargues.total_ptm > 0
                  ? `Prom. ${(data.descargues.total_hours / data.descargues.total_ptm).toFixed(2)} h/contenedor`
                  : 'Sin registros'}
              </p>
            </div>

            <div className={`rounded-xl border p-4 ${data.descargues.avg_efficiency >= 100 ? 'bg-emerald-50 border-emerald-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 text-gray-500">
                Descargue: {data.descargues.avg_kg_per_hour.toFixed(0)} kg/h
              </h3>
              <p className={`text-3xl font-bold ${data.descargues.avg_efficiency >= 100 ? 'text-emerald-900' : 'text-yellow-900'}`}>
                {formatEfficiency(data.descargues.avg_efficiency)}
              </p>
              <p className="text-xs mt-1 text-gray-500">
                Estándar: {getDescargueStandardKgPerHour().toLocaleString()} kg/h
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
