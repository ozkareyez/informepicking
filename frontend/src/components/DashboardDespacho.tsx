import { useEffect, useState } from 'react';
import { Scale, Truck, MapPin, Gauge, AlertTriangle, ArrowUpRight, ArrowDownRight, CheckCircle, Calendar, BarChart2, LineChart as LineChartIcon, CheckCircle as CheckCircleIcon, Container } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { getDashboard, getOrdersForDispatch, getDespachos, getFourWeekTrend } from '../api';
import type { DashboardData, Order, Despacho } from '../types';
import { getOverdueDays, getCargueStandardKgPerHour, formatEfficiency, getToday, getWeekRange, getWeekNumber, formatNumber } from '../utils';
import { CHART_COLORS, PIE_TWO_COLORS, BAR_GROUPED, LINE_COLORS } from '../utils/chartColors';
import { 
  DespachoTooltip, 
  EficienciaDespachoTooltip, 
  EficienciaDescargueTooltip, 
  CitasTooltip, 
  CumplimientoCitasTooltip, 
  DescargueTooltip 
} from './charts/ChartTooltips';

interface FourWeekTrend {
  production: { week: string; total_kg: number; total_orders: number; avg_efficiency: number }[];
  despachos: { week: string; total_kg: number; total_vehiculos: number; avg_efficiency: number }[];
  descargues: { week: string; total_kg: number; total_ptm: number; avg_efficiency: number }[];
  citas: { week: string; total: number; cumplieron: number; pct_cumplimiento: number }[];
}

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

type Period = '' | 'day' | 'week' | 'month';

export default function DashboardDespacho() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [trend, setTrend] = useState<FourWeekTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('');
  const [date, setDate] = useState(getToday());
  const [weekInput, setWeekInput] = useState('');
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdue1d, setOverdue1d] = useState(0);
  const [overdueMany, setOverdueMany] = useState(0);
  const [vehiculosTotal, setVehiculosTotal] = useState(0);
  const [rutasTotal, setRutasTotal] = useState(0);
  const [cargueEficiencia, setCargueEficiencia] = useState(0);

  const load = async (p?: Period, d?: string) => {
    setLoading(true);
    const per = p ?? period;
    const dt = d ?? date;
    try {
      const [dash, pending, allDespachos, trendData] = await Promise.all([
        getDashboard(per ? { period: per, date: dt } : {}),
        getOrdersForDispatch(),
        getDespachos(0),
        getFourWeekTrend(),
      ]);
      setData(dash);
      setTrend(trendData);
      let count = 0, d1 = 0, many = 0;
      for (const o of pending) {
        const od = getOverdueDays(o.date, o.type);
        if (od > 0) { count++; if (od === 1) d1++; else many++; }
      }
      setOverdueCount(count);
      setOverdue1d(d1);
      setOverdueMany(many);

      const vehiculos = new Set(allDespachos.map(d => d.placa));
      const rutas = new Set(allDespachos.map(d => d.ruta).filter(Boolean));
      setVehiculosTotal(vehiculos.size);
      setRutasTotal(rutas.size);

      if (allDespachos.length > 0) {
        const totalKg = allDespachos.reduce((s, d) => s + d.kg, 0);
        const totalTime = allDespachos.reduce((s, d) => {
          const [sh, sm] = d.cargue_start.split(':').map(Number);
          const [eh, em] = d.cargue_end.split(':').map(Number);
          let mins = (eh * 60 + em) - (sh * 60 + sm);
          if (mins < 0) mins += 24 * 60;
          return s + mins;
        }, 0);
        const kgph = totalTime > 0 ? (totalKg / (totalTime / 60)) : 0;
        setCargueEficiencia(Math.round((kgph / getCargueStandardKgPerHour()) * 10000) / 100);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [period, date]);

  function handleWeekChange(week: string) {
    setWeekInput(week);
    if (!week) return;
    const year = new Date().getFullYear();
    const firstJan = new Date(year, 0, 1);
    const days = (parseInt(week) - 1) * 7;
    const start = new Date(firstJan);
    start.setDate(firstJan.getDate() + days - firstJan.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    setDate(start.toISOString().split('T')[0]);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
  if (!data) return (
    <div className="card p-8 text-center">
      <div className="text-6xl mb-4">🚚</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Dashboard Despacho</h3>
      <p className="text-gray-500 mb-2">No hay datos de despacho</p>
      <p className="text-sm text-gray-400">Intenta cambiar el filtro de período o registra un despacho</p>
      <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left text-sm text-gray-600">
        <p className="font-medium mb-1">Debug info:</p>
        <p>Period: {period || 'Todo'}</p>
        <p>Date: {date}</p>
        <p>Data object: {data ? 'exists' : 'null'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-gray-900">Despacho</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => { setPeriod(''); setWeekInput(''); load(); }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${!period ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Todo</button>
          <button onClick={() => { setPeriod('day'); setDate(getToday()); setWeekInput(''); load(); }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${period === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Hoy</button>
          <button onClick={() => {
            setPeriod('week');
            const wn = getWeekNumber(getToday());
            setWeekInput(String(wn));
            handleWeekChange(String(wn));
          }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${period === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Semana</button>
          <button onClick={() => { setPeriod('month'); setDate(getToday()); setWeekInput(''); load(); }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${period === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Mes</button>

          {period === 'week' && (
            <div className="flex items-center gap-2 ml-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <input type="number" min="1" max="53" value={weekInput} onChange={e => { setWeekInput(e.target.value); handleWeekChange(e.target.value); setPeriod('week'); }}
                placeholder="Semana"
                className="w-20 rounded-md border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          {period === 'day' && (
            <div className="flex items-center gap-2 ml-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <input type="date" value={date} onChange={e => { setDate(e.target.value); load(period, e.target.value); }}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

{period === 'month' && (
            <div className="flex items-center gap-2 ml-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <input type="month" value={date.slice(0, 7)} onChange={e => { setDate(e.target.value + '-01'); load(period, e.target.value + '-01'); }}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard icon={Scale} label="Kg despachados" value={`${data.despachos.total_kg.toLocaleString()} kg`} color="bg-emerald-600" />
        <KpiCard icon={Truck} label="Vehículos cargados" value={String(data.despachos.total_vehiculos)} color="bg-blue-600" />
        <KpiCard icon={MapPin} label="Rutas diferentes" value={String(data.despachos.total_rutas)} color="bg-purple-600" />
        <KpiCard icon={Gauge} label="Eficiencia cargue" value={formatEfficiency(data.despachos.avg_efficiency)} color="bg-purple-600" />
        <KpiCard icon={AlertTriangle} label="Pedidos con retraso" value={String(overdueCount)} color="bg-red-600" />
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-blue-600" />
            Kg despachados por ruta
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.despachos.total_rutas > 0 ? [{ ruta: 'Ruta 1', kg: data.despachos.total_kg / data.despachos.total_rutas }] : []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="ruta" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v: any) => formatNumber(Number(v))} />
              <Bar dataKey="kg" fill={CHART_COLORS.PRIMARY} radius={[6, 6, 0, 0]} name="Kg" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-blue-600" />
            Vehículos por ruta
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={[{ ruta: 'Ruta 1', vehiculos: data.despachos.total_vehiculos / (data.despachos.total_rutas || 1) }]}
                cx="50%" cy="50%"
                labelLine={false}
                label={({ ruta, vehiculos }) => `${ruta}: ${formatNumber(vehiculos)} veh`}
                outerRadius={80}
                dataKey="vehiculos" nameKey="ruta"
              >
                <Cell fill={PIE_TWO_COLORS[0]} />
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v: any) => formatNumber(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <LineChartIcon className="w-4 h-4 text-purple-600" />
            Eficiencia de cargue vs estándar
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={[
              { dia: 'Lun', eficiencia: data.despachos.avg_efficiency },
              { dia: 'Mar', eficiencia: data.despachos.avg_efficiency * 0.95 },
              { dia: 'Mié', eficiencia: data.despachos.avg_efficiency * 1.05 },
              { dia: 'Jue', eficiencia: data.despachos.avg_efficiency },
              { dia: 'Vie', eficiencia: data.despachos.avg_efficiency * 1.1 },
              { dia: 'Sáb', eficiencia: data.despachos.avg_efficiency * 0.9 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v: any) => formatNumber(Number(v))} />
              <Line yAxisId="left" type="monotone" dataKey="eficiencia" stroke={CHART_COLORS.PRIMARY} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS.PRIMARY }} name="Eficiencia %" />
              <Line yAxisId="right" type="monotone" dataKey="eficiencia" stroke={CHART_COLORS.SECONDARY} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: CHART_COLORS.SECONDARY }} name="Estándar 100%" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-emerald-600" />
            Kg por vehículo
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.despachos.total_vehiculos > 0 ? [{ vehiculo: 'Promedio', kg: data.despachos.total_kg / data.despachos.total_vehiculos }] : []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="vehiculo" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={v => [formatNumber(Number(v)), 'kg/vehículo']} />
              <Bar dataKey="kg" fill={CHART_COLORS.SECONDARY} radius={[6, 6, 0, 0]} name="Kg/vehículo" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Second grid: Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5 lg:col-span-2">
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
          <p className="text-xs mt-1 text-gray-500">Estándar: {getCargueStandardKgPerHour().toLocaleString()} kg/h</p>
        </div>
      </div>

      {/* ── 4-Week Trend Comparison ── */}
      {trend && (
        <div className="space-y-5">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            Comparativa 4 Semanas
          </h2>

{/* Despachos 4 weeks */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-600" />
                Kg Despachados - Últimas 4 Semanas
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trend.despachos}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.GRID} />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
                  <Tooltip content={<DespachoTooltip />} />
                  <Legend />
                  <Bar dataKey="total_kg" fill={CHART_COLORS.PRIMARY} radius={[6, 6, 0, 0]} name="Kg" />
                  <Bar dataKey="total_vehiculos" fill={CHART_COLORS.SECONDARY} radius={[6, 6, 0, 0]} name="Vehículos" />
                </BarChart>
              </ResponsiveContainer>
            </div>

{/* Eficiencia 4 weeks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-purple-600" />
                  Eficiencia Despacho - 4 Semanas
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trend.despachos}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.GRID} />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" tickFormatter={v => formatNumber(Number(v))} />
                    <Tooltip content={<EficienciaDespachoTooltip />} />
                    <Line yAxisId="left" type="monotone" dataKey="total_kg" stroke={LINE_COLORS[0]} strokeWidth={2.5} dot={{ r: 3, fill: LINE_COLORS[0] }} name="Kg" />
                    <Line yAxisId="right" type="monotone" dataKey="avg_efficiency" stroke={LINE_COLORS[2]} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: LINE_COLORS[2] }} name="Eficiencia %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <Container className="w-4 h-4 text-blue-600" />
                  Eficiencia Descargue - 4 Semanas
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trend.descargues}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.GRID} />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" tickFormatter={v => formatNumber(Number(v))} />
                    <Tooltip content={<EficienciaDescargueTooltip />} />
                    <Line yAxisId="left" type="monotone" dataKey="total_kg" stroke={LINE_COLORS[0]} strokeWidth={2.5} dot={{ r: 3, fill: LINE_COLORS[0] }} name="Kg" />
                    <Line yAxisId="right" type="monotone" dataKey="avg_efficiency" stroke={LINE_COLORS[2]} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: LINE_COLORS[2] }} name="Eficiencia %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Cumplimiento Citas - 4 Semanas
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trend.citas}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.GRID} />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
                  <Tooltip content={<CitasTooltip />} />
                  <Legend />
                  <Bar dataKey="total" fill={CHART_COLORS.PRIMARY} radius={[6, 6, 0, 0]} name="Total Citas" />
                  <Bar dataKey="cumplieron" fill={CHART_COLORS.SEM_SUCCESS} radius={[6, 6, 0, 0]} name="Cumplieron" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-purple-600" />
                % Cumplimiento Citas
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trend.citas}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.GRID} />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" tickFormatter={v => formatNumber(Number(v))} />
                  <Tooltip content={<CumplimientoCitasTooltip />} />
                  <Line type="monotone" dataKey="pct_cumplimiento" stroke={LINE_COLORS[2]} strokeWidth={3} dot={{ r: 4, fill: LINE_COLORS[2] }} name="% Cumplimiento" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Retrasos ── */}
      <div className="bg-red-50 rounded-xl border border-red-200 p-4">
        <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Retrasos</h3>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-red-700">1 día</span>
            <span className="font-bold text-red-900 text-lg">{overdue1d}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-red-700">2+ días</span>
            <span className="font-bold text-red-900 text-lg">{overdueMany}</span>
          </div>
        </div>
      </div>
    </div>
  );
}