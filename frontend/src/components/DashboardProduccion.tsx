import { useEffect, useState } from 'react';
import { Package, Scale, TrendingUp, Gauge, Clock, Users, ArrowUpRight, ArrowDownRight, Calendar, BarChart2, LineChart as LineChartIcon, BarChart as BarChartIcon } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { getDashboard, getFourWeekTrend } from '../api';
import type { DashboardData } from '../types';
import { formatEfficiency, getToday, getWeekRange, getWeekNumber, formatNumber } from '../utils';
import { CHART_COLORS, PIE_TWO_COLORS, BAR_GROUPED, LINE_COLORS, KPI_COLORS } from '../utils/chartColors';
import { ProductionTooltip, DespachoTooltip, EficienciaDespachoTooltip, EficienciaDescargueTooltip, CitasTooltip, CumplimientoCitasTooltip, DescargueTooltip } from './charts/ChartTooltips';

// Types for 4-week trend
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

export default function DashboardProduccion() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [trend, setTrend] = useState<FourWeekTrend | null>(null);
  const [loading, setLoading] = useState(true);
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
        const [d, trendData] = await Promise.all([
          getDashboard(params),
          getFourWeekTrend(),
        ]);
        setData(d);
        setTrend(trendData);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period, date]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
  if (!data) return (
    <div className="card p-8 text-center">
      <div className="text-6xl mb-4">📊</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Dashboard Producción</h3>
      <p className="text-gray-500 mb-2">No hay datos disponibles</p>
      <p className="text-sm text-gray-400">Intenta cambiar el filtro de período o registra un pedido</p>
      <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left text-sm text-gray-600">
        <p className="font-medium mb-1">Debug info:</p>
        <p>Period: {period || 'Todo'}</p>
        <p>Date: {date}</p>
        <p>Data object: {data ? 'exists' : 'null'}</p>
      </div>
    </div>
  );

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

      <h1 className="text-lg font-bold text-gray-900">Producción</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiCard icon={Package} label="Pedidos" value={String(data.total_orders)} color="bg-blue-600" />
        <KpiCard icon={Scale} label="Kg procesados" value={`${data.total_kg.toLocaleString()} kg`} color="bg-emerald-600" />
        <KpiCard icon={TrendingUp} label="Eficiencia prom." value={`${data.avg_efficiency.toFixed(2)}%`} color="bg-purple-600" />
        <KpiCard icon={Gauge} label="Prom. kg/h" value={`${data.avg_kg_per_hour.toFixed(2)}`} color="bg-orange-600" />
        <KpiCard icon={Clock} label="Horas trabajadas" value={`${data.total_hours.toFixed(2)} h`} color="bg-red-600" />
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-blue-600" />
            Kg por operario
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.kgByOperator}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.GRID} />
              <XAxis dataKey="operator" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
              <Tooltip content={<ProductionTooltip />} />
              <Bar dataKey="total_kg" fill={CHART_COLORS.PRIMARY} radius={[6, 6, 0, 0]} name="Kg" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            Eficiencia por operario
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.kgByOperator}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.GRID} />
              <XAxis dataKey="operator" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" tickFormatter={v => formatNumber(Number(v))} />
              <Tooltip content={<ProductionTooltip />} />
              <Bar dataKey="avg_efficiency" fill={CHART_COLORS.SECONDARY} radius={[6, 6, 0, 0]} name="Eficiencia" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <LineChartIcon className="w-4 h-4 text-blue-600" />
            Producción por día
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.productionByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.GRID} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" tickFormatter={v => formatNumber(Number(v))} />
              <Tooltip content={<ProductionTooltip />} />
              <Line yAxisId="left" type="monotone" dataKey="total_kg" stroke={LINE_COLORS[0]} strokeWidth={2.5} dot={{ r: 3, fill: LINE_COLORS[0] }} name="Kg" />
              <Line yAxisId="left" type="monotone" dataKey="total_orders" stroke={LINE_COLORS[1]} strokeWidth={2} dot={{ r: 3, fill: LINE_COLORS[1] }} name="Pedidos" />
              <Line yAxisId="right" type="monotone" dataKey="avg_efficiency" stroke={LINE_COLORS[2]} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: LINE_COLORS[2] }} name="Eficiencia %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-blue-600" />
            Producción por tipo
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Tooltip content={<ProductionTooltip />} />
              <Pie
                data={data.productionByType}
                cx="50%" cy="50%"
                labelLine={false}
                label={({ type, total_kg }) => `${type}: ${formatNumber(total_kg)} kg`}
                outerRadius={80}
                dataKey="total_kg" nameKey="type"
              >
                {data.productionByType.map((_, index) => (
                  <Cell key={index} fill={PIE_TWO_COLORS[index % PIE_TWO_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v: any) => [formatNumber(Number(v)), 'kg']} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600" /> Kg por operario
          </h3>
          <div className="space-y-2">
            {data.kgByOperator.map(op => (
              <div key={op.operator} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-700">{op.operator.charAt(0)}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{op.operator}</span>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p className="font-semibold text-gray-900">{op.total_kg.toLocaleString()} kg</p>
                  <p className="text-xs">{op.total_orders} pedidos · {op.avg_efficiency.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-purple-600" /> Eficiencia por operario
          </h3>
          <div className="space-y-2">
            {data.kgByOperator.map(op => {
              const effAjustada = Math.round((op.avg_efficiency - op.pct_novedad) * 100) / 100;
              return (
                <div key={op.operator} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-xs font-medium text-purple-700">{op.operator.charAt(0)}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{op.operator}</span>
                  </div>
                  <div className="text-right text-sm">
                    <p className={`font-semibold ${effAjustada >= 100 ? 'text-emerald-600' : effAjustada >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                      {effAjustada.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">{op.avg_kg_per_hour.toFixed(1)} kg/h{op.pct_novedad > 0 && <span className="text-amber-500"> · −{op.pct_novedad.toFixed(1)}% nov.</span>}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-blue-600" /> Producción por día
          </h3>
          <div className="space-y-2">
            {data.productionByDay.slice(-7).map(day => (
              <div key={day.date} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{day.date}</span>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-sm font-medium text-gray-900">{day.total_kg.toLocaleString()} kg</span>
                  <span className="text-xs text-gray-500">{day.total_orders} pedidos</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-emerald-600" /> Producción por tipo
          </h3>
          <div className="space-y-2">
            {data.productionByType.map((tp, i) => (
              <div key={tp.type} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-sm font-medium text-gray-900">{tp.type}</span>
                <div className="text-right text-sm">
                  <p className="font-semibold text-gray-900">{tp.total_kg.toLocaleString()} kg</p>
                  <p className="text-xs text-gray-500">{tp.total_orders} pedidos · {tp.avg_efficiency.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4-Week Trend Comparison ── */}
      {trend && (
        <div className="space-y-5">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChartIcon className="w-5 h-5 text-blue-600" />
            Comparativa 4 Semanas
          </h2>

          {/* Producción 4 weeks */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-blue-600" />
              Kg Producidos - Últimas 4 Semanas
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trend.production}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.GRID} />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={v => [formatNumber(Number(v)), 'kg']} />
                <Legend />
                <Bar dataKey="total_kg" fill={CHART_COLORS.PRIMARY} radius={[6, 6, 0, 0]} name="Kg" />
                <Bar dataKey="total_orders" fill={CHART_COLORS.SECONDARY} radius={[6, 6, 0, 0]} name="Pedidos" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Eficiencia 4 weeks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                Eficiencia Producción - 4 Semanas
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trend.production}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.GRID} />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" tickFormatter={v => formatNumber(Number(v))} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={v => formatNumber(Number(v))} />
                  <Line yAxisId="left" type="monotone" dataKey="total_kg" stroke={LINE_COLORS[0]} strokeWidth={2.5} dot={{ r: 3, fill: LINE_COLORS[0] }} name="Kg" />
                  <Line yAxisId="right" type="monotone" dataKey="avg_efficiency" stroke={LINE_COLORS[2]} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: LINE_COLORS[2] }} name="Eficiencia %" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Kg/h Producción - 4 Semanas
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trend.production}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.GRID} />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={v => formatNumber(Number(v))} />
                  <Line yAxisId="left" type="monotone" dataKey="total_kg" stroke={LINE_COLORS[0]} strokeWidth={2.5} dot={{ r: 3, fill: LINE_COLORS[0] }} name="Kg" />
                  <Line yAxisId="right" type="monotone" dataKey="avg_efficiency" stroke={LINE_COLORS[2]} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: LINE_COLORS[2] }} name="Eficiencia %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600" /> Rendimiento por operario
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Eficiencia ajustada = Eficiencia base − % pedidos con novedad</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Operario</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Pedidos</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Kg</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Kg/h</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Eficiencia base</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase">Novedades</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Eficiencia ajustada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.kgByOperator.map(op => {
                const effAjustada = Math.round((op.avg_efficiency - op.pct_novedad) * 100) / 100;
                return (
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
                    <td className="px-3 py-2 text-center">
                      {op.orders_con_novedad > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
                          {op.orders_con_novedad}/{op.total_orders} pedidos
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                          Sin novedad
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        effAjustada >= 100 ? 'bg-green-100 text-green-800' : effAjustada >= 80 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {effAjustada.toFixed(2)}%
                      </span>
                      {op.pct_novedad > 0 && (
                        <span className="text-[9px] text-amber-600 block">−{op.pct_novedad.toFixed(2)}%</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}