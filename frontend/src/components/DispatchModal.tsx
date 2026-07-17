import { useState, useMemo, useEffect } from 'react';
import { X, Truck, Save, Package, MapPin, AlertTriangle, AlertCircle } from 'lucide-react';
import type { Order, Despacho, CitaCargue } from '../types';
import { getCurrentTime, calculateCargueTime, getToday } from '../utils';

interface Props {
  order: Order;
  despachos: Despacho[];
  onSave: (orderId: number, data: {
    placa: string;
    plc: string;
    kg: number;
    date: string;
    cargue_start: string;
    cargue_end: string;
    ruta: string;
    novedad?: boolean;
    cantidad_referencias_novedad?: number;
  }) => Promise<void>;
  onClose: () => void;
  cita?: CitaCargue | null;
}

export default function DispatchModal({ order, despachos, onSave, onClose, cita }: Props) {
  const saldo = order.kg - order.despachado_kg;
  const existingRuta = despachos.length > 0 ? despachos[0].ruta : '';
  const citaRuta = cita?.ruta || '';
  const citaPlaca = cita?.placa || '';
  const citaKg = cita?.kg || 0;

  const defaultRuta = existingRuta || (despachos.length === 0 ? (citaRuta || order.cliente) : '');
  const [ruta, setRuta] = useState(defaultRuta);
  const [placa, setPlaca] = useState(citaPlaca);
  const [plc, setPlc] = useState('');
  const [kg, setKg] = useState(citaKg > 0 ? String(citaKg) : (saldo > 0 ? String(saldo) : ''));
  const [date, setDate] = useState(getToday());
  const [cargueStart, setCargueStart] = useState('');
  const [cargueEnd, setCargueEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [novedad, setNovedad] = useState(false);
  const [cantidadReferenciasNovedad, setCantidadReferenciasNovedad] = useState(0);

  // Update form when cita changes
  useEffect(() => {
    if (cita) {
      setRuta(cita.ruta || defaultRuta);
      setPlaca(cita.placa || '');
      setKg(String(cita.kg || saldo));
    }
  }, [cita, defaultRuta, saldo]);

  const kgNum = parseFloat(kg) || 0;
  const cargueTimePreview =
    cargueStart && cargueEnd && cargueEnd > cargueStart
      ? calculateCargueTime(cargueStart, cargueEnd)
      : null;

  function handleRutaChange(val: string) {
    setRuta(val);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!ruta.trim() && despachos.length === 0) { setError('El nombre de ruta es obligatorio'); return; }
    if (!placa.trim()) { setError('La placa del vehículo es obligatoria'); return; }
    if (!plc.trim()) { setError('El número de PLC es obligatorio'); return; }
    if (!kg || kgNum <= 0) { setError('Los kg deben ser mayor a 0'); return; }
    if (kgNum > saldo) { setError(`Los kg no pueden exceder el saldo disponible (${saldo} kg)`); return; }
    if (!cargueStart) { setError('La hora de inicio de cargue es obligatoria'); return; }
    if (!cargueEnd) { setError('La hora de fin de cargue es obligatoria'); return; }
    if (cargueEnd <= cargueStart) { setError('La hora fin debe ser mayor a la hora inicio'); return; }
    if (novedad && cantidadReferenciasNovedad <= 0) { setError('Si hay novedad, debe ingresar la cantidad de referencias con novedad'); return; }

    setSaving(true);
    try {
      await onSave(order.id, {
        ruta: ruta.trim(),
        placa: placa.trim(),
        plc: plc.trim(),
        kg: kgNum,
        date,
        cargue_start: cargueStart,
        cargue_end: cargueEnd,
        novedad,
        cantidad_referencias_novedad: novedad ? cantidadReferenciasNovedad : 0,
      });
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
            {despachos.length === 0 ? 'Despachar pedido' : 'Agregar vehículo'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-5 sm:p-4 space-y-4 sm:space-y-3">
          {/* Order info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-sm font-medium text-blue-900">
              <Package className="w-4 h-4" />
              {order.cliente}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-800">
              <span>SKU: <strong>{order.sku}</strong></span>
              <span>Total: <strong>{order.kg} kg</strong></span>
              <span>Despachado: <strong>{order.despachado_kg} kg</strong></span>
              <span className="text-amber-700 font-semibold">Saldo: <strong>{saldo} kg</strong></span>
              <span className="col-span-2">Operario: <strong>{order.operator}</strong></span>
            </div>
          </div>

          {/* Previous vehicles */}
          {despachos.length > 0 && (
            <div className="bg-gray-50 rounded-md p-2 space-y-1">
              <p className="text-xs font-medium text-gray-500">Vehículos ya despachados ({despachos.length}):</p>
              {despachos.map(d => (
                <div key={d.id} className="text-xs text-gray-700 flex flex-wrap gap-x-3">
                  <span><strong>{d.placa}</strong></span>
                  <span>{d.kg} kg</span>
                  <span>PLC: {d.plc}</span>
                  <span>{d.cargue_time}</span>
                  {d.novedad && <span className="text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Novedad: {d.cantidad_referencias_novedad} refs</span>}
                </div>
              ))}
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-xs sm:text-[10px] font-medium text-gray-500 mb-1 sm:mb-0.5">Fecha del despacho</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full rounded-lg sm:rounded-md border border-gray-300 px-4 sm:px-2.5 py-3 sm:py-1.5 text-base sm:text-sm focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Route name */}
          <div>
            <label className="block text-xs sm:text-[10px] font-medium text-gray-500 mb-1 sm:mb-0.5">
              <MapPin className="w-3 h-3 inline mr-1" />
              Nombre de ruta
            </label>
            <input type="text" value={ruta} onChange={e => handleRutaChange(e.target.value)}
              placeholder="Ej: Yalo" readOnly={despachos.length > 0}
              className={`w-full rounded-lg sm:rounded-md border px-4 sm:px-2.5 py-3 sm:py-1.5 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 ${
                despachos.length > 0 ? 'bg-gray-100 text-gray-600' : 'border-gray-300'
              }`} />
            {despachos.length > 0 && (
              <p className="text-[10px] text-gray-400 mt-0.5">La ruta se hereda del primer vehículo</p>
            )}
          </div>

          {/* Placa */}
          <div>
            <label className="block text-xs sm:text-[10px] font-medium text-gray-500 mb-1 sm:mb-0.5">Placa del vehículo</label>
            <input type="text" value={placa} onChange={e => setPlaca(e.target.value)}
              placeholder="Ej: ABC-123"
              className="w-full rounded-lg sm:rounded-md border border-gray-300 px-4 sm:px-2.5 py-3 sm:py-1.5 text-base sm:text-sm uppercase focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* PLC (documento) */}
          <div>
            <label className="block text-xs sm:text-[10px] font-medium text-gray-500 mb-1 sm:mb-0.5">
              PLC (documento)
            </label>
            <input type="text" value={plc} onChange={e => setPlc(e.target.value)}
              placeholder="Ej: PLC-001"
              className="w-full rounded-lg sm:rounded-md border border-gray-300 px-4 sm:px-2.5 py-3 sm:py-1.5 text-base sm:text-sm focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Kg */}
          <div>
            <label className="block text-xs sm:text-[10px] font-medium text-gray-500 mb-1 sm:mb-0.5">
              Kg a cargar <span className="text-gray-400">(máx: {saldo} kg)</span>
            </label>
            <input type="number" value={kg} onChange={e => setKg(e.target.value)}
              placeholder={`0 - ${saldo}`} min="1" max={saldo}
              className="w-full rounded-lg sm:rounded-md border border-gray-300 px-4 sm:px-2.5 py-3 sm:py-1.5 text-base sm:text-sm focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Novedad section */}
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="novedad-checkbox"
                checked={novedad}
                onChange={e => {
                  setNovedad(e.target.checked);
                  if (!e.target.checked) setCantidadReferenciasNovedad(0);
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <label htmlFor="novedad-checkbox" className="text-sm font-medium text-amber-900 cursor-pointer">
                ¿Hubo novedad en el cargue?
              </label>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            {novedad && (
              <div>
                <label className="block text-xs font-medium text-amber-800 mb-1">
                  Cantidad de referencias con novedad
                </label>
                <input
                  type="number"
                  min="1"
                  value={cantidadReferenciasNovedad}
                  onChange={e => setCantidadReferenciasNovedad(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg sm:rounded-md border border-amber-300 bg-amber-50 px-4 sm:px-2.5 py-3 sm:py-1.5 text-base sm:text-sm focus:ring-2 focus:ring-amber-500"
                  required
                />
                <p className="text-[10px] text-amber-600 mt-1">
                  Indique cuántas referencias/SKUs presentaron novedad al separar el pedido
                </p>
              </div>
            )}
          </div>

          {/* Cargue times */}
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
              {saving ? 'Guardando...' : despachos.length === 0 ? 'Despachar' : 'Agregar vehículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
