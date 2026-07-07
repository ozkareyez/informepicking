import { useState, useEffect, useMemo } from 'react';
import { UserPlus, Trash2, User, Merge, AlertTriangle, Check, X } from 'lucide-react';
import { getOperators, createOperator, deleteOperator, updateOperator } from '../api';
import type { Operator } from '../types';

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
  return dp[m][n];
}

function isSimilar(a: string, b: string): boolean {
  const na = a.trim().toLowerCase(), nb = b.trim().toLowerCase();
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  if (na.split(' ')[0] === nb.split(' ')[0]) return true;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return dist <= 2 || (maxLen > 0 && dist / maxLen < 0.3);
}

function findSimilarGroups(operators: Operator[]): Operator[][] {
  const groups: Operator[][] = [];
  const used = new Set<number>();
  for (let i = 0; i < operators.length; i++) {
    if (used.has(operators[i].id)) continue;
    const group: Operator[] = [operators[i]];
    used.add(operators[i].id);
    for (let j = i + 1; j < operators.length; j++) {
      if (used.has(operators[j].id)) continue;
      if (isSimilar(operators[i].name, operators[j].name)) {
        group.push(operators[j]);
        used.add(operators[j].id);
      }
    }
    if (group.length > 1) groups.push(group);
  }
  return groups;
}

export default function OperatorView() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [showDuplicates, setShowDuplicates] = useState(false);

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

  async function handleRename(id: number, newName: string) {
    try {
      await updateOperator(id, newName);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleMerge(group: Operator[], keepId: number) {
    const keep = group.find(o => o.id === keepId);
    if (!keep) return;
    const toDelete = group.filter(o => o.id !== keepId);
    for (const op of toDelete) {
      try {
        await updateOperator(op.id, keep.name);
        await deleteOperator(op.id);
      } catch (err: any) {
        alert(`Error al procesar "${op.name}": ${err.message}`);
      }
    }
    load();
  }

  const similarGroups = useMemo(() => findSimilarGroups(operators), [operators]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Card: Agregar operario ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
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
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
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
              <div key={op.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 group">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 capitalize">{op.name}</span>
                  <button onClick={() => {
                    const newName = prompt(`Renombrar "${op.name}" a:`, op.name);
                    if (newName && newName.trim().toLowerCase() !== op.name) handleRename(op.id, newName.trim().toLowerCase());
                  }}
                    className="text-[10px] text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Editar
                  </button>
                </div>
                <button onClick={() => handleDelete(op.id, op.name)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Card: Duplicados ── */}
      {similarGroups.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
          <button onClick={() => setShowDuplicates(!showDuplicates)}
            className="w-full px-5 py-3 flex items-center justify-between hover:bg-amber-50 transition-colors">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-900">
                {similarGroups.length} grupo{similarGroups.length > 1 ? 's' : ''} con nombres similares
              </span>
            </div>
            <span className="text-xs text-amber-600 font-medium">
              {showDuplicates ? 'Ocultar' : 'Revisar'}
            </span>
          </button>

          {showDuplicates && (
            <div className="divide-y divide-amber-100 border-t border-amber-100">
              {similarGroups.map((group, gi) => (
                <div key={gi} className="p-4 space-y-2">
                  <p className="text-xs font-medium text-amber-700 mb-2">
                    Grupo {gi + 1} — {group.length} nombres similares
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.map(op => (
                      <div key={op.id}
                        className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-sm capitalize">
                        <span className="text-gray-700">{op.name}</span>
                        <button onClick={() => handleDelete(op.id, op.name)}
                          className="p-0.5 rounded text-amber-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-gray-500 self-center mr-1">Unificar como:</span>
                    {group.map(op => (
                      <button key={op.id} onClick={() => handleMerge(group, op.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors">
                        <Check className="w-3 h-3" />
                        {op.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
