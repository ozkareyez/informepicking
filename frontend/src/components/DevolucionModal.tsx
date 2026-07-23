import { useState } from 'react';
import { RotateCcw, X, Eye, EyeOff, Lock, FileText } from 'lucide-react';
import type { Order } from '../types';
import { round2 } from '../utils';

interface Props {
  order: Order;
  onConfirm: (password: string, notas: string) => Promise<void>;
  onCancel: () => void;
}

export default function DevolucionModal({ order, onConfirm, onCancel }: Props) {
  const [password, setPassword] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const saldo = round2(order.kg - order.despachado_kg);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError('Ingrese la contraseña');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onConfirm(password, notas);
    } catch (err: any) {
      setError(err.message || 'Error');
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-red-500" />
            Devolución a bodega
          </h2>
          <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Resumen del pedido */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
            <p className="text-sm font-medium text-red-900">{order.cliente} - {order.sku}</p>
            <div className="flex justify-between text-xs text-red-700">
              <span>Total: <strong>{round2(order.kg)} kg</strong></span>
              <span>Despachado: <strong>{round2(order.despachado_kg)} kg</strong></span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-red-800 pt-1 border-t border-red-200">
              <span>Saldo a devolver:</span>
              <span>{saldo} kg</span>
            </div>
          </div>

          {/* Notas de devolución */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              Nota de devolución (opcional)
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej: Producto dañado, cliente rechazó, falta de espacio..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              Contraseña admin
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Contraseña"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onCancel} disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5">
              {loading ? (
                'Procesando...'
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  Confirmar devolución
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
