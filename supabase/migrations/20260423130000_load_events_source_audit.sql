/*
  # load_events — provenance and edit audit

  - source: who produced the row ('system' automated vs 'user' manual)
  - edited_at: when a user last changed meaningful fields (optional)
  - original_timestamp: prior timestamp when timestamp was edited (audit)
*/

ALTER TABLE load_events
  ADD COLUMN source text NOT NULL DEFAULT 'system'
    CHECK (source IN ('system', 'user')),
  ADD COLUMN edited_at timestamptz,
  ADD COLUMN original_timestamp timestamptz;

COMMENT ON COLUMN load_events.source IS 'system | user — how the event was created';
COMMENT ON COLUMN load_events.edited_at IS 'Last user edit time (optional)';
COMMENT ON COLUMN load_events.original_timestamp IS 'Previous timestamp if timestamp was changed (audit)';
