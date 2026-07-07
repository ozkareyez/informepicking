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
