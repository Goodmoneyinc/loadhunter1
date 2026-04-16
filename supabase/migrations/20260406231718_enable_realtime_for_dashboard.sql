/*
  # Enable Realtime for Dashboard Tables

  1. Changes
    - Enable Realtime publication for `loads` table
    - Enable Realtime publication for `drivers` table
    - Enable Realtime publication for `subscriptions` table (for leaderboard stats)

  2. Purpose
    - Allow real-time updates to dashboard stats and leaderboard
    - Automatically refresh UI when new loads or drivers are added/updated
    - Live subscription count updates for leaderboard metrics
*/

-- Enable realtime for loads table
ALTER PUBLICATION supabase_realtime ADD TABLE loads;

-- Enable realtime for drivers table
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;

-- Enable realtime for subscriptions table (for stats tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
