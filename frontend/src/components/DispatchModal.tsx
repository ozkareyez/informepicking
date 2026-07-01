import { useState } from 'react';
import { X, Truck, Save } from 'lucide-react';
import type { Order } from '../types';
import { getCurrentTime, calculateCargueTime } from '../utils';

interface Props {
  order: Order;
  onSave: (id: number, data: {
    plc: string;
    placa: string;
    cargue_start: string;
    cargue_end: string;
  }) => Promise<void>;
  onClose: () => void;
}

export default function DispatchModal({ order, onSave, onClose }: Props) {
  const [plc, setPlc] = useState(order.plc ?? '');
  const [placa, setPlaca] = useState(order.placa ?? '');
  const [cargueStart, setCargueStart] = useState(order.cargue_start ?? '');
  const [cargueEnd, setCargueEnd] = useState(order.cargue_end ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cargueTimePreview =
    cargueStart && cargueEnd && cargueEnd > cargueStart
      ? calculateCargueTime(cargueStart, cargueEnd)
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!plc.trim()) { setError('El número de PLC es obligatorio'); return; }
    if (!placa.trim()) { setError('La placa del vehículo es obligatoria'); return; }
    if (!cargueStart) { setError('La hora de inicio de cargue es obligatoria'); return; }
    if (!cargueEnd) { setError('La hora de fin de cargue es obligatoria'); return; }
    if (cargueEnd <= cargueStart) { setError('La hora fin debe ser mayor a la hora inicio'); return; }

    setSaving(true);
    try {
      await onSave(order.id, { plc: plc.trim(), placa: placa.trim(), cargue_start: cargueStart, cargue_end: cargueEnd });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function setNow(field: 'start' | 'end') {
    const time = getCurrentTime();
    if (field === 'start') setCargueStart(time);
    else setCargueEnd(time);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 sm:px-4 py-4 sm:py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-blue-600" />
            Despachar pedido
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-4 space-y-4 sm:space-y-3">
          <div className="bg-gray-50 rounded-md p-2 text-xs grid grid-cols-2 gap-1">
            <span><span className="text-gray-500">Cliente:</span> <strong>{order.cliente}</strong></span>
            <span><span className="text-gray-500">SKU:</span> <strong>{order.sku}</strong></span>
            <span><span className="text-gray-500">Kg:</span> <strong>{order.kg}</strong></span>
            <span><span className="text-gray-500">Tipo:</span> <strong>{order.type}</strong></span>
          </div>

          <div>
            <label className="block text-xs sm:text-[10px] font-medium text-gray-500 mb-1 sm:mb-0.5">PLC (documento)</label>
            <input type="text" value={plc} onChange={e => setPlc(e.target.value)}
              placeholder="Ej: PLC-2024-001"
              className="w-full rounded-lg sm:rounded-md border border-gray-300 px-4 sm:px-2.5 py-3 sm:py-1.5 text-base sm:text-sm focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs sm:text-[10px] font-medium text-gray-500 mb-1 sm:mb-0.5">Placa del vehículo</label>
            <input type="text" value={placa} onChange={e => setPlaca(e.target.value)}
              placeholder="Ej: ABC-123"
              className="w-full rounded-lg sm:rounded-md border border-gray-300 px-4 sm:px-2.5 py-3 sm:py-1.5 text-base sm:text-sm uppercase focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-2">
            <div>
              <label className="block text-xs sm:text-[10px] font-medium text-gray-500 mb-1 sm:mb-0.5">Inicio cargue</label>
              <div className="flex gap-1.5 sm:gap-1">
                <input type="time" value={cargueStart} onChange={e => setCargueStart(e.target.value)}
                  className="flex-1 rounded-lg sm:rounded-md border border-gray-300 px-3 sm:px-2 py-3 sm:py-1.5 text-base sm:text-sm focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => setNow('start')}
                  className="px-3 sm:px-1.5 py-3 sm:py-1 text-sm sm:text-[10px] bg-gray-100 rounded-lg sm:rounded-md hover:bg-gray-200 text-gray-600 shrink-0 min-w-[60px] sm:min-w-0">
                  Ahora
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-[10px] font-medium text-gray-500 mb-1 sm:mb-0.5">Fin cargue</label>
              <div className="flex gap-1.5 sm:gap-1">
                <input type="time" value={cargueEnd} onChange={e => setCargueEnd(e.target.value)}
                  className="flex-1 rounded-lg sm:rounded-md border border-gray-300 px-3 sm:px-2 py-3 sm:py-1.5 text-base sm:text-sm focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => setNow('end')}
                  className="px-3 sm:px-1.5 py-3 sm:py-1 text-sm sm:text-[10px] bg-gray-100 rounded-lg sm:rounded-md hover:bg-gray-200 text-gray-600 shrink-0 min-w-[60px] sm:min-w-0">
                  Ahora
                </button>
              </div>
            </div>
          </div>

          {cargueTimePreview && (
            <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5 text-xs text-blue-800 flex items-center gap-1.5">
              <Truck className="w-3 h-3" />
              Tiempo de cargue: <strong>{cargueTimePreview}</strong>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-1.5 text-xs text-red-700">{error}</div>
          )}

          <div className="flex gap-3 sm:gap-2 justify-end sm:justify-end pt-2 sm:pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 sm:flex-none px-4 sm:px-3 py-3 sm:py-1.5 rounded-lg sm:rounded-md text-sm sm:text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-1 bg-blue-600 text-white px-4 sm:px-3 py-3 sm:py-1.5 rounded-lg sm:rounded-md text-sm sm:text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
              {saving ? 'Guardando...' : 'Despachar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
