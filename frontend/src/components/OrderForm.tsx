import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { FilePlus } from 'lucide-react';
import type { RegisterOrderData } from '../types';
import { getToday } from '../utils';

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
  onSubmit: (data: RegisterOrderData) => Promise<void>;
}

export default function OrderForm({ onSubmit }: Props) {
  const [knownClients, setKnownClients] = useState<string[]>(getKnownClients);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputCliente, setInputCliente] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<RegisterOrderData>({
    defaultValues: {
      date: getToday(),
      cliente: '',
      sku: '',
      kg: 0,
      type: 'Masivo',
    },
  });

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

  async function handleFormSubmit(data: RegisterOrderData) {
    addKnownClient(data.cliente);
    await onSubmit(data);
    reset({
      date: getToday(),
      cliente: '',
      sku: '',
      kg: 0,
      type: 'Masivo',
    });
    setInputCliente('');
    setKnownClients(getKnownClients());
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="bg-white rounded-xl sm:rounded-lg shadow-sm border border-gray-100 p-4 sm:p-4">
      <h2 className="text-base sm:hidden font-semibold text-gray-900 mb-3">Registrar pedido</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-3 items-end">
        <div ref={wrapperRef} className="relative">
          <label className="block text-sm sm:text-xs font-medium text-gray-700 sm:text-gray-500 mb-1 sm:mb-0.5">Cliente</label>
          <input
            value={inputCliente}
            onChange={e => { setInputCliente(e.target.value); setValue('cliente', e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full rounded-lg sm:rounded-md border border-gray-300 px-4 sm:px-2.5 py-3 sm:py-1.5 text-base sm:text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre del cliente"
            autoComplete="off"
          />
          <input type="hidden" {...register('cliente', { required: 'Obligatorio' })} />
          {showSuggestions && filteredClients.length > 0 && (
            <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
              {filteredClients.map(c => (
                <li key={c}
                  onClick={() => selectClient(c)}
                  className="px-4 sm:px-2.5 py-3 sm:py-1.5 text-base sm:text-sm hover:bg-blue-50 cursor-pointer text-gray-700"
                >{c}</li>
              ))}
            </ul>
          )}
          {errors.cliente && <p className="text-red-500 text-xs sm:text-[10px] mt-1 sm:mt-0.5">{errors.cliente.message}</p>}
        </div>

        <div>
          <label className="block text-sm sm:text-xs font-medium text-gray-700 sm:text-gray-500 mb-1 sm:mb-0.5">SKU</label>
          <input type="text" {...register('sku', { required: 'Obligatorio' })}
            className="w-full rounded-lg sm:rounded-md border border-gray-300 px-4 sm:px-2.5 py-3 sm:py-1.5 text-base sm:text-sm focus:ring-2 focus:ring-blue-500" placeholder="Ej: PROD-001" />
          {errors.sku && <p className="text-red-500 text-xs sm:text-[10px] mt-1 sm:mt-0.5">{errors.sku.message}</p>}
        </div>

        <div>
          <label className="block text-sm sm:text-xs font-medium text-gray-700 sm:text-gray-500 mb-1 sm:mb-0.5">Kg</label>
          <input type="number" step="0.01" min="0.01" {...register('kg', { required: 'Obligatorio', min: { value: 0.01, message: 'Debe ser > 0' } })}
            className="w-full rounded-lg sm:rounded-md border border-gray-300 px-4 sm:px-2.5 py-3 sm:py-1.5 text-base sm:text-sm focus:ring-2 focus:ring-blue-500" />
          {errors.kg && <p className="text-red-500 text-xs sm:text-[10px] mt-1 sm:mt-0.5">{errors.kg.message}</p>}
        </div>

        <div>
          <label className="block text-sm sm:text-xs font-medium text-gray-700 sm:text-gray-500 mb-1 sm:mb-0.5">Tipo</label>
          <select {...register('type', { required: 'Obligatorio' })}
            className="w-full rounded-lg sm:rounded-md border border-gray-300 px-4 sm:px-2.5 py-3 sm:py-1.5 text-base sm:text-sm focus:ring-2 focus:ring-blue-500">
            <option value="Masivo">Masivo</option>
            <option value="Venta Directa">Venta Directa</option>
          </select>
        </div>

        <div className="sm:mb-0">
          <button type="submit" disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 sm:gap-1.5 bg-blue-600 text-white px-4 py-3 sm:py-1.5 rounded-lg sm:rounded-md font-medium text-base sm:text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 min-h-[48px] sm:min-h-0">
            <FilePlus className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
            Registrar pedido
          </button>
        </div>
      </div>
    </form>
  );
}
