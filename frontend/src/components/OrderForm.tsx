import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { FilePlus, Upload, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';
import type { RegisterOrderData } from '../types';
import { getToday } from '../utils';
import { createOrders } from '../api';
import * as XLSX from 'xlsx';

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
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<RegisterOrderData[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
        if (json.length === 0) {
          setImportErrors(['El archivo no contiene datos']);
          return;
        }

        // Helper to convert Excel serial date to YYYY-MM-DD
        const excelDateToISO = (value: any): string => {
          if (value == null || value === '') return '';
          const num = Number(value);
          if (isNaN(num)) {
            // Already a date string, try to parse
            const parsed = new Date(value);
            if (!isNaN(parsed.getTime())) {
              return parsed.toISOString().split('T')[0];
            }
            return String(value).trim();
          }
          // Excel serial date: days since 1900-01-01 (with 1900 leap year bug)
          // Convert to JS Date: (serial - 25569) * 86400 * 1000
          const utcDays = Math.floor(num - 25569);
          const utcMs = utcDays * 86400 * 1000;
          const date = new Date(utcMs);
          return date.toISOString().split('T')[0];
        };

        const parsed: RegisterOrderData[] = [];
        const errs: string[] = [];
        for (let i = 0; i < json.length; i++) {
          const row = json[i];
          const fecha = excelDateToISO(row['Fecha'] || row['fecha'] || row['date'] || row['Date']);
          const cliente = String(row['Cliente'] || row['cliente'] || '').trim();
          const sku = String(row['SKU'] || row['sku'] || '').trim();
          const kg = Number(row['Kg'] || row['kg'] || row['KG'] || 0);
          const tipo = String(row['Tipo'] || row['tipo'] || row['type'] || row['Type'] || '').trim();

          const line = i + 2;
          if (!fecha) errs.push(`Fila ${line}: falta Fecha`);
          if (!cliente) errs.push(`Fila ${line}: falta Cliente`);
          if (!sku) errs.push(`Fila ${line}: falta SKU`);
          if (!kg || kg <= 0) errs.push(`Fila ${line}: Kg inválido`);
          if (tipo !== 'Masivo' && tipo !== 'Venta Directa') errs.push(`Fila ${line}: Tipo debe ser "Masivo" o "Venta Directa"`);

          if (fecha && cliente && sku && kg > 0 && (tipo === 'Masivo' || tipo === 'Venta Directa')) {
            parsed.push({ date: fecha, cliente, sku, kg, type: tipo });
          }
        }
        if (parsed.length === 0) errs.push('No se pudieron leer registros válidos');
        setImportErrors(errs);
        setImportRows(parsed);
        setImportFileName(file.name);
      } catch {
        setImportErrors(['Error al leer el archivo. Asegúrate de que sea un Excel válido.']);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="bg-white rounded-xl sm:rounded-lg shadow-sm border border-gray-100 p-4 sm:p-4">
        <h2 className="text-base sm:hidden font-semibold text-gray-900 mb-3">Registrar pedido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-3 items-end">
          <div ref={wrapperRef} className="relative">
            <label className="block text-sm sm:text-xs font-medium text-gray-700 sm:text-gray-500 mb-1 sm:mb-0.5">Cliente</label>
            <input
              value={inputCliente}
              onChange={e => { setInputCliente(e.target.value.toUpperCase()); setValue('cliente', e.target.value.toUpperCase()); setShowSuggestions(true); }}
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
            <input type="text" {...register('sku', { required: 'Obligatorio', setValueAs: (v) => v.toUpperCase() })}
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

      <div className="bg-white rounded-xl sm:rounded-lg shadow-sm border border-gray-100">
        <button onClick={() => setShowImport(!showImport)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl sm:rounded-lg">
          <span className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-600" />
            Importar desde Excel
          </span>
          {showImport ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showImport && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}>
              <FileSpreadsheet className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">{importFileName || 'Haz clic para seleccionar un archivo Excel'}</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImportFile} className="hidden" />
            </div>

            {importErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-700 mb-1">Errores:</p>
                {importErrors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
              </div>
            )}

            {importRows.length > 0 && importErrors.length === 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">{importRows.length} pedido{importRows.length !== 1 ? 's' : ''} listo{importRows.length !== 1 ? 's' : ''} para importar</p>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">Fecha</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">Cliente</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">SKU</th>
                        <th className="px-2 py-1.5 text-right font-medium text-gray-500">Kg</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">Tipo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {importRows.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-2 py-1 text-gray-900">{r.date}</td>
                          <td className="px-2 py-1 text-gray-700 truncate max-w-[120px]">{r.cliente}</td>
                          <td className="px-2 py-1 text-gray-700">{r.sku}</td>
                          <td className="px-2 py-1 text-right text-gray-700">{r.kg}</td>
                          <td className="px-2 py-1 text-gray-700">{r.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={async () => {
                  setImporting(true);
                  try {
                    await createOrders(importRows);
                    setImportRows([]);
                    setImportFileName('');
                    setImportErrors([]);
                    setShowImport(false);
                  } catch (err: any) {
                    setImportErrors([err.message || 'Error al importar']);
                  } finally {
                    setImporting(false);
                  }
                }}
                  disabled={importing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 mt-3">
                  {importing ? (
                    <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> Importando...</>
                  ) : (
                    <>Importar {importRows.length > 0 ? `(${importRows.length})` : ''}</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
