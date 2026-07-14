import { useEffect, useState } from 'react';
import { Truck, Clock, AlertTriangle, CheckCircle, Calendar, Scale, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { getCitasCargue, getOrdersForDispatch } from '../api';
import type { CitaCargue, Order } from '../types';
import { formatEfficiency } from '../utils';

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

export default function DashboardCitas() {
  const [citas, setCitas] = useState<CitaCargue[]>([]);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    async function load() {
      const [c, o] = await Promise.all([
        getCitasCargue(),
        getOrdersForDispatch(),
      ]);
      setCitas(c);
      setOrders(o);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  const total = citas.length;
  const conHoraLlegada = citas.filter(c => c.hora_llegada).length;
  const sinHoraLlegada = citas.filter(c => !c.hora_llegada).length;
  const cumplieron = citas.filter(c => c.cumplio_cita === true).length;
  const noCumplieron = citas.filter(c => c.cumplio_cita === false).length;
  const pendientes = citas.filter(c => c.cumplio_cita === null).length;

  if (total === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Citas de Cargue</h3>
        <p className="text-gray-500 mb-2">No hay citas registradas</p>
        <p className="text-sm text-gray-400">Crea una cita en la pestaña "Citas de Cargue"</p>
      </div>
    );
  }
  const conRetraso = citas.filter(c => (c.retraso_minutos ?? 0) > 15).length;
  const aTiempo = citas.filter(c => c.retraso_minutos !== null && c.retraso_minutos >= 0 && c.retraso_minutos <= 15).length;
  const adelantados = citas.filter(c => (c.retraso_minutos ?? 0) < 0).length;
  const retrasoPromedio = citas.filter(c => c.retraso_minutos !== null && c.retraso_minutos > 0)
    .reduce((s, c) => s + (c.retraso_minutos || 0), 0) / Math.max(1, citas.filter(c => c.retraso_minutos !== null && c.retraso_minutos > 0).length);

  // Stats by tipo
  const porTipo = citas.reduce((acc, c) => {
    const t = c.tipo || 'Masivo';
    if (!acc[t]) acc[t] = { total: 0, cumplieron: 0, noCumplieron: 0, retraso: 0 };
    acc[t].total++;
    if (c.cumplio_cita === true) acc[t].cumplieron++;
    if (c.cumplio_cita === false) acc[t].noCumplieron++;
    if ((c.retraso_minutos ?? 0) > 15) acc[t].retraso++;
    return acc;
  }, {} as Record<string, { total: number; cumplieron: number; noCumplieron: number; retraso: number }>);

  const porRuta = citas.reduce((acc, c) => {
    const r = c.ruta || 'Sin ruta';
    if (!acc[r]) acc[r] = { total: 0, retraso: 0, aTiempo: 0, cumplieron: 0, noCumplieron: 0 };
    acc[r].total++;
    if ((c.retraso_minutos ?? 0) > 15) acc[r].retraso++;
    else if (c.retraso_minutos !== null && c.retraso_minutos >= 0) acc[r].aTiempo++;
    if (c.cumplio_cita === true) acc[r].cumplieron++;
    if (c.cumplio_cita === false) acc[r].noCumplieron++;
    return acc;
  }, {} as Record<string, { total: number; retraso: number; aTiempo: number; cumplieron: number; noCumplieron: number }>);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-gray-900">Citas de Cargue</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard icon={Calendar} label="Total citas" value={String(total)} color="bg-blue-600" />
        <KpiCard icon={Clock} label="Con hora llegada" value={String(conHoraLlegada)} color="bg-gray-600" />
        <KpiCard icon={CheckCircle} label="Cumplieron" value={String(cumplieron)} color="bg-emerald-600" />
        <KpiCard icon={AlertTriangle} label="No cumplieron" value={String(noCumplieron)} color="bg-red-600" />
        <KpiCard icon={Clock} label="Pendientes" value={String(pendientes)} color="bg-orange-600" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={AlertTriangle} label="Con retraso >15min" value={String(conRetraso)} color="bg-red-600" />
        <KpiCard icon={CheckCircle} label="A tiempo" value={String(aTiempo)} color="bg-emerald-600" />
        <KpiCard icon={Truck} label="Adelantados" value={String(adelantados)} color="bg-purple-600" />
        <KpiCard icon={Clock} label="Retraso promedio" value={`${retrasoPromedio.toFixed(0)} min`} color="bg-orange-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" /> Cumplimiento por tipo
          </h3>
          {Object.entries(porTipo).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No hay citas registradas</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(porTipo).map(([tipo, stats]) => (
                <div key={tipo} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    {tipo}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.cumplieron / stats.total) * 100 : 0}%` }} />
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.noCumplieron / stats.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs shrink-0">
                    <span className="text-emerald-600 font-medium">{stats.total > 0 ? Math.round((stats.cumplieron / stats.total) * 100) : 0}%</span>
                    <span className="text-red-600 font-medium">{stats.total > 0 ? Math.round((stats.noCumplieron / stats.total) * 100) : 0}%</span>
                    <span className="text-orange-500 font-medium">{stats.total > 0 ? Math.round((stats.retraso / stats.total) * 100) : 0}% retraso</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" /> Cumplimiento por ruta
          </h3>
          {Object.entries(porRuta).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No hay citas registradas</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(porRuta).map(([ruta, stats]) => (
                <div key={ruta} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900 truncate">{ruta}</span>
                      <span className="text-xs text-gray-500">{stats.total} citas</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.cumplieron / stats.total) * 100 : 0}%` }} />
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.noCumplieron / stats.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs shrink-0">
                    <span className="text-emerald-600 font-medium">{stats.total > 0 ? Math.round((stats.cumplieron / stats.total) * 100) : 0}%</span>
                    <span className="text-red-600 font-medium">{stats.total > 0 ? Math.round((stats.noCumplieron / stats.total) * 100) : 0}%</span>
                    <span className="text-orange-500 font-medium">{stats.total > 0 ? Math.round((stats.retraso / stats.total) * 100) : 0}% retraso</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-blue-600" /> Estado de flujos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{sinHoraLlegada}</p>
            <p className="text-xs text-gray-500 mt-0.5">Sin hora llegada</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-900">{conHoraLlegada}</p>
            <p className="text-xs text-blue-500 mt-0.5">Con hora llegada</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-900">{cumplieron}</p>
            <p className="text-xs text-emerald-500 mt-0.5">Cumplieron</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-900">{noCumplieron}</p>
            <p className="text-xs text-red-500 mt-0.5">No cumplieron</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-900">{adelantados}</p>
            <p className="text-xs text-purple-500 mt-0.5">Adelantados</p>
          </div>
        </div>
      </div>
    </div>
  );
}