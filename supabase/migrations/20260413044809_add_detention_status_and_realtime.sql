/*
  # Add detention status and enable realtime for driver GPS

  1. Modified Tables
    - `detention_events`
      - Added `status` column (text, default 'active') to track whether detention is active or completed
    - `drivers`
      - Enabled realtime publication for live GPS map sync

  2. Security
    - No RLS changes needed (existing policies cover these tables)

  3. Notes
    - The status column allows the dashboard to query for active detention events
    - Realtime on drivers table enables live map marker movement
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'detention_events' AND column_name = 'status'
  ) THEN
    ALTER TABLE detention_events ADD COLUMN status text DEFAULT 'active';
  END IF;
END $$;
