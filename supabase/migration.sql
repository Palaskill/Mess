-- MEss Database Schema
-- Run this in the Supabase SQL Editor

-- 1. Menu Items (managed by admin)
CREATE TABLE menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('drinks', 'food', 'other')),
  default_split TEXT NOT NULL DEFAULT 'individual' CHECK (default_split IN ('individual', 'shared')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Sessions (bar visits)
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Participants (friends at the table)
CREATE TABLE participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Orders (items ordered during a session)
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL,
  split_type TEXT NOT NULL DEFAULT 'individual' CHECK (split_type IN ('individual', 'shared')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Assignments (who gets what)
CREATE TABLE assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  UNIQUE(order_id, participant_id)
);

-- Indexes for performance
CREATE INDEX idx_participants_session ON participants(session_id);
CREATE INDEX idx_orders_session ON orders(session_id);
CREATE INDEX idx_assignments_order ON assignments(order_id);
CREATE INDEX idx_assignments_participant ON assignments(participant_id);

-- Disable RLS for now (single-user app, no auth required for basic usage)
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Allow all operations (public access - this is a simple group app)
CREATE POLICY "Allow all on menu_items" ON menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on participants" ON participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on assignments" ON assignments FOR ALL USING (true) WITH CHECK (true);

-- Seed some menu items
INSERT INTO menu_items (name, price, category, default_split) VALUES
  ('Beer', 4.00, 'drinks', 'individual'),
  ('Cola', 2.50, 'drinks', 'individual'),
  ('Juice', 3.00, 'drinks', 'individual'),
  ('Wine', 6.00, 'drinks', 'individual'),
  ('Coffee', 2.00, 'drinks', 'individual'),
  ('Water', 1.50, 'drinks', 'individual'),
  ('Pizza', 12.00, 'food', 'shared'),
  ('Fries', 5.00, 'food', 'shared'),
  ('Nachos', 8.00, 'food', 'shared'),
  ('Burger', 10.00, 'food', 'individual'),
  ('Wings', 9.00, 'food', 'shared'),
  ('Fruit Sec', 4.50, 'drinks', 'individual');
