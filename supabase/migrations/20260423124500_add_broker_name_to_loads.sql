/*
  # Add broker_name to loads

  Stores broker contact name for detention notifications.
*/

ALTER TABLE loads
ADD COLUMN IF NOT EXISTS broker_name text NULL;
