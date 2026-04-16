/*
  # Add load_number column to loads table

  1. Changes
    - Add `load_number` column to `loads` table
    - Make it required (NOT NULL) with a default empty string
    - Add index for better query performance

  2. Notes
    - This column stores the load reference number or identifier
    - Existing loads will have empty string as load_number
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loads' AND column_name = 'load_number'
  ) THEN
    ALTER TABLE loads ADD COLUMN load_number TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_loads_load_number ON loads(load_number);