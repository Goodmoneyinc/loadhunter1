/*\n  # Add GPS Coordinates to Loads Table\n\n  1. Changes\n    - Add `facility_lat` column to loads table (latitude of facility)\n    - Add `facility_long` column to loads table (longitude of facility)\n    - These coordinates will be used for geofencing and auto-arrival detection\n\n  2. Notes\n    - Coordinates are stored as NUMERIC for precision\n    - Nullable to support existing records\n*/\n\nDO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.columns\n    WHERE table_name = 'loads' AND column_name = 'facility_lat'\n  ) THEN\n    ALTER TABLE loads ADD COLUMN facility_lat NUMERIC(10, 7);
\n  END IF;
\n\n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.columns\n    WHERE table_name = 'loads' AND column_name = 'facility_long'\n  ) THEN\n    ALTER TABLE loads ADD COLUMN facility_long NUMERIC(10, 7);
\n  END IF;
\nEND $$;
;
