/*
  # Add GPS Coordinates to Loads Table

  1. Changes
    - Add `facility_lat` column to loads table (latitude of facility)
    - Add `facility_long` column to loads table (longitude of facility)
    - These coordinates will be used for geofencing and auto-arrival detection

  2. Notes
    - Coordinates are stored as NUMERIC for precision
    - Nullable to support existing records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loads' AND column_name = 'facility_lat'
  ) THEN
    ALTER TABLE loads ADD COLUMN facility_lat NUMERIC(10, 7);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loads' AND column_name = 'facility_long'
  ) THEN
    ALTER TABLE loads ADD COLUMN facility_long NUMERIC(10, 7);
  END IF;
END $$;