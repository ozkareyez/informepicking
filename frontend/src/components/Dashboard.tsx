import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { Package, Scale, TrendingUp, Clock, Gauge, Truck, Container, MapPin } from 'lucide-react';
import { getDashboard } from '../api';
import type { DashboardData } from '../types';
import { getToday } from '../utils';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1d4ed8', '#db2777', '#f59e0b'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>('');
  const [date, setDate] = useState(getToday());

  useEffect(() => {
    load();
  }, [period, date]);

  async function load() {
    setLoading(true);
    try {
      const d = await getDashboard(period ? { period, date } : {});
      setData(d);
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
    <div className="space-y-4">
      {/* ── Period filter ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-gray-200 overflow-hidden">
          {[
            { id: '', label: 'Todo' },
            { id: 'day', label: 'Hoy' },
            { id: 'week', label: 'Semana' },
            { id: 'month', label: 'Mes' },
          ].map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        {period && (
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-md" />
        )}
      </div>

      {/* ── Pedidos (existing) ── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-2 flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" />
          Producción (Pedidos)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 mb-3">
          {[
            { label: 'Pedidos', value: data.total_orders, icon: Package, color: 'bg-blue-500' },
            { label: 'Kg procesados', value: `${data.total_kg.toLocaleString()} kg`, icon: Scale, color: 'bg-green-500' },
            { label: 'Eficiencia prom.', value: `${data.avg_efficiency.toFixed(2)}%`, icon: TrendingUp, color: 'bg-purple-500' },
            { label: 'Prom. kg/h', value: `${data.avg_kg_per_hour.toFixed(2)}`, icon: Gauge, color: 'bg-orange-500' },
            { label: 'Horas trabajadas', value: `${data.total_hours.toFixed(2)} h`, icon: Clock, color: 'bg-red-500' },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 flex items-center gap-3">
                <div className={`${card.color} p-2 rounded-lg text-white shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide truncate">{card.label}</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{card.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
            <h3 className="text-xs font-semibold text-gray-900 mb-2">Kg por operario</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.kgByOperator}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="operator" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="total_kg" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
            <h3 className="text-xs font-semibold text-gray-900 mb-2">Eficiencia por operario</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.kgByOperator}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="operator" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit="%" />
                <Tooltip />
                <Bar dataKey="avg_efficiency" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
            <h3 className="text-xs font-semibold text-gray-900 mb-2">Producción por día</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.productionByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total_kg" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
            <h3 className="text-xs font-semibold text-gray-900 mb-2">Producción por tipo</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data.productionByType}
                  cx="50%" cy="50%"
                  labelLine={false}
                  label={({ type, total_kg }) => `${type}: ${total_kg} kg`}
                  outerRadius={65}
                  dataKey="total_kg" nameKey="type"
                >
                  {data.productionByType.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Despachos ── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-2 flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5" />
          Despachos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { label: 'Kg despachados', value: `${data.despachos.total_kg.toLocaleString()} kg`, icon: Scale, color: 'bg-green-500' },
            { label: 'Vehículos cargados', value: data.despachos.total_vehiculos, icon: Truck, color: 'bg-blue-500' },
            { label: 'Rutas diferentes', value: data.despachos.total_rutas, icon: MapPin, color: 'bg-purple-500' },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 flex items-center gap-3">
                <div className={`${card.color} p-2 rounded-lg text-white shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide truncate">{card.label}</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{card.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Descargues ── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-2 flex items-center gap-1.5">
          <Container className="w-3.5 h-3.5" />
          Descargue de contenedores
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { label: 'Kg descargados', value: `${data.descargues.total_kg.toLocaleString()} kg`, icon: Scale, color: 'bg-green-500' },
            { label: 'PTM registrados', value: data.descargues.total_ptm, icon: Container, color: 'bg-blue-500' },
            { label: 'Horas descargue', value: `${data.descargues.total_hours.toFixed(2)} h`, icon: Clock, color: 'bg-red-500' },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 flex items-center gap-3">
                <div className={`${card.color} p-2 rounded-lg text-white shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide truncate">{card.label}</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{card.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
