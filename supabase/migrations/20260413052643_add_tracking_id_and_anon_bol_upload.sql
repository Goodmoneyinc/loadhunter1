/*
  # Add tracking_id to loads and allow anonymous BOL uploads

  1. Modified Tables
    - `loads`
      - Added `tracking_id` column (text, unique) for shareable driver tracking links
      - Auto-generates a short random ID on insert using gen_random_uuid truncated to 8 chars

  2. Security
    - Added SELECT policy on `loads` for anonymous users to fetch by tracking_id
    - Added UPDATE policy on `loads` for anonymous users to update status via tracking_id
    - Added INSERT policy on `detention_events` for anonymous users (driver auto-arrival)
    - Added INSERT policy on `storage.objects` for anonymous BOL uploads to bol-documents bucket
    - Added UPDATE policy on `drivers` for anonymous users (GPS tracking updates)

  3. Notes
    - The tracking_id enables unauthenticated driver access via /t/:trackingId
    - Drivers do not need to log in to use the tracking page
    - BOL uploads are scoped to the bol-documents bucket
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loads' AND column_name = 'tracking_id'
  ) THEN
    ALTER TABLE loads ADD COLUMN tracking_id text UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  END IF;
END $$;

CREATE POLICY "Anon users can read loads by tracking_id"
  ON loads
  FOR SELECT
  TO anon
  USING (tracking_id IS NOT NULL);

CREATE POLICY "Anon users can update load status via tracking"
  ON loads
  FOR UPDATE
  TO anon
  USING (tracking_id IS NOT NULL)
  WITH CHECK (tracking_id IS NOT NULL);

CREATE POLICY "Anon users can insert detention events for tracked loads"
  ON detention_events
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loads
      WHERE loads.id = detention_events.load_id
      AND loads.tracking_id IS NOT NULL
    )
  );

CREATE POLICY "Anon users can upload BOL documents"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'bol-documents');

CREATE POLICY "Anon users can update driver GPS for tracking"
  ON drivers
  FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM loads
      WHERE loads.driver_id = drivers.id
      AND loads.tracking_id IS NOT NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loads
      WHERE loads.driver_id = drivers.id
      AND loads.tracking_id IS NOT NULL
    )
  );

CREATE POLICY "Anon users can read drivers for tracked loads"
  ON drivers
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM loads
      WHERE loads.driver_id = drivers.id
      AND loads.tracking_id IS NOT NULL
    )
  );
