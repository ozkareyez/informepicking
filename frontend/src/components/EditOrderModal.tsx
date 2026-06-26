import { useForm } from 'react-hook-form';
import { X, Save } from 'lucide-react';
import type { Order } from '../types';
import { getToday, getCurrentTime } from '../utils';

interface Props {
  order: Order | null;
  onSave: (id: number, data: any) => Promise<void>;
  onClose: () => void;
}

export default function EditOrderModal({ order, onSave, onClose }: Props) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Editar pedido</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input type="date" {...register('date', { required: true })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <input type="text" {...register('cliente', { required: true })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input type="text" {...register('sku', { required: true })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kg</label>
              <input type="number" step="0.01" min="0.01" {...register('kg', { required: true, min: 0.01 })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operario</label>
              <input type="text" {...register('operator', { required: true })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select {...register('type', { required: true })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                <option value="Masivo">Masivo</option>
                <option value="Venta Directa">Venta Directa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
              <input type="time" {...register('start_time', { required: true })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora final</label>
              <input type="time" {...register('end_time', { required: true })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" />
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
