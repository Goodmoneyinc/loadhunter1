/*
  Enforce load event order with explicit dispatcher override + audit logging.
*/

ALTER TABLE load_events
  ADD COLUMN IF NOT EXISTS timeline_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_reason text NULL;

CREATE TABLE IF NOT EXISTS load_event_override_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_event_id uuid NOT NULL REFERENCES load_events(id) ON DELETE CASCADE,
  load_id uuid NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  overridden_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  override_reason text NULL,
  event_type text NOT NULL,
  event_timestamp timestamptz NOT NULL,
  previous_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE load_event_override_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dispatcher_select_load_event_override_audit ON load_event_override_audit;
CREATE POLICY dispatcher_select_load_event_override_audit ON load_event_override_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM loads
      JOIN dispatchers ON dispatchers.id = loads.dispatcher_id
      WHERE loads.id = load_event_override_audit.load_id
        AND dispatchers.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION validate_load_event_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_arrived_before boolean;
  v_has_checked_in_before boolean;
  v_has_loading_started_before boolean;
BEGIN
  IF NEW.timeline_override THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM load_events e
    WHERE e.load_id = NEW.load_id
      AND e.event_type = 'arrived'
      AND e.timestamp <= NEW.timestamp
      AND e.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) INTO v_has_arrived_before;

  SELECT EXISTS (
    SELECT 1
    FROM load_events e
    WHERE e.load_id = NEW.load_id
      AND e.event_type = 'checked_in'
      AND e.timestamp <= NEW.timestamp
      AND e.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) INTO v_has_checked_in_before;

  SELECT EXISTS (
    SELECT 1
    FROM load_events e
    WHERE e.load_id = NEW.load_id
      AND e.event_type = 'loading_started'
      AND e.timestamp <= NEW.timestamp
      AND e.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) INTO v_has_loading_started_before;

  IF NEW.event_type = 'checked_in' AND NOT v_has_arrived_before THEN
    RAISE EXCEPTION 'timeline order violation: checked_in requires arrived first';
  END IF;

  IF NEW.event_type = 'loading_started' AND NOT v_has_checked_in_before THEN
    RAISE EXCEPTION 'timeline order violation: loading_started requires checked_in first';
  END IF;

  IF NEW.event_type = 'departed' AND NOT v_has_loading_started_before THEN
    RAISE EXCEPTION 'timeline order violation: departed requires loading_started first';
  END IF;

  IF NEW.event_type = 'moved' AND NOT v_has_arrived_before THEN
    RAISE EXCEPTION 'timeline order violation: moved requires arrived first';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_load_event_order ON load_events;
CREATE TRIGGER trg_validate_load_event_order
BEFORE INSERT OR UPDATE ON load_events
FOR EACH ROW
EXECUTE FUNCTION validate_load_event_order();

CREATE OR REPLACE FUNCTION log_load_event_override_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.timeline_override THEN
    INSERT INTO load_event_override_audit (
      load_event_id,
      load_id,
      overridden_by,
      override_reason,
      event_type,
      event_timestamp,
      previous_events
    )
    SELECT
      NEW.id,
      NEW.load_id,
      auth.uid(),
      NEW.override_reason,
      NEW.event_type,
      NEW.timestamp,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', e.id,
            'event_type', e.event_type,
            'timestamp', e.timestamp
          )
          ORDER BY e.timestamp
        ),
        '[]'::jsonb
      )
    FROM load_events e
    WHERE e.load_id = NEW.load_id
      AND e.id <> NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_load_event_override_audit ON load_events;
CREATE TRIGGER trg_log_load_event_override_audit
AFTER INSERT OR UPDATE ON load_events
FOR EACH ROW
EXECUTE FUNCTION log_load_event_override_audit();

CREATE OR REPLACE FUNCTION insert_load_event_override(
  p_load_id uuid,
  p_event_type text,
  p_timestamp timestamptz DEFAULT now(),
  p_gps_lat numeric DEFAULT NULL,
  p_gps_long numeric DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_override_reason text DEFAULT 'Fix Timeline override'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  IF p_event_type IS NULL OR p_event_type NOT IN (
    'arrived',
    'checked_in',
    'moved',
    'loading_started',
    'departed'
  ) THEN
    RAISE EXCEPTION 'Invalid event_type';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM loads
    JOIN dispatchers ON dispatchers.id = loads.dispatcher_id
    WHERE loads.id = p_load_id
      AND dispatchers.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized for load_id %', p_load_id;
  END IF;

  INSERT INTO load_events (
    load_id,
    event_type,
    timestamp,
    gps_lat,
    gps_long,
    note,
    source,
    timeline_override,
    override_reason
  )
  VALUES (
    p_load_id,
    p_event_type,
    p_timestamp,
    p_gps_lat,
    p_gps_long,
    p_note,
    'user',
    true,
    p_override_reason
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION insert_load_event_override(
  uuid,
  text,
  timestamptz,
  numeric,
  numeric,
  text,
  text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION insert_load_event_override(
  uuid,
  text,
  timestamptz,
  numeric,
  numeric,
  text,
  text
) TO authenticated;
