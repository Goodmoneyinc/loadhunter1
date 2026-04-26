/*
  # load_events — timeline events per load (dispatcher RLS + anon RPC)

  - Append-only style events with optional GPS and notes
  - Dispatchers access rows via loads → dispatchers.user_id = auth.uid()
  - Anonymous clients call insert_load_event_via_tracking() only (no direct table grants needed beyond defaults)
*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE load_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id uuid NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  gps_lat numeric(10, 6) NULL CHECK (gps_lat BETWEEN -90 AND 90),
  gps_long numeric(10, 6) NULL CHECK (gps_long BETWEEN -180 AND 180),
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT valid_event_type CHECK (
    event_type IN (
      'arrived',
      'checked_in',
      'moved',
      'loading_started',
      'departed'
    )
  )
);

CREATE INDEX idx_load_events_load_id ON load_events(load_id);
CREATE INDEX idx_load_events_load_event ON load_events(load_id, event_type);
CREATE INDEX idx_load_events_timestamp ON load_events(load_id, timestamp DESC);

ALTER TABLE load_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY dispatcher_select_load_events ON load_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM loads
      JOIN dispatchers ON dispatchers.id = loads.dispatcher_id
      WHERE loads.id = load_events.load_id
        AND dispatchers.user_id = auth.uid()
    )
  );

CREATE POLICY dispatcher_insert_load_events ON load_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM loads
      JOIN dispatchers ON dispatchers.id = loads.dispatcher_id
      WHERE loads.id = load_events.load_id
        AND dispatchers.user_id = auth.uid()
    )
  );

CREATE POLICY dispatcher_update_load_events ON load_events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM loads
      JOIN dispatchers ON dispatchers.id = loads.dispatcher_id
      WHERE loads.id = load_events.load_id
        AND dispatchers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM loads
      JOIN dispatchers ON dispatchers.id = loads.dispatcher_id
      WHERE loads.id = load_events.load_id
        AND dispatchers.user_id = auth.uid()
    )
  );

CREATE POLICY dispatcher_delete_load_events ON load_events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM loads
      JOIN dispatchers ON dispatchers.id = loads.dispatcher_id
      WHERE loads.id = load_events.load_id
        AND dispatchers.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION insert_load_event_via_tracking(
  p_tracking_id text,
  p_event_type text,
  p_timestamp timestamptz DEFAULT now(),
  p_gps_lat numeric DEFAULT NULL,
  p_gps_long numeric DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_load_id uuid;
  v_event_id uuid;
BEGIN
  IF p_tracking_id IS NULL OR btrim(p_tracking_id) = '' THEN
    RAISE EXCEPTION 'Invalid tracking_id';
  END IF;

  IF p_event_type IS NULL OR p_event_type NOT IN (
    'arrived',
    'checked_in',
    'moved',
    'loading_started',
    'departed'
  ) THEN
    RAISE EXCEPTION 'Invalid event_type';
  END IF;

  SELECT id INTO v_load_id
  FROM loads
  WHERE tracking_id = p_tracking_id
    AND tracking_id IS NOT NULL;

  IF v_load_id IS NULL THEN
    RAISE EXCEPTION 'Invalid tracking_id';
  END IF;

  INSERT INTO load_events (load_id, event_type, timestamp, gps_lat, gps_long, note)
  VALUES (v_load_id, p_event_type, p_timestamp, p_gps_lat, p_gps_long, p_note)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION insert_load_event_via_tracking(
  text,
  text,
  timestamptz,
  numeric,
  numeric,
  text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION insert_load_event_via_tracking(
  text,
  text,
  timestamptz,
  numeric,
  numeric,
  text
) TO anon, authenticated;
