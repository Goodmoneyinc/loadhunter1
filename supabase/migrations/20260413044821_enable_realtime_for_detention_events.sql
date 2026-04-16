/*
  # Enable realtime for detention_events table

  1. Changes
    - Add `detention_events` table to the Supabase realtime publication
    - This enables the dashboard to receive live updates when detention events are created or updated

  2. Notes
    - Allows the Live Detention widget to update in real-time as detention clocks tick
*/

ALTER PUBLICATION supabase_realtime ADD TABLE detention_events;
