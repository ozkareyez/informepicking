# Plan: Multi-Bodega - Aplicación de Productividad

## Arquitectura Objetivo

```
┌─────────────────────────────────────────────────┐
│                    FRONTEND                       │
│  Login → usuario ya viene asignado a su bodega   │
│  localStorage: { username, role, bodega_id }     │
│                                                   │
│  role: 'user' | 'admin' | 'gerente'              │
├─────────────────────────────────────────────────┤
│                    API LAYER                      │
│  Todas las queries llevan:                        │
│    .eq('bodega_id', currentUser.bodega_id)        │
│  Excepto gerente en dashboards globales           │
├─────────────────────────────────────────────────┤
│                   SUPABASE DB                     │
│  ┌──────────┐                                    │
│  │ bodegas  │ ← tabla nueva                      │
│  └────┬─────┘                                    │
│       │ bodega_id FK en TODAS las tablas          │
│  orders, despachos, citas_cargue, unloadings,     │
│  operators, racks, usuarios                       │
└─────────────────────────────────────────────────┘
```

---

## Bodegas Iniciales

| ID | Nombre | Ubicacion |
|----|--------|-----------|
| 1 | Murano - Yumbo | Yumbo |
| 2 | Estrella - Medellin | Medellin |
| 3 | Mosquera - Bogota | Bogota |

---

## Roles de Usuario

| Rol | Permisos |
|-----|----------|
| user | Crear/editar pedidos, despachos, descargues, citas de SU bodega |
| admin | =user + editar pesos, devoluciones, eliminar registros de SU bodega |
| gerente | Ver TODO: dashboard consolidado de TODAS las bodegas + informes globales |

---

## Fase 1: Base de datos

### Tabla nueva: bodegas
```sql
CREATE TABLE bodegas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  direccion TEXT DEFAULT '',
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO bodegas (nombre, direccion) VALUES
  ('Murano - Yumbo', 'Yumbo'),
  ('Estrella - Medellin', 'Medellin'),
  ('Mosquera - Bogota', 'Bogota');
```

### Columnas bodega_id en 7 tablas
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bodega_id BIGINT REFERENCES bodegas(id);
ALTER TABLE despachos ADD COLUMN IF NOT EXISTS bodega_id BIGINT REFERENCES bodegas(id);
ALTER TABLE citas_cargue ADD COLUMN IF NOT EXISTS bodega_id BIGINT REFERENCES bodegas(id);
ALTER TABLE unloadings ADD COLUMN IF NOT EXISTS bodega_id BIGINT REFERENCES bodegas(id);
ALTER TABLE operators ADD COLUMN IF NOT EXISTS bodega_id BIGINT REFERENCES bodegas(id);
ALTER TABLE racks ADD COLUMN IF NOT EXISTS bodega_id BIGINT REFERENCES bodegas(id);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bodega_id BIGINT REFERENCES bodegas(id);
```

### Rol en usuarios
```sql
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
  CHECK (role IN ('user', 'admin', 'gerente'));
```

### Migrar usuarios existentes
```sql
UPDATE usuarios SET role = 'admin', bodega_id = 1 WHERE username IN ('oscar', 'dumar');
UPDATE usuarios SET role = 'user', bodega_id = 1 WHERE username IN ('william', 'cesar');
```

### Datos existentes: asignar a Murano (bodega_id = 1)
```sql
UPDATE orders SET bodega_id = 1 WHERE bodega_id IS NULL;
UPDATE despachos SET bodega_id = 1 WHERE bodega_id IS NULL;
UPDATE citas_cargue SET bodega_id = 1 WHERE bodega_id IS NULL;
UPDATE unloadings SET bodega_id = 1 WHERE bodega_id IS NULL;
UPDATE operators SET bodega_id = 1 WHERE bodega_id IS NULL;
UPDATE racks SET bodega_id = 1 WHERE bodega_id IS NULL;
```

### RLS real (ejemplo para orders)
```sql
DROP POLICY IF EXISTS "Todos pueden leer orders" ON orders;
DROP POLICY IF EXISTS "Todos pueden insertar orders" ON orders;
DROP POLICY IF EXISTS "Todos pueden actualizar orders" ON orders;
DROP POLICY IF EXISTS "Todos pueden eliminar orders" ON orders;

CREATE POLICY "Usuarios ven su bodega" ON orders
  FOR SELECT USING (
    bodega_id = current_setting('app.bodega_id')::BIGINT
    OR current_setting('app.user_role') = 'gerente'
  );
CREATE POLICY "Usuarios insertan en su bodega" ON orders
  FOR INSERT WITH CHECK (
    bodega_id = current_setting('app.bodega_id')::BIGINT
  );
CREATE POLICY "Usuarios actualizan su bodega" ON orders
  FOR UPDATE USING (
    bodega_id = current_setting('app.bodega_id')::BIGINT
  );
CREATE POLICY "Usuarios eliminan de su bodega" ON orders
  FOR DELETE USING (
    bodega_id = current_setting('app.bodega_id')::BIGINT
  );
```
-- Repetir el mismo patron para: despachos, citas_cargue, unloadings, operators, racks

---

## Fase 2: Autenticacion

### Tipo User actualizado (types.ts)
```typescript
interface User {
  id: number;
  username: string;
  role: 'user' | 'admin' | 'gerente';
  bodega_id: number;
  bodega_nombre: string;
  created_at: string;
}
```

### Login modificado (supabaseStore.ts)
```typescript
export async function login(username: string, password: string): Promise<User | null> {
  const { data, error } = await getSupabase()
    .from('usuarios')
    .select('id, username, role, bodega_id, created_at, bodegas(nombre)')
    .eq('username', username)
    .eq('password', password)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    username: data.username,
    role: data.role || 'user',
    bodega_id: data.bodega_id,
    bodega_nombre: data.bodegas?.nombre || '',
    created_at: data.created_at,
  };
}
```

### auth.tsx - guardar contexto completo
```typescript
interface AuthUser {
  username: string;
  role: 'user' | 'admin' | 'gerente';
  bodega_id: number;
  bodega_nombre: string;
}
// localStorage guarda objeto completo
localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
```

### Admin check basado en role
```typescript
// ANTES:
.in('username', ['oscar', 'dumar'])
// DESPUES:
const user = getCurrentUser();
if (user.role !== 'admin' && user.role !== 'gerente') {
  throw new Error('No tiene permisos de administrador');
}
```

---

## Fase 3: Data layer (~20 funciones)

### Helper centralizado
```typescript
function getCurrentBodegaId(): number | null {
  const user = getCurrentUser();
  if (user.role === 'gerente') return null;
  return user.bodega_id;
}

function bodegaFilter(query: any) {
  const bodegaId = getCurrentBodegaId();
  if (bodegaId === null) return query;
  return query.eq('bodega_id', bodegaId);
}
```

### Patron
```typescript
// ANTES:
const { data } = await getSupabase().from('orders').select('*');
// DESPUES:
const { data } = await bodegaFilter(getSupabase().from('orders').select('*'));
```

### Funciones a modificar
- getOrders, getPendingOrders, getUnassignedOrders, getClients
- getDashboard (3 queries), getFourWeekTrend (3 queries)
- getTypeBasedWeeklyKPIs, getStatistics, getOrdersForDispatch
- getAllDespachos, getUnloadings, getCitasCargue, getOperators, getRacks
- createOrder, createOrders, createDespacho, createUnloading, createCitaCargue
- createOperator, createRack

---

## Fase 4: Informes Globales (solo gerente)

### DashboardGlobal.tsx (nuevo componente)
- KPIs consolidados de las 3 bodegas
- Tabla comparativa: kg, eficiencia, pedidos, novedades por bodega
- Grafico de barras agrupado por bodega

### Sidebar
- gerente: menu extra "Informe Global"
- admin/user: solo su bodega

---

## Fase 5: Seguridad

| Antes | Despues |
|-------|---------|
| Passwords texto plano | Hash con bcrypt o Supabase Auth |
| Admin hardcoded ['oscar', 'dumar'] | Role en tabla usuarios |
| RLS USING (true) | RLS con filtro bodega_id |
| localStorage solo username | { username, role, bodega_id } |

---

## Orden de Ejecucion

```
1. supabase-schema.sql   → Crear tablas, migrar datos
2. types.ts              → Tipos nuevos
3. auth.tsx              → Login con role + bodega_id
4. LoginScreen.tsx       → Mostrar bodega
5. supabaseStore.ts      → Helper + filtro en ~20 funciones
6. api.ts                → Adaptar facade
7. Sidebar.tsx           → UI bodega actual
8. DashboardGlobal.tsx   → Informe consolidado (nuevo)
9. Test completo         → Verificar aislamiento
```
