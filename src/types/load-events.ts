export type LoadEventType =
  | 'arrived'
  | 'checked_in'
  | 'moved'
  | 'loading_started'
  | 'departed';

export interface LoadEvent {
  id: string;
  load_id: string;
  event_type: LoadEventType;
  timestamp: string;
  gps_lat: number | null;
  gps_long: number | null;
  note: string | null;
  created_at: string;
  source: 'system' | 'user';
  edited_at: string | null;
  original_timestamp: string | null;
}

export interface LoadEventInsert {
  load_id: string;
  event_type: LoadEventType;
  timestamp?: string;
  gps_lat?: number | null;
  gps_long?: number | null;
  note?: string | null;
  id?: string;
  created_at?: string;
  source?: 'system' | 'user';
  edited_at?: string | null;
  original_timestamp?: string | null;
}

export interface LoadEventUpdate {
  event_type?: LoadEventType;
  timestamp?: string;
  gps_lat?: number | null;
  gps_long?: number | null;
  note?: string | null;
  source?: 'system' | 'user';
  edited_at?: string | null;
  original_timestamp?: string | null;
}

export const EVENT_TYPES = [
  'arrived',
  'checked_in',
  'moved',
  'loading_started',
  'departed',
] as const satisfies readonly LoadEventType[];

function parseOptionalNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Raw row from PostgREST / Realtime (GPS may be string). */
export type LoadEventRowInput = {
  id: string;
  load_id: string;
  event_type: LoadEventType;
  timestamp: string;
  gps_lat?: unknown;
  gps_long?: unknown;
  note: string | null;
  created_at: string;
  source?: 'system' | 'user' | null;
  edited_at?: string | null;
  original_timestamp?: string | null;
};

export function normalizeLoadEvent(row: LoadEventRowInput): LoadEvent {
  return {
    id: row.id,
    load_id: row.load_id,
    event_type: row.event_type,
    timestamp: row.timestamp,
    gps_lat: parseOptionalNumber(row.gps_lat),
    gps_long: parseOptionalNumber(row.gps_long),
    note: row.note,
    created_at: row.created_at,
    source: row.source === 'user' ? 'user' : 'system',
    edited_at: row.edited_at ?? null,
    original_timestamp: row.original_timestamp ?? null,
  };
}

export function normalizeLoadEvents(
  rows: readonly LoadEventRowInput[] | null | undefined
): LoadEvent[] {
  if (!rows?.length) return [];
  return rows.map(normalizeLoadEvent);
}
