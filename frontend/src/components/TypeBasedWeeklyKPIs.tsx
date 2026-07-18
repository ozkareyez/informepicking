import { useEffect, useState } from 'react';
import { Scale, Truck, BarChart2, TrendingUp, Package, Users, Target } from 'lucide-react';
import { getTypeBasedWeeklyKPIs } from '../api';
import type { TypeBasedWeeklyKPIs } from '../types';
import { formatNumber, formatEfficiency } from '../utils';
import { CHART_COLORS, LINE_COLORS, PIE_TWO_COLORS } from '../utils/chartColors';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

interface TypeKPICardProps {
  type: string;
  label: string;
  orders: number;
  kg: number;
  efficiency: number;
  color: string;
}

function TypeKPICard({ type, label, orders, kg, efficiency, color }: TypeKPICardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${color} p-3 rounded-xl text-white shrink-0 shadow-sm`}>
          {type === 'Masivo' ? <Package className="w-5 h-5" /> : <Users className="w-5 h-5" />}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-sm font-bold text-gray-900 capitalize">{type}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-2xl font-bold text-gray-900">{orders.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500">Pedidos</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-2xl font-bold text-gray-900">{kg.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500">Kg</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-2xl font-bold text-gray-900">{formatEfficiency(efficiency)}</p>
          <p className="text-[10px] text-gray-500">Eficiencia</p>
        </div>
      </div>
    </div>
  );
}

export default function TypeBasedWeeklyKPIs() {
  const [data, setData] = useState<TypeBasedWeeklyKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<string>('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const d = await getTypeBasedWeeklyKPIs();
        setData(d);
        // Set default to latest week
        if (d.production.length > 0) {
          const weeks = [...new Set(d.production.map(p => p.week))].sort().reverse();
          setSelectedWeek(weeks[0]);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  if (!data) return null;

  const weeks = [...new Set(data.production.map(p => p.week))].sort().reverse();

  // Get data for selected week
  const weekProd = data.production.filter(p => p.week === selectedWeek);
  const weekDesp = data.despachos.filter(d => d.week === selectedWeek);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            KPIs por Tipo de Pedido - Semana: {selectedWeek}
          </h2>
          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
          >
            {weeks.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        {/* Production KPIs */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-blue-600" />
            Producción por Tipo
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {weekProd.map(p => (
              <TypeKPICard
                key={p.type}
                type={p.type}
                label="Producción"
                orders={p.orders}
                kg={p.kg}
                efficiency={p.avg_efficiency}
                color={p.type === 'Masivo' ? 'bg-blue-600' : 'bg-purple-600'}
              />
            ))}
          </div>
        </div>

        {/* Despacho KPIs */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-emerald-600" />
            Despacho por Tipo
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {weekDesp.map(d => (
              <TypeKPICard
                key={d.type}
                type={d.type}
                label="Despacho"
                orders={d.vehiculos}
                kg={d.kg}
                efficiency={d.avg_efficiency}
                color={d.type === 'Masivo' ? 'bg-blue-600' : 'bg-purple-600'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Trend Charts */}
      {data && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            Tendencia Semanal por Tipo
          </h3>

          {/* Production Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" />
                Kg Producidos por Tipo - 4 Semanas
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.production}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.GRID} />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={v => [formatNumber(Number(v)), 'kg']} />
                  <Legend />
                  <Bar dataKey="kg" fill={CHART_COLORS.PRIMARY} radius={[6, 6, 0, 0]} name="Masivo" />
                  <Bar dataKey="kg" fill={CHART_COLORS.SECONDARY} radius={[6, 6, 0, 0]} name="Venta Directa" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-600" />
                Kg Despachados por Tipo - 4 Semanas
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.despachos}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.GRID} />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={v => [formatNumber(Number(v)), 'kg']} />
                  <Legend />
                  <Bar dataKey="kg" fill={CHART_COLORS.PRIMARY} radius={[6, 6, 0, 0]} name="Masivo" />
                  <Bar dataKey="kg" fill={CHART_COLORS.SECONDARY} radius={[6, 6, 0, 0]} name="Venta Directa" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                Eficiencia Producción por Tipo
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.production}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.GRID} />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" tickFormatter={v => formatNumber(Number(v))} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={v => [formatNumber(Number(v)), '%']} />
                  <Legend />
                  <Line type="monotone" dataKey="avg_efficiency" stroke={LINE_COLORS[0]} strokeWidth={2.5} dot={{ r: 3, fill: LINE_COLORS[0] }} name="Masivo" />
                  <Line type="monotone" dataKey="avg_efficiency" stroke={LINE_COLORS[1]} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: LINE_COLORS[1] }} name="Venta Directa" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Pedidos por Tipo
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.production}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.GRID} />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={v => [formatNumber(Number(v)), 'pedidos']} />
                  <Legend />
                  <Bar dataKey="orders" fill={CHART_COLORS.PRIMARY} radius={[6, 6, 0, 0]} name="Masivo" />
                  <Bar dataKey="orders" fill={CHART_COLORS.SECONDARY} radius={[6, 6, 0, 0]} name="Venta Directa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}