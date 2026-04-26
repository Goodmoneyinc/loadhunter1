/*
  # Add broker_email to loads

  Stores broker recipient email for detention notifications.
*/

ALTER TABLE loads
ADD COLUMN IF NOT EXISTS broker_email text NULL;
