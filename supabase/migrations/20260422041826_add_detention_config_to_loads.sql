ALTER TABLE loads
ADD COLUMN free_time_hours NUMERIC DEFAULT 2 NOT NULL,
ADD COLUMN rate_per_hour NUMERIC DEFAULT 75 NOT NULL;

-- Optional: Add check constraints to prevent negative values
ALTER TABLE loads
ADD CONSTRAINT loads_free_time_hours_check CHECK (free_time_hours >= 0),
ADD CONSTRAINT loads_rate_per_hour_check CHECK (rate_per_hour >= 0);
