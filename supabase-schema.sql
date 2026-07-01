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
