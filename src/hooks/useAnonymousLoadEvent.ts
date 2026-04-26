import { useMutation } from '@tanstack/react-query';
import type { LoadEventType } from '../types/load-events';
import { supabase } from '../lib/supabase';

interface AnonymousEventInput {
  trackingId: string;
  eventType: LoadEventType;
  timestamp?: Date;
  gpsLat?: number;
  gpsLong?: number;
  note?: string;
}

export function useAnonymousLoadEvent() {
  return useMutation({
    mutationFn: async (input: AnonymousEventInput) => {
      const { data, error } = await supabase.rpc('insert_load_event_via_tracking', {
        p_tracking_id: input.trackingId,
        p_event_type: input.eventType,
        p_timestamp: input.timestamp?.toISOString() ?? new Date().toISOString(),
        p_gps_lat: input.gpsLat,
        p_gps_long: input.gpsLong,
        p_note: input.note,
      });

      if (error) throw error;
      return data;
    },
  });
}
