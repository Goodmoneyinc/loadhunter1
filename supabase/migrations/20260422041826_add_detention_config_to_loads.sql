ALTER TABLE loads
ADD COLUMN IF NOT EXISTS free_time_hours NUMERIC DEFAULT 2 NOT NULL,
ADD COLUMN IF NOT EXISTS rate_per_hour NUMERIC DEFAULT 75 NOT NULL;

-- Optional: Add check constraints to prevent negative values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'loads_free_time_hours_check'
  ) THEN
    ALTER TABLE loads
    ADD CONSTRAINT loads_free_time_hours_check CHECK (free_time_hours >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'loads_rate_per_hour_check'
  ) THEN
    ALTER TABLE loads
    ADD CONSTRAINT loads_rate_per_hour_check CHECK (rate_per_hour >= 0);
  END IF;
END $$;
