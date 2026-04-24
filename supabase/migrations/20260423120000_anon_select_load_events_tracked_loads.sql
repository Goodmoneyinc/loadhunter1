/*
  # Allow anonymous drivers to read load_events for tracked loads

  DriverHub calls `generateDetentionReport` with the load UUID resolved from
  `tracking_id`. Direct SELECT on `load_events` was dispatcher-only; this policy
  mirrors the existing anon rule on `loads` (tracking_id IS NOT NULL).
*/

CREATE POLICY anon_select_load_events_for_tracked_loads
  ON load_events
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM loads
      WHERE loads.id = load_events.load_id
        AND loads.tracking_id IS NOT NULL
    )
  );
