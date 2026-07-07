import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save } from 'lucide-react';
import type { Order, Operator } from '../types';
import { getOperators } from '../api';
import { getToday, getCurrentTime } from '../utils';

interface Props {
  order: Order | null;
  onSave: (id: number, data: any) => Promise<void>;
  onClose: () => void;
}

export default function EditOrderModal({ order, onSave, onClose }: Props) {
  const [operators, setOperators] = useState<Operator[]>([]);

  useEffect(() => {
    getOperators().then(setOperators).catch(() => {});
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    values: order ? {
      date: order.date,
      cliente: order.cliente,
      sku: order.sku,
      kg: order.kg,
      operator: order.operator,
      start_time: order.start_time,
      end_time: order.end_time ?? '',
      type: order.type,
    } : undefined,
  });

  if (!order) return null;

  async function handleFormSubmit(data: any) {
    if (data.end_time <= data.start_time) {
      alert('La hora final debe ser mayor que la hora inicial');
      return;
    }
    if (data.kg <= 0) {
      alert('Los kg deben ser mayores a 0');
      return;
    }
    await onSave(order!.id, data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Editar pedido</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Fecha</label>
              <input type="date" {...register('date', { required: true })}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Cliente</label>
              <input type="text" {...register('cliente', { required: true })}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">SKU</label>
              <input type="text" {...register('sku', { required: true })}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Kg</label>
              <input type="number" step="0.01" min="0.01" {...register('kg', { required: true, min: 0.01 })}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Operario</label>
              <select {...register('operator', { required: true })}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Seleccionar</option>
                {operators.map(op => (
                  <option key={op.id} value={op.name}>{op.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Tipo</label>
              <select {...register('type', { required: true })}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500">
                <option value="Masivo">Masivo</option>
                <option value="Venta Directa">Venta Directa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Inicio</label>
              <input type="time" {...register('start_time', { required: true })}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Final</label>
              <input type="time" {...register('end_time', { required: true })}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="mt-4 flex gap-2 justify-end">
            <button type="button" onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-3.5 h-3.5" />
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
