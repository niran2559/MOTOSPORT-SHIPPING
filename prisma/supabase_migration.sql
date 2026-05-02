-- ===========================================
-- MOTOSPORT SHIPPING - Supabase Migration
-- הרץ את כל הקובץ הזה ב-Supabase SQL Editor
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- BRANCHES (סניפים)
-- =====================
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- USERS (משתמשים)
-- =====================
CREATE TYPE user_role AS ENUM ('admin', 'import_manager', 'agent');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'agent',
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- SHIPMENTS (משלוחים)
-- =====================
CREATE TYPE shipment_type AS ENUM ('sea', 'air');
CREATE TYPE shipment_status AS ENUM (
  'at_factory',
  'to_foreign_port',
  'at_foreign_port',
  'at_sea',
  'at_local_port',
  'delivered'
);

CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id VARCHAR(100) NOT NULL UNIQUE,
  type shipment_type NOT NULL DEFAULT 'sea',
  description TEXT,
  status shipment_status NOT NULL DEFAULT 'at_factory',
  carrier_name VARCHAR(255),
  vessel_id VARCHAR(100),
  departure_date DATE,
  origin_port VARCHAR(255),
  destination_port VARCHAR(255),
  eta_original TIMESTAMPTZ,
  eta_current TIMESTAMPTZ,
  has_exception BOOLEAN DEFAULT FALSE,
  raw_api_data JSONB,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ORDERS (הזמנות)
-- =====================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(100) NOT NULL UNIQUE,
  agency_name VARCHAR(255),
  category VARCHAR(255),
  order_date DATE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ORDER ITEMS (פריטים)
-- =====================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL,
  item_name VARCHAR(500) NOT NULL,
  category VARCHAR(255),
  brand VARCHAR(255),
  quantity INTEGER NOT NULL DEFAULT 1
);

-- =====================
-- SHIPMENT <-> ORDERS (many-to-many)
-- פיצול הזמנה בין משלוחים שונים
-- =====================
CREATE TABLE shipment_orders (
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  quantity_in_shipment INTEGER,
  PRIMARY KEY (shipment_id, order_id)
);

-- =====================
-- SHIPMENT <-> BRANCHES (מידור)
-- =====================
CREATE TABLE shipment_branches (
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (shipment_id, branch_id)
);

-- =====================
-- INDEXES (ביצועים)
-- =====================
CREATE INDEX idx_shipments_tracking_id ON shipments(tracking_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_has_exception ON shipments(has_exception);
CREATE INDEX idx_shipments_eta_current ON shipments(eta_current);
CREATE INDEX idx_shipments_type ON shipments(type);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_shipment_branches_branch ON shipment_branches(branch_id);

-- =====================
-- AUTO UPDATE updated_at
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- SEED DATA לבדיקה
-- =====================

-- סניפים ראשוניים
INSERT INTO branches (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'סניף תל אביב'),
  ('22222222-2222-2222-2222-222222222222', 'סניף ירושלים'),
  ('33333333-3333-3333-3333-333333333333', 'סניף חיפה');

-- משתמש Admin ראשוני (סיסמה: Admin1234!)
-- password_hash נוצר ידנית - תוחלף ע"י האפליקציה
INSERT INTO users (name, email, password_hash, role) VALUES
  ('מנהל מערכת', 'admin@motosport.co.il', '$2b$10$placeholder_change_on_first_login', 'admin');

SELECT 'Migration completed successfully!' AS status;
