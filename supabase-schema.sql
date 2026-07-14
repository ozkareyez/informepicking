-- 📦 Esquema para la app de Pedidos
-- Ejecutar esto en el SQL Editor de Supabase (SQL Editor > New Query)

-- Tabla principal de pedidos
CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date DATE NOT NULL,
  cliente TEXT NOT NULL,
  sku TEXT NOT NULL,
  kg NUMERIC NOT NULL,
  operator TEXT DEFAULT '',
  start_time TEXT DEFAULT '',
  end_time TEXT,
  type TEXT NOT NULL CHECK (type IN ('Masivo', 'Venta Directa')),
  status TEXT NOT NULL DEFAULT 'sin_operario' CHECK (status IN ('sin_operario', 'pending', 'completed', 'despachado')),
  time_spent TEXT,
  kg_per_hour NUMERIC,
  efficiency NUMERIC,
  plc TEXT,
  placa TEXT,
  cargue_start TEXT,
  cargue_end TEXT,
  cargue_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(date);
CREATE INDEX idx_orders_cliente ON orders(cliente);
CREATE INDEX idx_orders_operator ON orders(operator);

-- Seguridad: RLS (Row Level Security)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Política: cualquiera puede leer (autenticado o anónimo si habilitas anon)
CREATE POLICY "Todos pueden leer orders"
  ON orders FOR SELECT
  USING (true);

-- Política: cualquiera puede insertar
CREATE POLICY "Todos pueden insertar orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Política: cualquiera puede actualizar
CREATE POLICY "Todos pueden actualizar orders"
  ON orders FOR UPDATE
  USING (true);

-- Política: cualquiera puede eliminar
CREATE POLICY "Todos pueden eliminar orders"
  ON orders FOR DELETE
  USING (true);

-- ⬇️ Si ya creaste la tabla antes y necesitas migrar:
-- ALTER TABLE orders ADD COLUMN plc TEXT;
-- ALTER TABLE orders ADD COLUMN placa TEXT;
-- ALTER TABLE orders ADD COLUMN cargue_start TEXT;
-- ALTER TABLE orders ADD COLUMN cargue_end TEXT;
-- ALTER TABLE orders ADD COLUMN cargue_time TEXT;
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
-- ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('sin_operario', 'pending', 'completed', 'despachado'));

-- ============================================================
-- 📦 Despachos (cada vehículo que se carga de un pedido)
-- ============================================================
CREATE TABLE despachos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ruta TEXT NOT NULL DEFAULT '',
  placa TEXT NOT NULL,
  plc TEXT NOT NULL,
  kg NUMERIC NOT NULL,
  cargue_start TEXT NOT NULL,
  cargue_end TEXT NOT NULL,
  cargue_time TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_despachos_order ON despachos(order_id);

ALTER TABLE despachos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden leer despachos" ON despachos FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar despachos" ON despachos FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar despachos" ON despachos FOR UPDATE USING (true);
CREATE POLICY "Todos pueden eliminar despachos" ON despachos FOR DELETE USING (true);

-- ============================================================
-- 🚛 Citas de cargue (programación de vehículos en bodega)
-- ============================================================
CREATE TABLE citas_cargue (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ruta TEXT NOT NULL DEFAULT '',
  placa TEXT NOT NULL,
  kg NUMERIC NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'Masivo' CHECK (tipo IN ('Masivo', 'Venta Directa')),
  hora_cita TIME NOT NULL,
  hora_llegada TIME,
  retraso_minutos INT GENERATED ALWAYS AS (
    CASE 
      WHEN hora_llegada IS NOT NULL AND hora_cita IS NOT NULL
      THEN EXTRACT(EPOCH FROM (hora_llegada - hora_cita)) / 60
      ELSE NULL
    END
  ) STORED,
  cumplio_cita BOOLEAN,
  observaciones TEXT,
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_citas_cargue_fecha ON citas_cargue(created_at);

ALTER TABLE citas_cargue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden leer citas_cargue" ON citas_cargue FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar citas_cargue" ON citas_cargue FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar citas_cargue" ON citas_cargue FOR UPDATE USING (true);
CREATE POLICY "Todos pueden eliminar citas_cargue" ON citas_cargue FOR DELETE USING (true);

-- ============================================================
-- 🔗 Agregar despachado_kg a pedidos
-- ============================================================
ALTER TABLE orders ADD COLUMN despachado_kg NUMERIC DEFAULT 0;

-- ============================================================
-- 📦 Descargue de contenedores (PTM, peso, tiempos)
-- ============================================================
CREATE TABLE unloadings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date DATE NOT NULL,
  ptm TEXT NOT NULL,
  kg NUMERIC NOT NULL,
  operators JSONB DEFAULT '[]'::jsonb,
  start_time TEXT NOT NULL DEFAULT '',
  end_time TEXT NOT NULL DEFAULT '',
  time_spent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_unloadings_date ON unloadings(date);

ALTER TABLE unloadings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden leer unloadings" ON unloadings FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar unloadings" ON unloadings FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar unloadings" ON unloadings FOR UPDATE USING (true);
CREATE POLICY "Todos pueden eliminar unloadings" ON unloadings FOR DELETE USING (true);

-- ============================================================
-- 👤 Operadores (lista controlada para evitar errores)
-- ============================================================
CREATE TABLE operators (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lista inicial de operarios
INSERT INTO operators (name) VALUES
  ('sebastian'),
  ('edwin'),
  ('gongora'),
  ('emerson'),
  ('neider'),
  ('ovidio'),
  ('jean marco'),
  ('urbano'),
  ('luis');

ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden leer operators" ON operators FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar operators" ON operators FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden eliminar operators" ON operators FOR DELETE USING (true);

-- ============================================================
-- 👤 Usuarios del sistema (para tracking de quién hace qué)
-- ============================================================
CREATE TABLE usuarios (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden leer usuarios" ON usuarios FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar usuarios" ON usuarios FOR INSERT WITH CHECK (true);

-- Usuarios iniciales
INSERT INTO usuarios (username, password) VALUES
  ('william', '2026'),
  ('dumar', '1996'),
  ('oscar', '0220'),
  ('cesar', '0000');

-- ============================================================
-- 🔗 Agregar created_by a pedidos, despachos y descargues
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT '';
ALTER TABLE despachos ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT '';
ALTER TABLE unloadings ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT '';
ALTER TABLE unloadings ADD COLUMN IF NOT EXISTS novedad TEXT DEFAULT '';
ALTER TABLE unloadings ADD COLUMN IF NOT EXISTS novedad_resuelta BOOLEAN DEFAULT false;
ALTER TABLE despachos ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;

-- ============================================================
-- 📅 Citas de cargue (programación de vehículos para cargar)
-- ============================================================
CREATE TABLE IF NOT EXISTS citas_cargue (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ruta TEXT NOT NULL DEFAULT '',
  placa TEXT NOT NULL,
  kg NUMERIC NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'Masivo' CHECK (tipo IN ('Masivo', 'Venta Directa')),
  hora_cita TIME NOT NULL,
  hora_llegada TIME,
  retraso_minutos INT,
  cumplio_cita BOOLEAN,
  observaciones TEXT,
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citas_cargue_fecha ON citas_cargue(created_at);

ALTER TABLE citas_cargue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden leer citas_cargue" ON citas_cargue FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar citas_cargue" ON citas_cargue FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar citas_cargue" ON citas_cargue FOR UPDATE USING (true);
CREATE POLICY "Todos pueden eliminar citas_cargue" ON citas_cargue FOR DELETE USING (true);

-- ============================================================
-- 🏭 Bodega / Racks - Ocupación y disponibilidad
-- ============================================================
CREATE TABLE IF NOT EXISTS racks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,        -- R1, R2, etc.
  posiciones INT NOT NULL DEFAULT 0,  -- Total posiciones
  ocupacion INT NOT NULL DEFAULT 0,   -- Posiciones ocupadas
  disponible INT GENERATED ALWAYS AS (posiciones - ocupacion) STORED,
  porcentaje_ocupacion NUMERIC GENERATED ALWAYS AS (
    CASE WHEN posiciones > 0 THEN ROUND((ocupacion::NUMERIC / posiciones) * 100, 2) ELSE 0 END
  ) STORED,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_racks_codigo ON racks(codigo);

ALTER TABLE racks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden leer racks" ON racks FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar racks" ON racks FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar racks" ON racks FOR UPDATE USING (true);
CREATE POLICY "Todos pueden eliminar racks" ON racks FOR DELETE USING (true);

-- Datos iniciales de racks
INSERT INTO racks (codigo, posiciones, ocupacion) VALUES
  ('R1', 100, 100),
  ('R2', 80, 80),
  ('R3', 80, 80),
  ('R4', 90, 80),
  ('R5', 90, 90),
  ('R6', 90, 90),
  ('R7', 90, 90),
  ('R8', 100, 100)
ON CONFLICT (codigo) DO NOTHING;
