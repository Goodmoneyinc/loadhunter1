/*\n  # Add truck_id to drivers table\n\n  1. Modified Tables\n    - `drivers`\n      - Added `truck_id` (text, nullable) - optional truck/unit identifier for the driver\n\n  2. Notes\n    - This is a nullable column so existing drivers are not affected\n    - Truck ID is a dispatcher-assigned identifier like "UNIT-42" or "TRK-7"\n*/\n\nDO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.columns\n    WHERE table_name = 'drivers' AND column_name = 'truck_id'\n  ) THEN\n    ALTER TABLE drivers ADD COLUMN truck_id text DEFAULT NULL;
\n  END IF;
\nEND $$;
\n;
