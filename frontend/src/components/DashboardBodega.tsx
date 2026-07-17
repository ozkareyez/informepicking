import { useEffect, useState, useMemo } from 'react';
import { Warehouse, Package, Minus, Plus, Edit2, Trash2, Save, X, BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import { getRacks, createRack, updateRack, deleteRack } from '../api';
import type { Rack, RackFormData } from '../types';
import { formatNumber } from '../utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1d4ed8', '#db2777', '#f59e0b'];

const TOTAL_POSICIONES = 720;
const TOTAL_OCUPADAS = 710;
const TOTAL_DISPONIBLES = 10;

function KpiCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`${color} p-3 rounded-xl text-white shrink-0 shadow-sm`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardBodega() {
  const [racks, setRacks] = useState<Rack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRack, setEditingRack] = useState<Rack | null>(null);
  const [formData, setFormData] = useState<RackFormData>({ codigo: '', posiciones: 0, ocupacion: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    loadRacks();
  }, []);

  async function loadRacks() {
    setLoading(true);
    try {
      const data = await getRacks();
      setRacks(data);
    } catch (e: any) {
      alert('Error cargando racks: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!formData.codigo.trim()) { setError('Código requerido'); return; }
    if (formData.posiciones <= 0) { setError('Posiciones debe ser > 0'); return; }
    if (formData.ocupacion < 0) { setError('Ocupación no puede ser negativa'); return; }
    if (formData.ocupacion > formData.posiciones) { setError('Ocupación no puede exceder posiciones'); return; }

    try {
      if (editingRack) {
        await updateRack(editingRack.id, { ocupacion: formData.ocupacion });
      } else {
        await createRack(formData);
      }
      setShowForm(false);
      setEditingRack(null);
      setFormData({ codigo: '', posiciones: 0, ocupacion: 0 });
      loadRacks();
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    }
  }

  function handleEdit(rack: Rack) {
    setEditingRack(rack);
    setFormData({ codigo: rack.codigo, posiciones: rack.posiciones, ocupacion: rack.ocupacion });
    setShowForm(true);
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este rack?')) return;
    try {
      await deleteRack(id);
      loadRacks();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  }

  function handleCancel() {
    setShowForm(false);
    setEditingRack(null);
    setFormData({ codigo: '', posiciones: 0, ocupacion: 0 });
    setError('');
  }

  const totalPosiciones = racks.reduce((s, r) => s + r.posiciones, 0) || TOTAL_POSICIONES;
  const totalOcupacion = racks.reduce((s, r) => s + r.ocupacion, 0) || TOTAL_OCUPADAS;
  const totalDisponible = racks.reduce((s, r) => s + r.disponible, 0) || TOTAL_DISPONIBLES;
  const pctOcupacion = totalPosiciones > 0 ? ((totalOcupacion / totalPosiciones) * 100).toFixed(2) : '0';

  // Chart data
  const barChartData = racks.map(r => ({
    rack: r.codigo,
    posiciones: r.posiciones,
    ocupacion: r.ocupacion,
    disponible: r.disponible,
  }));

  const pieChartData = [
    { name: 'Ocupado', value: totalOcupacion, color: '#f59e0b' },
    { name: 'Disponible', value: totalDisponible, color: '#10b981' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 flex flex-wrap items-center gap-2 justify-between">
        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Warehouse className="w-5 h-5 text-blue-600" />
          Bodega - Ocupación y Disponibilidad
        </h1>
        <button onClick={() => { setEditingRack(null); setFormData({ codigo: '', posiciones: 0, ocupacion: 0 }); setShowForm(true); }}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          Agregar Rack
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Package} label="Total Posiciones" value={totalPosiciones.toLocaleString()} color="bg-blue-600" />
        <KpiCard icon={Package} label="Ocupación" value={totalOcupacion.toLocaleString()} color="bg-amber-600" />
        <KpiCard icon={Minus} label="Disponible" value={totalDisponible.toLocaleString()} color="bg-emerald-600" />
        <KpiCard icon={Package} label="% Ocupación" value={`${pctOcupacion}%`} color={parseFloat(pctOcupacion) >= 90 ? 'bg-red-600' : parseFloat(pctOcupacion) >= 75 ? 'bg-amber-600' : 'bg-green-600'} />
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-blue-600" />
            Posiciones vs Ocupación por Rack
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="rack" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(Number(v))} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={v => [formatNumber(Number(v)), '']} />
              <Legend />
              <Bar dataKey="posiciones" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Posiciones" />
              <Bar dataKey="ocupacion" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Ocupación" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <PieChartIcon className="w-4 h-4 text-amber-600" />
            Ocupación Global
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%" cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)`}
                outerRadius={100}
                dataKey="value" nameKey="name"
              >
                {pieChartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={v => [formatNumber(Number(v)), '']} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rack</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Posiciones</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ocupación</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Disponible</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% Ocupación</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actualizado por</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {racks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                  No hay racks registrados. Agrega el primer rack.
                </td>
              </tr>
            ) : racks.map(rack => (
              <tr key={rack.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 text-sm font-medium text-gray-900">{rack.codigo}</td>
                <td className="px-3 py-2 text-sm text-gray-700 text-right">{rack.posiciones.toLocaleString()}</td>
                <td className="px-3 py-2 text-sm text-gray-700 text-right font-medium">{rack.ocupacion.toLocaleString()}</td>
                <td className="px-3 py-2 text-sm text-gray-700 text-right">{rack.disponible.toLocaleString()}</td>
                <td className="px-3 py-2 text-sm text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    rack.porcentaje_ocupacion >= 90 ? 'bg-red-100 text-red-800' :
                    rack.porcentaje_ocupacion >= 75 ? 'bg-amber-100 text-amber-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {rack.porcentaje_ocupacion.toFixed(2)}%
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">{rack.updated_by}</td>
                <td className="px-3 py-2 text-xs">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(rack)} className="p-1 rounded text-blue-600 hover:bg-blue-50 transition-colors" title="Editar">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(rack.id)} className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-bold">
            <tr>
              <td className="px-3 py-2 text-sm text-gray-900">TOTAL</td>
              <td className="px-3 py-2 text-sm text-gray-900 text-right">{totalPosiciones.toLocaleString()}</td>
              <td className="px-3 py-2 text-sm text-gray-900 text-right">{totalOcupacion.toLocaleString()}</td>
              <td className="px-3 py-2 text-sm text-gray-900 text-right">{totalDisponible.toLocaleString()}</td>
              <td className="px-3 py-2 text-sm text-right">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  parseFloat(pctOcupacion) >= 90 ? 'bg-red-100 text-red-800' :
                  parseFloat(pctOcupacion) >= 75 ? 'bg-amber-100 text-amber-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {pctOcupacion}%
                </span>
              </td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                {editingRack ? 'Editar Rack' : 'Nuevo Rack'}
              </h2>
              <button onClick={handleCancel} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-700">{error}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Código (ej: R1, R9, A1)</label>
                <input type="text" value={formData.codigo} onChange={e => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 uppercase" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Total Posiciones</label>
                <input type="number" min="1" value={formData.posiciones} onChange={e => setFormData({ ...formData, posiciones: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" required disabled={!!editingRack} />
                {editingRack && <p className="text-xs text-gray-400 mt-1">Las posiciones no se pueden editar</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ocupación</label>
                <input type="number" min="0" max={formData.posiciones} value={formData.ocupacion} onChange={e => setFormData({ ...formData, ocupacion: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" required />
                <p className="text-xs text-gray-400 mt-1">Disponible: {formData.posiciones - formData.ocupacion}</p>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={handleCancel}
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">
                  Cancelar
                </button>
                <button type="submit" className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                  <Save className="w-3.5 h-3.5" />
                  {editingRack ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}