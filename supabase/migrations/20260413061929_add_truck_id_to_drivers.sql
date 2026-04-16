/*
  # Add truck_id to drivers table

  1. Modified Tables
    - `drivers`
      - Added `truck_id` (text, nullable) - optional truck/unit identifier for the driver

  2. Notes
    - This is a nullable column so existing drivers are not affected
    - Truck ID is a dispatcher-assigned identifier like "UNIT-42" or "TRK-7"
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'truck_id'
  ) THEN
    ALTER TABLE drivers ADD COLUMN truck_id text DEFAULT NULL;
  END IF;
END $$;
