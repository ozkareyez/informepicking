import { useEffect, useState } from 'react';
import { Container, Scale, Clock, Gauge, TrendingUp, Calendar, BarChart2, LineChart as LineChartIcon } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { getDashboard, getUnloadings } from '../api';
import type { DashboardData, Unloading } from '../types';
import { formatEfficiency, getDescargueStandardKgPerHour, getToday, getWeekNumber, getWeekRange, formatNumber } from '../utils';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1d4ed8', '#db2777', '#f59e0b'];

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
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
            {trendLabel || `${Math.abs(trend)}%`}
          </p>
        )}
      </div>
    </div>
  );
}

type Period = '' | 'day' | 'week' | 'month';

export default function DashboardDescargue() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unloadings, setUnloadings] = useState<Unloading[]>([]);
  const [novTotal, setNovTotal] = useState(0);
  const [novResueltas, setNovResueltas] = useState(0);
  const [novPendientes, setNovPendientes] = useState(0);
  const [period, setPeriod] = useState<Period>('');
  const [date, setDate] = useState(getToday());
  const [weekInput, setWeekInput] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params: any = {};
        if (period) {
          params.period = period;
          params.date = date;
        }
        const [dash, unc] = await Promise.all([getDashboard(params), getUnloadings()]);
        setData(dash);
        setUnloadings(unc);
        const total = unc.filter(u => u.novedad).length;
        const resueltas = unc.filter(u => u.novedad && u.novedad_resuelta).length;
        setNovTotal(total);
        setNovResueltas(resueltas);
        setNovPendientes(total - resueltas);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period, date]);

  function handleWeekChange(week: string) {
    setWeekInput(week);
    if (!week) return;
    const year = new Date().getFullYear();
    const firstJan = new Date(year, 0, 1);
    const days = (parseInt(week) - 1) * 7;
    const start = new Date(firstJan);
    start.setDate(firstJan.getDate() + days - firstJan.getDay() + 1);
    setDate(start.toISOString().split('T')[0]);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
  if (!data) return (
    <div className="card p-8 text-center">
      <div className="text-6xl mb-4">📦</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Dashboard Descargue</h3>
      <p className="text-gray-500 mb-2">No hay datos de descargue</p>
      <p className="text-sm text-gray-400">Intenta cambiar el filtro de período o registra un descargue</p>
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
      {/* Period filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => { setPeriod(''); setWeekInput(''); }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${!period ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Todo</button>
          <button onClick={() => { setPeriod('day'); setDate(getToday()); setWeekInput(''); }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${period === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Hoy</button>
          <button onClick={() => { setPeriod('week'); const wn = getWeekNumber(getToday()); setWeekInput(String(wn)); handleWeekChange(String(wn)); }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${period === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Semana</button>
          <button onClick={() => { setPeriod('month'); setDate(getToday()); setWeekInput(''); }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${period === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Mes</button>

          {period === 'week' && (
            <div className="flex items-center gap-2 mt-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <input type="number" min="1" max="53" value={weekInput} onChange={e => { setWeekInput(e.target.value); handleWeekChange(e.target.value); setPeriod('week'); }}
                placeholder="Semana"
                className="w-20 rounded-md border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500" />
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
      </div>

      <h1 className="text-lg font-bold text-gray-900">Descargue</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Scale} label="Kg descargados" value={`${data.descargues.total_kg.toLocaleString()} kg`} color="bg-emerald-600" />
        <KpiCard icon={Container} label="PTM registrados" value={String(data.descargues.total_ptm)} color="bg-blue-600" />
        <KpiCard icon={Clock} label="Horas descargue" value={`${data.descargues.total_hours.toFixed(2)} h`} color="bg-red-600" />
        <KpiCard icon={Gauge} label="Eficiencia descargue" value={formatEfficiency(data.descargues.avg_efficiency)} color="bg-emerald-600" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Scale} label="Kg descargados" value={`${data.descargues.total_kg.toLocaleString()} kg`} color="bg-emerald-600" />
        <KpiCard icon={Container} label="PTM registrados" value={String(data.descargues.total_ptm)} color="bg-blue-600" />
        <KpiCard icon={Clock} label="Horas descargue" value={`${data.descargues.total_hours.toFixed(2)} h`} color="bg-red-600" />
        <KpiCard icon={Gauge} label="Eficiencia descargue" value={formatEfficiency(data.descargues.avg_efficiency)} color="bg-emerald-600" />
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-emerald-600" />
            Kg por PTM
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={unloadings.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="ptm" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={v => formatNumber(Number(v))} />
              <Bar dataKey="kg" fill="#10b981" radius={[6, 6, 0, 0]} name="Kg" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Horas por PTM
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={unloadings.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="ptm" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={v => formatNumber(Number(v))} />
              <Bar dataKey="kg" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Horas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <LineChartIcon className="w-4 h-4 text-emerald-600" />
            Eficiencia vs estándar
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={unloadings.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="ptm" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" tickFormatter={v => formatNumber(Number(v))} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v: any) => formatNumber(Number(v))} />
              <Line yAxisId="left" type="monotone" dataKey="kg" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} name="Kg" />
              <Line yAxisId="right" type="monotone" dataKey="kg" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: '#f59e0b' }} name="Eficiencia" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <Container className="w-4 h-4 text-blue-600" />
            Distribución PTM
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={unloadings.slice(0, 10)}
                cx="50%" cy="50%"
                labelLine={false}
                label={({ ptm, kg }) => `${ptm}: ${formatNumber(Number(kg))} kg`}
                outerRadius={80}
                dataKey="kg" nameKey="ptm"
              >
                {unloadings.slice(0, 10).map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={v => formatNumber(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}