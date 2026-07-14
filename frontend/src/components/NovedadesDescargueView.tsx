import { useState, useEffect, useCallback } from 'react';
import { Package, Clock, Search, Trash2, User, AlertTriangle, CheckCircle, XCircle, Edit3, Filter } from 'lucide-react';
import { getUnloadings, updateUnloadingNovedad, deleteUnloading, getOperators } from '../api';
import type { Unloading, Operator } from '../types';
import { getCurrentTime, calculateTimeSpent } from '../utils';

export default function NovedadesDescargueView() {
  const [unloadings, setUnloadings] = useState<Unloading[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'pendientes' | 'resueltas'>('todas');
  const [operators, setOperators] = useState<Operator[]>([]);
  const [editingNovedad, setEditingNovedad] = useState<{ id: number; text: string } | null>(null);

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

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este descargue?')) return;
    try {
      await deleteUnloading(id);
      load();
    } catch {
      alert('Error al eliminar');
    }
  }

  const filtered = unloadings.filter(u => {
    // Only show items with novedades
    if (!u.novedad) return false;
    if (filtroEstado === 'pendientes' && u.novedad_resuelta) return false;
    if (filtroEstado === 'resueltas' && !u.novedad_resuelta) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    if (u.ptm.toLowerCase().includes(q)) return true;
    if (u.operators.some(op => op.toLowerCase().includes(q))) return true;
    return false;
  });

  const stats = {
    total: unloadings.filter(u => u.novedad).length,
    pendientes: unloadings.filter(u => u.novedad && !u.novedad_resuelta).length,
    resueltas: unloadings.filter(u => u.novedad && u.novedad_resuelta).length,
  };

  return (
    <div className="space-y-4">
      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500">Total novedades</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-4">
          <p className="text-xs font-medium text-orange-600">Pendientes</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{stats.pendientes}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-green-200 p-4">
          <p className="text-xs font-medium text-green-600">Resueltas</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{stats.resueltas}</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex-1 min-w-[160px] relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" placeholder="Buscar por PTM u operario..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as any)}
            className="w-[140px] px-2.5 py-1.5 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500">
            <option value="todas">Todas</option>
            <option value="pendientes">Pendientes</option>
            <option value="resueltas">Resueltas</option>
          </select>
          <span className="text-xs text-gray-500">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── List ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">{stats.total === 0 ? 'No hay descargues registrados' : 'No hay novedades con este filtro'}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(u => (
              <div key={u.id} className={`rounded-lg border p-3 ${u.novedad && !u.novedad_resuelta ? 'border-orange-200 bg-orange-50/30' : 'border-green-200 bg-green-50/30'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">PTM: {u.ptm}</span>
                      <span className="text-xs text-gray-500">{u.date}</span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        u.novedad_resuelta ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {u.novedad_resuelta ? <CheckCircle className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                        {u.novedad_resuelta ? 'Resuelta' : 'Novedad'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <span>{u.kg} kg</span>
                      {u.operators.length > 0 && <span>Ops: {u.operators.join(', ')}</span>}
                      <span>{u.start_time} - {u.end_time}</span>
                      {u.time_spent && (
                        <span className="text-blue-600 font-medium">
                          <Clock className="w-3 h-3 inline mr-0.5" />
                          {u.time_spent}
                        </span>
                      )}
                      {u.created_by && <span className="text-gray-400">Por: {u.created_by}</span>}
                    </div>
                    {u.novedad && (
                      <div className="mt-1.5 text-xs flex items-start gap-1.5">
                        {editingNovedad?.id === u.id ? (
                          <div className="flex-1 flex gap-1.5">
                            <input type="text" value={editingNovedad.text}
                              onChange={e => setEditingNovedad({ ...editingNovedad, text: e.target.value })}
                              className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500" />
                            <button onClick={async () => {
                              await updateUnloadingNovedad(u.id, editingNovedad.text, u.novedad_resuelta);
                              setEditingNovedad(null);
                              load();
                            }} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
                            <button onClick={() => setEditingNovedad(null)} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">Cancelar</button>
                          </div>
                        ) : (
                          <>
                            <span className={`${u.novedad_resuelta ? 'text-green-700 line-through' : 'text-orange-700'}`}>
                              {u.novedad}
                            </span>
                            <button onClick={() => setEditingNovedad({ id: u.id, text: u.novedad || '' })}
                              className="text-blue-500 hover:text-blue-700 shrink-0">
                              <Edit3 className="w-3 h-3" />
                            </button>
                            {!u.novedad_resuelta && (
                              <button onClick={async () => {
                                await updateUnloadingNovedad(u.id, u.novedad || '', true);
                                load();
                              }} className="text-green-600 hover:text-green-800 shrink-0" title="Marcar como resuelta">
                                <CheckCircle className="w-3 h-3" />
                              </button>
                            )}
                            {u.novedad_resuelta && (
                              <button onClick={async () => {
                                await updateUnloadingNovedad(u.id, u.novedad || '', false);
                                load();
                              }} className="text-orange-500 hover:text-orange-700 shrink-0" title="Reabrir novedad">
                                <XCircle className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleDelete(u.id)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}