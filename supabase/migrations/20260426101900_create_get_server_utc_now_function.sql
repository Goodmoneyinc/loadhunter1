/*
  Exposes authoritative server UTC time for client-side live clocks.
*/

CREATE OR REPLACE FUNCTION get_server_utc_now()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
$$;
