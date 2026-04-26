/*\n  # Add created_by column to drivers table\n\n  ## Summary\n  Adds a `created_by` column to the `drivers` table to track which user\n  (by their auth UUID / profiles.id) created each driver record.\n\n  ## Changes\n  - `drivers` table: new nullable `created_by` (uuid) column\n    - References the user's UUID from auth / profiles\n    - Nullable to avoid breaking existing rows\n\n  ## Notes\n  - Existing rows will have NULL for created_by (safe, no data loss)\n  - No FK constraint added intentionally to avoid RLS complications\n*/\n\nDO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.columns\n    WHERE table_name = 'drivers' AND column_name = 'created_by'\n  ) THEN\n    ALTER TABLE drivers ADD COLUMN created_by uuid;
\n  END IF;
\nEND $$;
\n;
