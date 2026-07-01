import { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const CLEAR_PASSWORD = import.meta.env.VITE_CLEAR_PASSWORD || 'admin123';

export default function PasswordModal({ title, message, onConfirm, onCancel }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === CLEAR_PASSWORD) {
      onConfirm();
    } else {
      setError('Contraseña incorrecta');
      setPassword('');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-orange-500" />
            {title}
          </h2>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <p className="text-sm text-gray-600">{message}</p>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="Contraseña"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">
              Cancelar
            </button>
            <button type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-orange-600 hover:bg-orange-700">
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
