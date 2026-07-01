import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getStatistics } from '../api';
import type { StatisticsData } from '../types';
import { formatEfficiency } from '../utils';

export default function Statistics() {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [operator, setOperator] = useState('');
  const [period, setPeriod] = useState('all');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    load();
  }, [operator, period, date]);

  async function load() {
    setLoading(true);
    try {
      const params: any = {};
      if (operator) params.operator = operator;
      if (period !== 'all') { params.period = period; params.date = date; }
      const d = await getStatistics(params);
      setData(d);
    } catch {
      console.error('Error loading statistics');
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
    <div className="space-y-3">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Operario</label>
            <select value={operator} onChange={e => setOperator(e.target.value)}
              className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Todos</option>
              {data.operators.map((o: any) => (
                <option key={o.operator} value={o.operator}>{o.operator}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Período</label>
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500">
              <option value="all">Todo</option>
              <option value="day">Día</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="year">Año</option>
            </select>
          </div>
          {period !== 'all' && (
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
        </div>
      </div>

      {data.stats.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center text-gray-500 text-sm">
          No hay datos para los filtros seleccionados
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.stats.map(stat => (
              <div key={stat.operator} className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
                <h4 className="font-semibold text-gray-900 text-sm mb-2">{stat.operator}</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Pedidos:</span><span className="font-medium">{stat.total_orders}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Kg:</span><span className="font-medium">{stat.total_kg.toFixed(1)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Horas:</span><span className="font-medium">{stat.total_hours.toFixed(1)} h</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Kg/h:</span><span className="font-medium">{stat.avg_kg_per_hour.toFixed(1)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Eficiencia:</span>
                    <span className={`font-medium ${stat.avg_efficiency >= 100 ? 'text-green-600' : 'text-orange-500'}`}>
                      {formatEfficiency(stat.avg_efficiency)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.bestDay && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
              <h3 className="text-xs font-semibold text-gray-900 mb-2">Producción por operario</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.stats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="operator" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="total_kg" fill="#2563eb" radius={[4, 4, 0, 0]} name="Total kg" />
                  <Bar dataKey="avg_efficiency" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Eficiencia" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.bestDay && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-[10px] text-blue-600 uppercase tracking-wide font-medium">Mejor día</p>
                <p className="text-sm font-bold text-blue-900 mt-0.5">{data.bestDay.date} — {data.bestDay.total_kg.toFixed(1)} kg</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-[10px] text-purple-600 uppercase tracking-wide font-medium">Mejor eficiencia</p>
                <p className="text-sm font-bold text-purple-900 mt-0.5">{formatEfficiency(data.bestEfficiency?.best_efficiency ?? 0)}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
