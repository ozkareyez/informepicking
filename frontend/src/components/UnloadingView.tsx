import { useState, useEffect, useCallback } from 'react';
import { Package, Clock, Search, Trash2, User } from 'lucide-react';
import { getUnloadings, createUnloading, deleteUnloading, getOperators } from '../api';
import type { Unloading, Operator } from '../types';
import { getToday, getCurrentTime, calculateTimeSpent } from '../utils';

const OP_SLOTS = 4;

export default function UnloadingView() {
  const [unloadings, setUnloadings] = useState<Unloading[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form state
  const [date, setDate] = useState(getToday());
  const [ptm, setPtm] = useState('');
  const [kg, setKg] = useState('');
  const [operatorsList, setOperatorsList] = useState<string[]>(Array(OP_SLOTS).fill(''));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [operators, setOperators] = useState<Operator[]>([]);

  const load = useCallback(async () => {
    getOperators().then(setOperators).catch(() => {});
    setLoading(true);
    try {
      const data = await getUnloadings();
      setUnloadings(data);
    } catch {
      console.error('Error loading unloadings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const timePreview = startTime && endTime && endTime > startTime
    ? calculateTimeSpent(startTime, endTime)
    : null;

  function setOpSlot(idx: number, val: string) {
    const next = [...operatorsList];
    next[idx] = val;
    setOperatorsList(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!ptm.trim()) { setError('El número PTM es obligatorio'); return; }
    if (!kg || parseFloat(kg) <= 0) { setError('El peso debe ser mayor a 0'); return; }
    if (!startTime) { setError('La hora de inicio es obligatoria'); return; }
    if (!endTime) { setError('La hora de fin es obligatoria'); return; }
    if (endTime <= startTime) { setError('La hora fin debe ser mayor a la hora inicio'); return; }

    const selected = operatorsList.filter(s => s.trim());
    if (selected.length === 0) { setError('Seleccione al menos un operario'); return; }

    setSaving(true);
    try {
      await createUnloading({
        date,
        ptm: ptm.trim(),
        kg: parseFloat(kg),
        operators: selected,
        start_time: startTime,
        end_time: endTime,
      });
      setPtm('');
      setKg('');
      setOperatorsList(Array(OP_SLOTS).fill(''));
      setStartTime('');
      setEndTime('');
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este descargue?')) return;
    try {
      await deleteUnloading(id);
      load();
    } catch {
      console.error('Error deleting unloading');
    }
  }

  function setNow(field: 'start' | 'end') {
    const time = getCurrentTime();
    if (field === 'start') setStartTime(time);
    else setEndTime(time);
  }

  const filtered = unloadings.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    if (u.ptm.toLowerCase().includes(q)) return true;
    if (u.operators.some(op => op.toLowerCase().includes(q))) return true;
    return false;
  });

  return (
    <div className="space-y-4">
      {/* ── Form ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-4">
          <Package className="w-4 h-4 text-blue-600" />
          Registrar descargue de contenedor
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">PTM (documento)</label>
              <input type="text" value={ptm} onChange={e => setPtm(e.target.value)}
                placeholder="Ej: PTM-001"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Peso (kg)</label>
              <input type="number" value={kg} onChange={e => setKg(e.target.value)}
                placeholder="Ej: 25000" min="1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: OP_SLOTS }).map((_, i) => (
              <div key={i}>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  <User className="w-3 h-3 inline mr-1" />
                  Operario {i + 1}
                </label>
                <select value={operatorsList[i]} onChange={e => setOpSlot(i, e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">--</option>
                  {operators.map(op => (
                    <option key={op.id} value={op.name}>{op.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hora inicio</label>
              <div className="flex gap-2">
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => setNow('start')}
                  className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600">
                  Ahora
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hora final</label>
              <div className="flex gap-2">
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => setNow('end')}
                  className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600">
                  Ahora
                </button>
              </div>
            </div>
          </div>

          {timePreview && (
            <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5 text-xs text-blue-800 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Tiempo de descargue: <strong>{timePreview}</strong>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-1.5 text-xs text-red-700">{error}</div>
          )}

          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Package className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Registrar descargue'}
          </button>
        </form>
      </div>

      {/* ── List ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex-1 min-w-[160px] relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" placeholder="Buscar por PTM u operario..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <span className="text-xs text-gray-500">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No hay descargues registrados</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(u => (
              <div key={u.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm">PTM: {u.ptm}</span>
                    <span className="text-xs text-gray-500">{u.date}</span>
                  </div>
                  <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    <span>{u.kg} kg</span>
                    {u.operators.length > 0 && (
                      <span>Ops: {u.operators.join(', ')}</span>
                    )}
                    <span>{u.start_time} - {u.end_time}</span>
                    {u.time_spent && (
                      <span className="text-blue-600 font-medium">
                        <Clock className="w-3 h-3 inline mr-0.5" />
                        {u.time_spent}
                      </span>
                    )}
                    {u.created_by && <span className="text-gray-400">Por: {u.created_by}</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(u.id)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
