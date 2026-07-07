import { useState, useEffect } from 'react';
import { UserPlus, Trash2, User } from 'lucide-react';
import { getOperators, createOperator, deleteOperator } from '../api';
import type { Operator } from '../types';

export default function OperatorView() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await getOperators();
      setOperators(data);
    } catch { console.error('Error loading operators'); }
    finally { setLoading(false); }
  }

  async function handleAdd() {
    const name = newName.trim().toLowerCase();
    if (!name) return;
    if (operators.some(o => o.name === name)) {
      alert('Este operario ya existe');
      return;
    }
    try {
      await createOperator(name);
      setNewName('');
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Eliminar operario "${name}"?`)) return;
    try {
      await deleteOperator(id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <User className="w-4 h-4 text-blue-500" />
          Operarios
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">Lista de operarios usada en pedidos y descargues</p>
      </div>

      <div className="p-4 border-b border-gray-100">
        <div className="flex gap-2">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Nombre del operario" autoFocus
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} />
          <button onClick={handleAdd} disabled={!newName.trim()}
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <UserPlus className="w-4 h-4" />
            Agregar
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {operators.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No hay operarios registrados</p>
          </div>
        ) : (
          operators.map(op => (
            <div key={op.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
              <span className="text-sm font-medium text-gray-900 capitalize">{op.name}</span>
              <button onClick={() => handleDelete(op.id, op.name)}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
