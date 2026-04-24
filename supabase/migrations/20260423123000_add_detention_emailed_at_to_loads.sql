/*
  # Add detention_emailed_at to loads

  Tracks when a detention email was last sent for a load.
*/

ALTER TABLE loads
ADD COLUMN IF NOT EXISTS detention_emailed_at timestamptz NULL;
