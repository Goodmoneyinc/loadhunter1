/*
  # Add GPS Tracking to Drivers

  1. Changes
    - Add `current_lat` column to drivers table for real-time latitude
    - Add `current_long` column to drivers table for real-time longitude
    - Add `last_gps_update` column to track when GPS was last updated
    - Add `is_tracking` column to enable/disable GPS tracking per driver

  2. Purpose
    - Enable live GPS tracking of drivers in transit
    - Support geofencing and auto-arrival detection
    - Track location update timestamps for freshness validation
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'current_lat'
  ) THEN
    ALTER TABLE drivers ADD COLUMN current_lat double precision;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'current_long'
  ) THEN
    ALTER TABLE drivers ADD COLUMN current_long double precision;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'last_gps_update'
  ) THEN
    ALTER TABLE drivers ADD COLUMN last_gps_update timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'is_tracking'
  ) THEN
    ALTER TABLE drivers ADD COLUMN is_tracking boolean DEFAULT false;
  END IF;
END $$;

-- Create index for faster GPS queries
CREATE INDEX IF NOT EXISTS idx_drivers_gps ON drivers(current_lat, current_long) WHERE current_lat IS NOT NULL AND current_long IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_tracking ON drivers(is_tracking) WHERE is_tracking = true;
