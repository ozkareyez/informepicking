import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Send, Clock } from 'lucide-react';
import type { OrderFormData } from '../types';
import { getToday, getCurrentTime } from '../utils';

const CLIENTS_KEY = 'pedidos_known_clients';

function getKnownClients(): string[] {
  try {
    const raw = localStorage.getItem(CLIENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addKnownClient(name: string) {
  const clients = getKnownClients();
  if (!clients.includes(name)) {
    clients.unshift(name);
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients.slice(0, 50)));
  }
}

interface Props {
  onSubmit: (data: OrderFormData) => Promise<void>;
}

export default function OrderForm({ onSubmit }: Props) {
  const [knownClients, setKnownClients] = useState<string[]>(getKnownClients);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputCliente, setInputCliente] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<OrderFormData>({
    defaultValues: {
      date: getToday(),
      cliente: '',
      sku: '',
      kg: 0,
      operator: '',
      start_time: '',
      type: 'Masivo',
    },
  });

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredClients = knownClients.filter(c =>
    c.toLowerCase().includes(inputCliente.toLowerCase())
  );

  function selectClient(name: string) {
    setInputCliente(name);
    setValue('cliente', name);
    setShowSuggestions(false);
  }

  async function handleFormSubmit(data: OrderFormData) {
    const start = getCurrentTime();
    addKnownClient(data.cliente);
    await onSubmit({ ...data, start_time: start });
    reset({
      date: getToday(),
      cliente: '',
      sku: '',
      kg: 0,
      operator: '',
      start_time: '',
      type: 'Masivo',
    });
    setInputCliente('');
    setKnownClients(getKnownClients());
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Send className="w-5 h-5 text-blue-600" />
        Asignar pedido a operario
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div ref={wrapperRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
          <input
            value={inputCliente}
            onChange={e => { setInputCliente(e.target.value); setValue('cliente', e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nombre del cliente"
            autoComplete="off"
          />
          <input type="hidden" {...register('cliente', { required: 'Obligatorio' })} />
          {showSuggestions && filteredClients.length > 0 && (
            <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
              {filteredClients.map(c => (
                <li key={c}
                  onClick={() => selectClient(c)}
                  className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer text-gray-700"
                >{c}</li>
              ))}
            </ul>
          )}
          {errors.cliente && <p className="text-red-500 text-xs mt-1">{errors.cliente.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
          <input type="text" {...register('sku', { required: 'Obligatorio' })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ej: PROD-001" />
          {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kilogramos (kg)</label>
          <input type="number" step="0.01" min="0.01" {...register('kg', { required: 'Obligatorio', min: { value: 0.01, message: 'Debe ser > 0' } })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          {errors.kg && <p className="text-red-500 text-xs mt-1">{errors.kg.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Operario</label>
          <input type="text" {...register('operator', { required: 'Obligatorio' })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Nombre del operario" />
          {errors.operator && <p className="text-red-500 text-xs mt-1">{errors.operator.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de pedido</label>
          <select {...register('type', { required: 'Obligatorio' })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="Masivo">Masivo</option>
            <option value="Venta Directa">Venta Directa</option>
          </select>
        </div>

        <div className="flex items-end">
          <div className="w-full p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-gray-600 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>La hora de inicio se capturará <strong>automáticamente</strong> al asignar</span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button type="submit" disabled={isSubmitting}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm">
          <Send className="w-4 h-4" />
          Asignar pedido
        </button>
      </div>
    </form>
  );
}
