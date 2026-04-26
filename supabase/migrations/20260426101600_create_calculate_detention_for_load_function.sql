/*
  Create RPC to calculate detention for a single load using load_events.
  - Arrival = first "arrived" timestamp (UTC)
  - Departure = last "departed" timestamp (UTC)
  - detention_minutes = max(0, departure - arrival - free_time)
  - detention_hours = detention_minutes / 60
  - revenue = detention_hours * rate_per_hour
*/

CREATE OR REPLACE FUNCTION calculate_detention_for_load(p_load_id uuid)
RETURNS TABLE (
  detention_hours numeric,
  revenue numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH load_cfg AS (
    SELECT
      l.free_time_hours,
      l.rate_per_hour
    FROM loads l
    WHERE l.id = p_load_id
    LIMIT 1
  ),
  dedup_events AS (
    SELECT DISTINCT
      e.event_type,
      (e."timestamp" AT TIME ZONE 'UTC') AS event_utc
    FROM load_events e
    WHERE e.load_id = p_load_id
      AND e.event_type IN ('arrived', 'departed')
  ),
  timeline AS (
    SELECT
      MIN(event_utc) FILTER (WHERE event_type = 'arrived') AS first_arrived_utc,
      MAX(event_utc) FILTER (WHERE event_type = 'departed') AS last_departed_utc
    FROM dedup_events
  ),
  computed AS (
    SELECT
      GREATEST(
        0::numeric,
        (
          EXTRACT(EPOCH FROM (t.last_departed_utc - t.first_arrived_utc)) / 60.0
          - (c.free_time_hours * 60.0)
        )::numeric
      ) AS detention_minutes,
      c.rate_per_hour
    FROM load_cfg c
    CROSS JOIN timeline t
    WHERE t.first_arrived_utc IS NOT NULL
      AND t.last_departed_utc IS NOT NULL
  )
  SELECT
    COALESCE(detention_minutes / 60.0, 0)::numeric AS detention_hours,
    COALESCE((detention_minutes / 60.0) * rate_per_hour, 0)::numeric AS revenue
  FROM computed
  UNION ALL
  SELECT 0::numeric, 0::numeric
  WHERE NOT EXISTS (SELECT 1 FROM computed)
  LIMIT 1;
$$;
