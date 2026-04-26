/*\n  # Enable RLS and Cleanup Test Data\n\n  1. Security\n    - Verify RLS is enabled on all core tables (dispatchers, drivers, loads, detention_events)\n    - Re-enable RLS if it was accidentally disabled\n\n  2. Data Cleanup\n    - Delete all test/demo data from all tables\n    - This ensures new users start with a clean slate\n    - All data will be scoped to authenticated users going forward\n\n  3. Important Notes\n    - This migration removes ALL existing data to prevent cross-tenant leakage\n    - After this migration, only properly authenticated users can see their own data\n    - The RLS policies from the initial migration remain unchanged and enforce strict multi-tenancy\n*/\n\n-- Re-enable RLS on all core tables (idempotent)\nALTER TABLE dispatchers ENABLE ROW LEVEL SECURITY;
\nALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
\nALTER TABLE loads ENABLE ROW LEVEL SECURITY;
\nALTER TABLE detention_events ENABLE ROW LEVEL SECURITY;
\n\n-- Delete ALL test/demo data to ensure clean multi-tenant environment\nDELETE FROM detention_events;
\nDELETE FROM loads;
\nDELETE FROM drivers;
\nDELETE FROM dispatchers;
\n;
