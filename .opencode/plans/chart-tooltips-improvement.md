# Plan: Mejora de Tooltips en Gráficos Comparativos 4 Semanas

## Problema Identificado
En el Dashboard de Despacho (`DashboardDespacho.tsx`), los gráficos de "Comparativa 4 Semanas" muestran tooltips genéricos sin contexto claro:
- Valores numéricos sin etiquetas descriptivas
- No se distingue qué serie corresponde a qué métrica
- Falta contexto para informes gerenciales

## Fuentes de Datos (ya implementadas en `getFourWeekTrend()`)
| Gráfico | Tabla | Campo Fecha | Agrupación |
|---------|-------|-------------|------------|
| Producción | `orders` | `date` | Semana ISO del pedido |
| Despachos | `despachos` | `created_at` | Semana ISO del registro |
| Descargues | `unloadings` | `date` | Semana ISO del descargue |
| Citas | `citas_cargue` | `created_at` | Semana ISO de creación |

## Solución: Tooltips Personalizados Informativos

### 1. Crear `components/ChartTooltips.tsx`
Componentes reutilizables con:
- Etiquetas claras por serie (Kg, Vehículos, Eficiencia, PTMs, Citas)
- Unidades visibles (kg, unid., %, citas)
- Cálculos derivados (kg/veh, % vs estándar)
- Indicadores visuales de estado (✓ Cumple, ⚠ Alerta, ✗ Crítico)
- Formato profesional para reportes

### 2. Actualizar `DashboardDespacho.tsx`
Reemplazar tooltips genéricos por personalizados:

| Gráfico Actual | Tooltip Nuevo |
|----------------|---------------|
| Kg Despachados (barras) | Kg + Vehículos + Promedio kg/veh |
| Eficiencia Despacho (líneas) | Kg + Eficiencia + Estado vs 100% |
| Eficiencia Descargue (líneas) | Kg + Eficiencia + Estado vs 100% |
| Cumplimiento Citas (barras) | Total + Cumplieron + % |
| % Cumplimiento (línea) | % + Estado visual |

### 3. Tooltip Features
```tsx
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{name, value, color, dataKey}>;
  label?: string;
}
```

Cada tooltip incluye:
- Header con semana (`label`)
- Filas por serie: icono color + label + valor formateado + unidad
- Cálculos derivados (kg/veh, %)
- Badges de estado (✓ Cumple ≥100%, ⚠ Alerta 80-99%, ✗ Crítico <80%)
- Estilo profesional: fondo blanco, bordes suaves, sombra, tipografía jerárquica

## Implementación

### Archivos a Modificar
1. `src/components/ChartTooltips.tsx` (nuevo)
2. `src/components/DashboardDespacho.tsx` (actualizar imports y tooltips)
3. Opcional: `src/components/DashboardProduccion.tsx` (mismo patrón)

### Testing
- Verificar build: `npm run build`
- Probar hover en cada gráfico
- Verificar datos reales vs tooltips
- Confirmar legibilidad en móvil/desktop

## Preguntas de Aclaración

1. **¿Aplicar mismo patrón a `DashboardProduccion.tsx`?** (gráficos de producción, eficiencia por operario, etc.)
2. **¿Formato de semana en tooltip?** Actual: `Sem 29` → ¿`Sem 29 (15-21 Jul)`?
3. **Comparativa vs semana anterior?** ¿Mostrar Δ% vs semana previa en tooltip?
4. **Colores de estado:** ¿Verde/Ámbar/Rojo actual OK o ajustar umbrales?

---

**Estado:** Plan listo para revisión. Awaiting approval para implementación.