import { useState, useEffect, useCallback, useRef } from 'react';
import { Truck, Clock, AlertTriangle, CheckCircle, XCircle, Edit3, Save, Loader2, Search, Plus, Truck as TruckIcon, Upload, FileSpreadsheet, Bell, Car } from 'lucide-react';
import { getCitasCargue, createCitaCargue, updateCitaCargue, deleteCitaCargue } from '../api';
import type { CitaCargue, CitaCargueFormData } from '../types';
import { getCurrentTime } from '../utils';
import * as XLSX from 'xlsx';

interface Props {
  onDispatchFromCita?: (cita: CitaCargue) => Promise<void>;
}

export default function CitasCargueView({ onDispatchFromCita }: Props) {
  const [citas, setCitas] = useState<CitaCargue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Import state
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<CitaCargueFormData[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Late vehicles tracking state
  const [showLateVehicles, setShowLateVehicles] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingCita, setEditingCita] = useState<CitaCargue | null>(null);
  const [ruta, setRuta] = useState('');
  const [placa, setPlaca] = useState('');
  const [kg, setKg] = useState('');
  const [tipo, setTipo] = useState<'Masivo' | 'Venta Directa'>('Masivo');
  const [horaCita, setHoraCita] = useState(getCurrentTime());
  const [horaLlegada, setHoraLlegada] = useState('');
  const [cumplioCita, setCumplioCita] = useState<boolean | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Derived state
  const total = citas.length;
  const cumplieron = citas.filter(c => c.cumplio_cita === true).length;
  const noCumplieron = citas.filter(c => c.cumplio_cita === false).length;
  const sinMarcar = citas.filter(c => c.cumplio_cita === null).length;
  const hasImportErrors = importErrors.length > 0;
  const hasImportRows = importRows.length > 0 && importErrors.length === 0;
  const hasLateVehicles = citas.some(c => c.cumplio_cita === false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCitasCargue();
      setCitas(data);
    } catch {
      console.error('Error loading citas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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

        const parsed: CitaCargueFormData[] = [];
        const errs: string[] = [];
        for (let i = 0; i < json.length; i++) {
          const row = json[i];
          const rowRuta = String(row['Ruta'] || row['ruta'] || '').trim().toUpperCase();
          const rowPlaca = String(row['Placa'] || row['placa'] || '').trim().toUpperCase();
          const rowKg = Number(row['Kg'] || row['kg'] || row['KG'] || 0);
          const rowTipo = String(row['Tipo'] || row['tipo'] || row['type'] || row['Type'] || '').trim();
          const rowHoraCita = String(row['Hora cita'] || row['hora_cita'] || '').trim();

          const line = i + 2;
          if (!rowRuta) errs.push(`Fila ${line}: falta Ruta`);
          if (!rowPlaca) errs.push(`Fila ${line}: falta Placa`);
          if (!rowKg || rowKg <= 0) errs.push(`Fila ${line}: Kg inválido`);
          if (!rowHoraCita) errs.push(`Fila ${line}: falta Hora cita`);
          if (rowTipo !== 'Masivo' && rowTipo !== 'Venta Directa') errs.push(`Fila ${line}: Tipo debe ser "Masivo" o "Venta Directa"`);

          if (rowRuta && rowPlaca && rowKg > 0 && rowHoraCita && (rowTipo === 'Masivo' || rowTipo === 'Venta Directa')) {
            parsed.push({
              ruta: rowRuta,
              placa: rowPlaca.toUpperCase(),
              kg: rowKg,
              tipo: rowTipo as 'Masivo' | 'Venta Directa',
              hora_cita: rowHoraCita,
            });
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

  function resetForm() {
    setEditingCita(null);
    setRuta('');
    setPlaca('');
    setKg('');
    setTipo('Masivo');
    setHoraCita(getCurrentTime());
    setHoraLlegada('');
    setCumplioCita(null);
    setObservaciones('');
    setError('');
  }

  function editCita(cita: CitaCargue) {
    setEditingCita(cita);
    setRuta(cita.ruta);
    setPlaca(cita.placa);
    setKg(String(cita.kg));
    setTipo(cita.tipo);
    setHoraCita(cita.hora_cita);
    setHoraLlegada(cita.hora_llegada || '');
    setCumplioCita(cita.cumplio_cita);
    setObservaciones(cita.observaciones || '');
    setShowForm(true);
    setError('');
  }

  // Mark arrival and calculate delay
  async function handleMarcarLlegada(cita: CitaCargue) {
    const now = getCurrentTime();
    const [citaH, citaM] = cita.hora_cita.split(':').map(Number);
    const [llegH, llegM] = now.split(':').map(Number);
    const citaMin = citaH * 60 + citaM;
    const llegMin = llegH * 60 + llegM;
    const retraso = llegMin - citaMin;
    const cumplio = retraso <= 0;

    try {
      await updateCitaCargue(cita.id, {
        hora_llegada: now,
        retraso_minutos: retraso,
        cumplio_cita: cumplio,
      });
      load();
    } catch (err: any) {
      alert('Error al marcar llegada: ' + err.message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!placa.trim() || !horaCita || !kg || parseFloat(kg) <= 0) {
      setError('Placa, Kg y hora de cita son obligatorios');
      return;
    }
    if (!/^\d+(\.\d{1,3})?$/.test(kg)) { setError('Máximo 3 decimales en Kg'); return; }

    const data: CitaCargueFormData = {
      ruta: ruta.trim(),
      placa: placa.trim().toUpperCase(),
      kg: parseFloat(kg),
      tipo,
      hora_cita: horaCita,
      hora_llegada: horaLlegada || null,
      cumplio_cita: cumplioCita ?? null,
      observaciones: observaciones.trim() || undefined,
    };

    setSaving(true);
    try {
      if (editingCita) {
        await updateCitaCargue(editingCita.id, data);
      } else {
        await createCitaCargue(data);
      }
      resetForm();
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar esta cita?')) return;
    try {
      await deleteCitaCargue(id);
      load();
    } catch {
      alert('Error al eliminar');
    }
  }

  function getRetrasoClass(minutos: number | null) {
    if (minutos === null) return 'text-gray-400';
    if (minutos > 15) return 'text-red-600 font-bold';
    if (minutos > 0) return 'text-orange-600 font-medium';
    if (minutos < 0) return 'text-green-600';
    return 'text-gray-700';
  }

  function formatRetraso(minutos: number | null) {
    if (minutos === null) return '—';
    if (minutos > 0) return `+${minutos} min (retraso)`;
    if (minutos < 0) return `${minutos} min (adelantado)`;
    return 'A tiempo';
  }

  // Sort: by cita time descending (newest first)
  const sorted = [...citas].sort((a, b) => b.hora_cita.localeCompare(a.hora_cita));

  const filtered = search
    ? sorted.filter(c => {
        const q = search.toLowerCase();
        return c.ruta.toLowerCase().includes(q) || c.placa.toLowerCase().includes(q);
      })
    : sorted;

  // Group late vehicles by placa for the alert panel
  const lateByPlaca = citas
    .filter(c => c.cumplio_cita === false)
    .reduce((acc, c) => {
      if (!acc[c.placa]) acc[c.placa] = { count: 0, totalDelay: 0, lastDate: '', ruta: '' };
      acc[c.placa].count++;
      acc[c.placa].totalDelay += c.retraso_minutos || 0;
      if (c.created_at > acc[c.placa].lastDate) {
        acc[c.placa].lastDate = c.created_at;
        acc[c.placa].ruta = c.ruta;
      }
      return acc;
    }, {} as Record<string, { count: number; totalDelay: number; lastDate: string; ruta: string }>);

  return (
    <div className="space-y-4">
      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500">Total citas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500">Cumplieron</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{cumplieron}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500">No cumplieron</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{noCumplieron}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500">Pendientes / Sin marcar</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{sinMarcar}</p>
        </div>
      </div>

      {/* ── Import Section ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-blue-600" />
            Importar citas desde Excel
          </h2>
          <button onClick={() => { resetForm(); setShowImport(!showImport); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showImport ? 'bg-gray-200 text-gray-700' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}>
            <Upload className="w-3.5 h-3.5" />
            {showImport ? 'Ocultar' : 'Importar Excel'}
          </button>
        </div>

        {showImport && (
          <>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}>
              <FileSpreadsheet className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">{importFileName || 'Haz clic para seleccionar un archivo Excel'}</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImportFile} className="hidden" />
              <p className="text-xs text-gray-400 mt-1">Columnas esperadas: Ruta, Placa, Kg, Tipo, Hora cita</p>
            </div>

            {hasImportErrors && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                <p className="text-xs font-semibold text-red-700 mb-1">Errores:</p>
                {importErrors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
              </div>
            )}

            {hasImportRows && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">{importRows.length} cita{importRows.length !== 1 ? 's' : ''} lista{importRows.length !== 1 ? 's' : ''} para importar</p>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">Ruta</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">Placa</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">Kg</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">Tipo</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">Hora cita</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {importRows.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-2 py-1 text-gray-900">{r.ruta}</td>
                          <td className="px-2 py-1 text-gray-700 truncate max-w-[120px]">{r.placa}</td>
                          <td className="px-2 py-1 text-gray-700">{r.kg}</td>
                          <td className="px-2 py-1 text-gray-700">{r.tipo}</td>
                          <td className="px-2 py-1 text-gray-700">{r.hora_cita}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={async () => {
                  setImporting(true);
                  try {
                    await createCitaCargue(importRows as any);
                    setImportRows([]);
                    setImportFileName('');
                    setImportErrors([]);
                    setShowImport(false);
                    load();
                  } catch (err: any) {
                    setImportErrors([err.message || 'Error al importar']);
                  } finally {
                    setImporting(false);
                  }
                }}
                  disabled={importing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 mt-3">
                  {importing ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Importando...</span>
                  ) : (
                    <span>Importar {importRows.length > 0 ? `(${importRows.length})` : ''}</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Late Vehicles Panel ── */}
      {hasLateVehicles && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-red-900 flex items-center gap-1.5">
              <Bell className="w-4 h-4" />
              Vehículos con retraso frecuente
            </h3>
            <button onClick={() => setShowLateVehicles(!showLateVehicles)}
              className="text-xs text-red-600 hover:text-red-800 font-medium">
              {showLateVehicles ? 'Ocultar' : 'Ver historial'}
            </button>
          </div>
          {showLateVehicles && (
            <div className="space-y-2">
              {Object.entries(lateByPlaca).map(([placaKey, data]) => (
                <div key={placaKey} className="bg-white border border-red-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold text-red-800">{placaKey}</p>
                      <p className="text-xs text-red-600">Ruta: {data.ruta}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-700">{data.count} retraso{data.count !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-red-600">Total: {data.totalDelay} min</p>
                      <p className="text-[10px] text-red-500">Último: {data.lastDate}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Form ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-blue-600" />
            {editingCita ? 'Editar cita' : 'Programar nueva cita'}
          </h2>
          <button onClick={() => { resetForm(); setShowForm(!showForm); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showForm ? 'bg-gray-200 text-gray-700' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}>
            <Plus className="w-3.5 h-3.5" />
            {showForm ? 'Ocultar' : 'Nueva cita'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ruta</label>
                <input type="text" value={ruta} onChange={e => setRuta(e.target.value.toUpperCase())}
                  placeholder="Ej: Cerrito"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Placa</label>
                <input type="text" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())}
                  placeholder="Ej: CEW585"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 uppercase" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kg</label>
                <input type="number" step="0.001" min="0.01" value={kg} onChange={e => setKg(e.target.value)} onBlur={e => { if (e.target.value && !/^\d+(\.\d{1,3})?$/.test(e.target.value)) setKg(''); }}
                  placeholder="Ej: 25000"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="Masivo">Masivo</option>
                  <option value="Venta Directa">Venta Directa</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Hora cita</label>
                <input type="time" value={horaCita} onChange={e => setHoraCita(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Hora llegada real</label>
                <div className="flex gap-2">
                  <input type="time" value={horaLlegada} onChange={e => setHoraLlegada(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setHoraLlegada(getCurrentTime())}
                    className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600">
                    Ahora
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">¿Cumplió la cita?</label>
                <select value={cumplioCita === null ? '' : String(cumplioCita)} onChange={e => setCumplioCita(e.target.value === 'true' ? true : e.target.value === 'false' ? false : null)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="">— Sin marcar —</option>
                  <option value="true">Sí (llegó a tiempo)</option>
                  <option value="false">No (llegó tarde)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Observaciones</label>
                <input type="text" value={observaciones} onChange={e => setObservaciones(e.target.value.toUpperCase())}
                  placeholder="Ej: Vehículo sucio, documentos incompletos..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md px-3 py-1.5 text-xs text-red-700">{error}</div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingCita ? 'Actualizar' : 'Guardar'}
              </button>
              {editingCita && (
                <button type="button" onClick={() => { resetForm(); setShowForm(false); }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* ── List ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex-1 min-w-[160px] relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" placeholder="Buscar por ruta, placa..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <span className="text-xs text-gray-500">{filtered.length} cita{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <Truck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No hay citas registradas</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(c => (
              <div key={c.id} className="rounded-lg border p-3 border-gray-200 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">Ruta: {c.ruta || '—'}</span>
                      <span className="font-medium text-gray-900">Placa: {c.placa}</span>
                      <span className="font-medium text-gray-900">Kg: {c.kg.toLocaleString()}</span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {c.tipo}
                      </span>
                      <span className="text-xs text-gray-500">Cita: {c.hora_cita}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span><Clock className="w-3 h-3 inline mr-0.5" /> Llegada: {c.hora_llegada || <span className="text-gray-400">—</span>}</span>
                      <span className={getRetrasoClass(c.retraso_minutos)}>
                        <AlertTriangle className="w-3 h-3 inline mr-0.5" />
                        Retraso: {formatRetraso(c.retraso_minutos)}
                      </span>
                      {c.cumplio_cita !== null && (
                        <span className={c.cumplio_cita ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                          <CheckCircle className="w-3 h-3 inline mr-0.5" />
                          {c.cumplio_cita ? 'Cumplió' : 'No cumplió'}
                        </span>
                      )}
                      {c.observaciones && (
                        <span className="text-orange-700">
                          <AlertTriangle className="w-3 h-3 inline mr-0.5" />
                          {c.observaciones}
                        </span>
                      )}
                      {c.ruta_cargada && (
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Ruta cargada · PLC: {c.plc || '—'}
                        </span>
                      )}
                      {c.created_by && <span className="text-gray-400">Creado: {c.created_by}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {onDispatchFromCita && (
                      <button onClick={() => onDispatchFromCita!(c)}
                        className="p-1.5 rounded text-green-600 hover:bg-green-50" title="Despachar esta cita">
                        <TruckIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!c.hora_llegada && (
                      <button onClick={() => handleMarcarLlegada(c)}
                        className="p-1.5 rounded text-blue-600 hover:bg-blue-50" title="Marcar llegada">
                        <Car className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => editCita(c)}
                      className="p-1.5 rounded text-blue-600 hover:bg-blue-50" title="Editar">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(c.id)}
                      className="p-1.5 rounded text-red-600 hover:bg-red-50" title="Eliminar">
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}