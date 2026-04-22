/*\n  # Add load_number column to loads table\n\n  1. Changes\n    - Add `load_number` column to `loads` table\n    - Make it required (NOT NULL) with a default empty string\n    - Add index for better query performance\n\n  2. Notes\n    - This column stores the load reference number or identifier\n    - Existing loads will have empty string as load_number\n*/\n\nDO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.columns\n    WHERE table_name = 'loads' AND column_name = 'load_number'\n  ) THEN\n    ALTER TABLE loads ADD COLUMN load_number TEXT NOT NULL DEFAULT '';
\n  END IF;
\nEND $$;
\n\nCREATE INDEX IF NOT EXISTS idx_loads_load_number ON loads(load_number);
;
