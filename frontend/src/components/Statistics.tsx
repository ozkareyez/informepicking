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
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Operario</label>
            <select value={operator} onChange={e => setOperator(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Todos los operarios</option>
              {data.operators.map((o: any) => (
                <option key={o.operator} value={o.operator}>{o.operator}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Período</label>
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              <option value="all">Todo</option>
              <option value="day">Día</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="year">Año</option>
            </select>
          </div>
          {period !== 'all' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
        </div>
      </div>

      {data.stats.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          No hay datos para los filtros seleccionados
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.stats.map(stat => (
              <div key={stat.operator} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h4 className="font-semibold text-gray-900 mb-3">{stat.operator}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Pedidos:</span><span className="font-medium">{stat.total_orders}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Total kg:</span><span className="font-medium">{stat.total_kg.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Tiempo total:</span><span className="font-medium">{stat.total_hours.toFixed(2)} h</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Promedio kg/h:</span><span className="font-medium">{stat.avg_kg_per_hour.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Promedio eficiencia:</span>
                    <span className={`font-medium ${stat.avg_efficiency >= 100 ? 'text-green-600' : 'text-orange-500'}`}>
                      {formatEfficiency(stat.avg_efficiency)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.bestDay && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Producción por operario</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.stats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="operator" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total_kg" fill="#2563eb" radius={[4, 4, 0, 0]} name="Total kg" />
                  <Bar dataKey="avg_efficiency" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Eficiencia promedio" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.bestDay && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-600 uppercase tracking-wide font-medium">Mejor día de producción</p>
                <p className="text-lg font-bold text-blue-900 mt-1">{data.bestDay.date} — {data.bestDay.total_kg.toFixed(2)} kg</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-xs text-purple-600 uppercase tracking-wide font-medium">Mejor eficiencia obtenida</p>
                <p className="text-lg font-bold text-purple-900 mt-1">{formatEfficiency(data.bestEfficiency?.best_efficiency ?? 0)}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
