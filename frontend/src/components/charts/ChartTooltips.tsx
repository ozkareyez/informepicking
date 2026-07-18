import { formatNumber } from '../../utils';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | string;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

export function DespachoTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const kgData = payload.find(p => p.dataKey === 'total_kg');
  const vehData = payload.find(p => p.dataKey === 'total_vehiculos');

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="space-y-1.5">
        {kgData && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              Kg Despachados
            </span>
            <span className="font-bold text-gray-900 text-right">{formatNumber(Number(kgData.value))} kg</span>
          </div>
        )}
        {vehData && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              Vehículos Despachados
            </span>
            <span className="font-bold text-gray-900 text-right">{formatNumber(Number(vehData.value))} unid.</span>
          </div>
        )}
        {kgData && vehData && (
          <div className="border-t border-gray-100 pt-1.5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Promedio por vehículo</span>
              <span className="font-medium text-gray-700">
                {formatNumber(Number(kgData.value) / Number(vehData.value))} kg/veh
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function EficienciaDespachoTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const kgData = payload.find(p => p.dataKey === 'total_kg');
  const effData = payload.find(p => p.dataKey === 'avg_efficiency');

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="space-y-1.5">
        {kgData && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              Kg Despachados
            </span>
            <span className="font-bold text-gray-900 text-right">{formatNumber(Number(kgData.value))} kg</span>
          </div>
        )}
        {effData && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-purple-600" />
              Eficiencia de Cargue
            </span>
            <span className="font-bold text-gray-900 text-right">{formatNumber(Number(effData.value))}%</span>
          </div>
        )}
        {effData && (
          <div className="border-t border-gray-100 pt-1.5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Estándar: 100%</span>
              <span className={`font-medium ${Number(effData.value) >= 100 ? 'text-emerald-600' : Number(effData.value) >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                {Number(effData.value) >= 100 ? '✓ Cumple' : Number(effData.value) >= 80 ? '⚠ Alerta' : '✗ Crítico'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function EficienciaDescargueTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const kgData = payload.find(p => p.dataKey === 'total_kg');
  const effData = payload.find(p => p.dataKey === 'avg_efficiency');

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="space-y-1.5">
        {kgData && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              Kg Descargados
            </span>
            <span className="font-bold text-gray-900 text-right">{formatNumber(Number(kgData.value))} kg</span>
          </div>
        )}
        {effData && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-purple-600" />
              Eficiencia de Descargue
            </span>
            <span className="font-bold text-gray-900 text-right">{formatNumber(Number(effData.value))}%</span>
          </div>
        )}
        {effData && (
          <div className="border-t border-gray-100 pt-1.5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Estándar: 100%</span>
              <span className={`font-medium ${Number(effData.value) >= 100 ? 'text-emerald-600' : Number(effData.value) >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                {Number(effData.value) >= 100 ? '✓ Cumple' : Number(effData.value) >= 80 ? '⚠ Alerta' : '✗ Crítico'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CitasTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const totalData = payload.find(p => p.dataKey === 'total');
  const cumplieronData = payload.find(p => p.dataKey === 'cumplieron');

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="space-y-1.5">
        {totalData && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              Total Citas Programadas
            </span>
            <span className="font-bold text-gray-900 text-right">{formatNumber(Number(totalData.value))}</span>
          </div>
        )}
        {cumplieronData && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              Cumplieron a Tiempo
            </span>
            <span className="font-bold text-emerald-700 text-right">{formatNumber(Number(cumplieronData.value))}</span>
          </div>
        )}
        {totalData && cumplieronData && (
          <div className="border-t border-gray-100 pt-1.5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>% Cumplimiento</span>
              <span className={`font-bold ${Number(cumplieronData.value) / Number(totalData.value) >= 0.9 ? 'text-emerald-600' : Number(cumplieronData.value) / Number(totalData.value) >= 0.7 ? 'text-amber-600' : 'text-red-600'}`}>
                {(Number(cumplieronData.value) / Number(totalData.value) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CumplimientoCitasTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const pctData = payload.find(p => p.dataKey === 'pct_cumplimiento');

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="space-y-1.5">
        {pctData && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-purple-600" />
              % Cumplimiento Citas
            </span>
            <span className="font-bold text-purple-700 text-right">{formatNumber(Number(pctData.value))}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function DescargueTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const kgData = payload.find(p => p.dataKey === 'total_kg');
  const ptmData = payload.find(p => p.dataKey === 'total_ptm');
  const effData = payload.find(p => p.dataKey === 'avg_efficiency');

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="space-y-1.5">
        {kgData && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              Kg Descargados
            </span>
            <span className="font-bold text-gray-900 text-right">{formatNumber(Number(kgData.value))} kg</span>
          </div>
        )}
        {ptmData && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              PTMs Procesados
            </span>
            <span className="font-bold text-gray-900 text-right">{formatNumber(Number(ptmData.value))} PTM</span>
          </div>
        )}
        {effData && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-purple-600" />
              Eficiencia Descargue
            </span>
            <span className="font-bold text-gray-900 text-right">{formatNumber(Number(effData.value))}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProductionTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const kgData = payload.find(p => p.dataKey === 'total_kg');
  const ordersData = payload.find(p => p.dataKey === 'total_orders');
  const effData = payload.find(p => p.dataKey === 'avg_efficiency');

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="space-y-1.5">
        {kgData && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              Kg Producidos
            </span>
            <span className="font-bold text-gray-900 text-right">{formatNumber(Number(kgData.value))} kg</span>
          </div>
        )}
        {ordersData && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-purple-600" />
              Pedidos Completados
            </span>
            <span className="font-bold text-gray-900 text-right">{formatNumber(Number(ordersData.value))}</span>
          </div>
        )}
        {effData && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-purple-600" />
              Eficiencia Promedio
            </span>
            <span className="font-bold text-gray-900 text-right">{formatNumber(Number(effData.value))}%</span>
          </div>
        )}
      </div>
    </div>
  );
}