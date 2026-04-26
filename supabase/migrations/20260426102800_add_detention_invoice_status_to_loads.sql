/*
  Add detention invoice status lifecycle on loads.
  draft -> sent -> paid
*/

ALTER TABLE loads
  ADD COLUMN IF NOT EXISTS detention_invoice_status text NOT NULL DEFAULT 'draft';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'loads_detention_invoice_status_check'
  ) THEN
    ALTER TABLE loads
      ADD CONSTRAINT loads_detention_invoice_status_check
      CHECK (detention_invoice_status IN ('draft', 'sent', 'paid'));
  END IF;
END $$;
