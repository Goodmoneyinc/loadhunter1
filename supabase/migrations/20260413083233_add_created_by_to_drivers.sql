/*
  # Add created_by column to drivers table

  ## Summary
  Adds a `created_by` column to the `drivers` table to track which user
  (by their auth UUID / profiles.id) created each driver record.

  ## Changes
  - `drivers` table: new nullable `created_by` (uuid) column
    - References the user's UUID from auth / profiles
    - Nullable to avoid breaking existing rows

  ## Notes
  - Existing rows will have NULL for created_by (safe, no data loss)
  - No FK constraint added intentionally to avoid RLS complications
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE drivers ADD COLUMN created_by uuid;
  END IF;
END $$;
