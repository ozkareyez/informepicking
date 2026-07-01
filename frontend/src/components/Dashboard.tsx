import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { Package, Scale, TrendingUp, Clock, Gauge } from 'lucide-react';
import { getDashboard } from '../api';
import type { DashboardData } from '../types';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1d4ed8', '#db2777', '#f59e0b'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const d = await getDashboard();
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

  const cards = [
    { label: 'Total de pedidos', value: data.total_orders, icon: Package, color: 'bg-blue-500' },
    { label: 'Total kg procesados', value: `${data.total_kg.toLocaleString()} kg`, icon: Scale, color: 'bg-green-500' },
    { label: 'Promedio eficiencia', value: `${data.avg_efficiency.toFixed(2)}%`, icon: TrendingUp, color: 'bg-purple-500' },
    { label: 'Promedio kg/h', value: `${data.avg_kg_per_hour.toFixed(2)}`, icon: Gauge, color: 'bg-orange-500' },
    { label: 'Total horas trabajadas', value: `${data.total_hours.toFixed(2)} h`, icon: Clock, color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
        {cards.map((card) => {
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
  );
}
