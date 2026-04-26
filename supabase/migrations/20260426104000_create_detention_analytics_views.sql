/*
  Detention analytics views for dashboard cards.
  Uses load_events sequencing anchors per load to avoid duplicate event counting.
*/

CREATE OR REPLACE VIEW top_detention_facilities
WITH (security_invoker = true)
AS
WITH event_anchors AS (
  SELECT
    le.load_id,
    MIN(le."timestamp") FILTER (WHERE le.event_type = 'arrived') AS first_arrived_at,
    MAX(le."timestamp") FILTER (WHERE le.event_type = 'departed') AS last_departed_at
  FROM (
    SELECT DISTINCT load_id, event_type, "timestamp"
    FROM load_events
    WHERE event_type IN ('arrived', 'departed')
  ) le
  GROUP BY le.load_id
),
per_load AS (
  SELECT
    l.facility_address,
    GREATEST(
      0::numeric,
      (
        EXTRACT(EPOCH FROM (ea.last_departed_at - ea.first_arrived_at)) / 3600.0
        - l.free_time_hours
      )::numeric
    ) AS detention_hours,
    l.rate_per_hour
  FROM event_anchors ea
  JOIN loads l ON l.id = ea.load_id
  WHERE ea.first_arrived_at IS NOT NULL
    AND ea.last_departed_at IS NOT NULL
)
SELECT
  facility_address,
  ROUND(SUM(detention_hours)::numeric, 2) AS total_detention_hours,
  ROUND(SUM(detention_hours * rate_per_hour)::numeric, 2) AS total_revenue
FROM per_load
GROUP BY facility_address
ORDER BY total_revenue DESC;

CREATE OR REPLACE VIEW avg_wait_time
WITH (security_invoker = true)
AS
WITH first_arrivals AS (
  SELECT
    load_id,
    MIN("timestamp") AS first_arrived_at
  FROM (
    SELECT DISTINCT load_id, "timestamp"
    FROM load_events
    WHERE event_type = 'arrived'
  ) a
  GROUP BY load_id
),
first_loading AS (
  SELECT
    le.load_id,
    MIN(le."timestamp") AS first_loading_started_at
  FROM load_events le
  JOIN first_arrivals fa ON fa.load_id = le.load_id
  WHERE le.event_type = 'loading_started'
    AND le."timestamp" >= fa.first_arrived_at
  GROUP BY le.load_id
)
SELECT
  ROUND(
    AVG(EXTRACT(EPOCH FROM (fl.first_loading_started_at - fa.first_arrived_at)) / 60.0)::numeric,
    2
  ) AS avg_wait_minutes
FROM first_arrivals fa
JOIN first_loading fl ON fl.load_id = fa.load_id;

CREATE OR REPLACE VIEW worst_offenders_last_7_days
WITH (security_invoker = true)
AS
WITH event_anchors AS (
  SELECT
    le.load_id,
    MIN(le."timestamp") FILTER (WHERE le.event_type = 'arrived') AS first_arrived_at,
    MAX(le."timestamp") FILTER (WHERE le.event_type = 'departed') AS last_departed_at
  FROM (
    SELECT DISTINCT load_id, event_type, "timestamp"
    FROM load_events
    WHERE event_type IN ('arrived', 'departed')
  ) le
  GROUP BY le.load_id
),
scored AS (
  SELECT
    l.id AS load_id,
    l.load_number,
    l.facility_address,
    ea.last_departed_at,
    GREATEST(
      0::numeric,
      (
        EXTRACT(EPOCH FROM (ea.last_departed_at - ea.first_arrived_at)) / 3600.0
        - l.free_time_hours
      )::numeric
    ) AS detention_hours,
    l.rate_per_hour
  FROM event_anchors ea
  JOIN loads l ON l.id = ea.load_id
  WHERE ea.first_arrived_at IS NOT NULL
    AND ea.last_departed_at IS NOT NULL
    AND ea.last_departed_at >= (now() AT TIME ZONE 'UTC') - INTERVAL '7 days'
)
SELECT
  load_id,
  load_number,
  facility_address,
  ROUND(detention_hours::numeric, 2) AS detention_hours,
  ROUND((detention_hours * rate_per_hour)::numeric, 2) AS revenue,
  last_departed_at
FROM scored
ORDER BY revenue DESC, detention_hours DESC;
