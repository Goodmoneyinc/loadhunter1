/*
  # Logistics Dashboard Schema

  1. New Tables
    - `dispatchers` - Independent freight dispatchers
      - `id` (uuid, primary key)
      - `company_name` (text)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
    - `drivers` - Assigned drivers per dispatcher
      - `id` (uuid, primary key)
      - `dispatcher_id` (uuid, references dispatchers)
      - `name` (text)
      - `phone` (text)
      - `created_at` (timestamptz)
    - `loads` - Active freight loads
      - `id` (uuid, primary key)
      - `dispatcher_id` (uuid, references dispatchers)
      - `driver_id` (uuid, references drivers)
      - `status` (text, default 'scheduled')
      - `facility_address` (text)
      - `scheduled_time` (timestamptz)
      - `created_at` (timestamptz)
    - `detention_events` - Detention tracking at facilities
      - `id` (uuid, primary key)
      - `load_id` (uuid, references loads)
      - `arrival_time` (timestamptz)
      - `departure_time` (timestamptz)
      - `gps_lat` (numeric)
      - `gps_long` (numeric)
      - `bol_url` (text)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on all tables
    - Dispatchers can only access their own data
    - Drivers, loads, detention_events scoped to dispatcher ownership
*/

CREATE TABLE IF NOT EXISTS dispatchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE dispatchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispatchers can read own record"
  ON dispatchers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Dispatchers can insert own record"
  ON dispatchers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Dispatchers can update own record"
  ON dispatchers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Dispatchers can delete own record"
  ON dispatchers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatcher_id UUID REFERENCES dispatchers(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispatchers can read own drivers"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dispatchers
      WHERE dispatchers.id = drivers.dispatcher_id
      AND dispatchers.user_id = auth.uid()
    )
  );

CREATE POLICY "Dispatchers can insert own drivers"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dispatchers
      WHERE dispatchers.id = drivers.dispatcher_id
      AND dispatchers.user_id = auth.uid()
    )
  );

CREATE POLICY "Dispatchers can update own drivers"
  ON drivers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dispatchers
      WHERE dispatchers.id = drivers.dispatcher_id
      AND dispatchers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dispatchers
      WHERE dispatchers.id = drivers.dispatcher_id
      AND dispatchers.user_id = auth.uid()
    )
  );

CREATE POLICY "Dispatchers can delete own drivers"
  ON drivers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dispatchers
      WHERE dispatchers.id = drivers.dispatcher_id
      AND dispatchers.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS loads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatcher_id UUID REFERENCES dispatchers(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  facility_address TEXT NOT NULL DEFAULT '',
  scheduled_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispatchers can read own loads"
  ON loads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dispatchers
      WHERE dispatchers.id = loads.dispatcher_id
      AND dispatchers.user_id = auth.uid()
    )
  );

CREATE POLICY "Dispatchers can insert own loads"
  ON loads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dispatchers
      WHERE dispatchers.id = loads.dispatcher_id
      AND dispatchers.user_id = auth.uid()
    )
  );

CREATE POLICY "Dispatchers can update own loads"
  ON loads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dispatchers
      WHERE dispatchers.id = loads.dispatcher_id
      AND dispatchers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dispatchers
      WHERE dispatchers.id = loads.dispatcher_id
      AND dispatchers.user_id = auth.uid()
    )
  );

CREATE POLICY "Dispatchers can delete own loads"
  ON loads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dispatchers
      WHERE dispatchers.id = loads.dispatcher_id
      AND dispatchers.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS detention_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  load_id UUID REFERENCES loads(id) ON DELETE CASCADE,
  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  gps_lat NUMERIC,
  gps_long NUMERIC,
  bol_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE detention_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispatchers can read own detention events"
  ON detention_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loads
      JOIN dispatchers ON dispatchers.id = loads.dispatcher_id
      WHERE loads.id = detention_events.load_id
      AND dispatchers.user_id = auth.uid()
    )
  );

CREATE POLICY "Dispatchers can insert own detention events"
  ON detention_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loads
      JOIN dispatchers ON dispatchers.id = loads.dispatcher_id
      WHERE loads.id = detention_events.load_id
      AND dispatchers.user_id = auth.uid()
    )
  );

CREATE POLICY "Dispatchers can update own detention events"
  ON detention_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loads
      JOIN dispatchers ON dispatchers.id = loads.dispatcher_id
      WHERE loads.id = detention_events.load_id
      AND dispatchers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loads
      JOIN dispatchers ON dispatchers.id = loads.dispatcher_id
      WHERE loads.id = detention_events.load_id
      AND dispatchers.user_id = auth.uid()
    )
  );

CREATE POLICY "Dispatchers can delete own detention events"
  ON detention_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loads
      JOIN dispatchers ON dispatchers.id = loads.dispatcher_id
      WHERE loads.id = detention_events.load_id
      AND dispatchers.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_drivers_dispatcher ON drivers(dispatcher_id);
CREATE INDEX IF NOT EXISTS idx_loads_dispatcher ON loads(dispatcher_id);
CREATE INDEX IF NOT EXISTS idx_loads_driver ON loads(driver_id);
CREATE INDEX IF NOT EXISTS idx_loads_status ON loads(status);
CREATE INDEX IF NOT EXISTS idx_detention_load ON detention_events(load_id);
