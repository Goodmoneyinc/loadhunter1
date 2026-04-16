/*
  # Enable RLS and Cleanup Test Data

  1. Security
    - Verify RLS is enabled on all core tables (dispatchers, drivers, loads, detention_events)
    - Re-enable RLS if it was accidentally disabled

  2. Data Cleanup
    - Delete all test/demo data from all tables
    - This ensures new users start with a clean slate
    - All data will be scoped to authenticated users going forward

  3. Important Notes
    - This migration removes ALL existing data to prevent cross-tenant leakage
    - After this migration, only properly authenticated users can see their own data
    - The RLS policies from the initial migration remain unchanged and enforce strict multi-tenancy
*/

-- Re-enable RLS on all core tables (idempotent)
ALTER TABLE dispatchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE detention_events ENABLE ROW LEVEL SECURITY;

-- Delete ALL test/demo data to ensure clean multi-tenant environment
DELETE FROM detention_events;
DELETE FROM loads;
DELETE FROM drivers;
DELETE FROM dispatchers;
