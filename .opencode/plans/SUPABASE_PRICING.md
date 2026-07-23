# Plan de Supabase Recomendado - Multi-Bodega

## Plan Pro - $25/mes

| Caracteristica | Free (actual) | Pro ($25/mes) |
|----------------|---------------|---------------|
| Base de datos | 500 MB | 8 GB (auto-escala) |
| Usuarios activos | 50,000 | 100,000 |
| Egress | 5 GB | 250 GB |
| Almacenamiento archivos | 1 GB | 100 GB |
| Backups | No | 7 dias |
| Pausa por inactividad | Si (1 semana) | Nunca |
| Soporte | Comunidad | Email |
| PITR (point-in-time recovery) | No | $100/mes extra (opcional) |

---

## Costo estimado para 3 bodegas (Murano, Estrella, Mosquera)

```
Plan Pro:              $25/mes
Compute incluido:      $0
Base de datos (~2 GB): $0 (dentro de los 8 GB)
Egress (~10 GB):       $0 (dentro de los 250 GB)
Storage (~500 MB):     $0 (dentro de los 100 GB)
-----------------------------------------------
TOTAL ESTIMADO:        $25/mes
```

---

## Costos EXTRA si se superan los limites

| Concepto | Precio | Probabilidad |
|----------|--------|-------------|
| Base de datos > 8 GB | $0.125/GB adicional | Baja (texto/numeros consume poco) |
| Egress > 250 GB | $0.09/GB adicional | Muy baja |
| Storage > 100 GB | $0.0213/GB adicional | Muy baja |
| Compute Small | $15/mes | Se incluye, escala si se necesita |
| PITR (point-in-time recovery) | $100/mes | Solo si se activa (no necesario) |

---

## Por que NO el Free para multi-bodega

- 500 MB no alcanzan para 3 bodegas (se llena en 1-2 meses)
- Se pausa despues de 1 semana sin actividad
- No tiene backups
- Sin soporte

---

## Pasos antes de migrar al Pro

1. Ir a supabase.com → Dashboard → Settings → Billing
2. Cambiar de Free a Pro ($25/mes)
3. En el SQL Editor, ejecutar el schema multi-bodega (ver PLAN_MULTI_BODEGA.md)
4. Migrar datos existentes a bodega_id = 1
5. Crear usuarios de Estrella y Mosquera
6. Actualizar frontend con codigo multi-bodega
7. Deploy a Vercel
