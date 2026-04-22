import type { Database } from './supabase';

export type LoadEvent = Database['public']['Tables']['load_events']['Row'];
export type LoadEventInsert = Database['public']['Tables']['load_events']['Insert'];
export type LoadEventUpdate = Database['public']['Tables']['load_events']['Update'];

export type LoadEventType = LoadEvent['event_type'];

export const EVENT_TYPES = [
  'arrived',
  'checked_in',
  'moved',
  'loading_started',
  'departed',
] as const satisfies readonly LoadEventType[];
