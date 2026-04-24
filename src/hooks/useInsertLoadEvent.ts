import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Database } from '../lib/database.types';
import { supabase } from '../lib/supabase';
import { normalizeLoadEvent, type LoadEvent, type LoadEventInsert } from '../types/load-events';

type DbLoadEventInsert = Database['public']['Tables']['load_events']['Insert'];

function toDbInsert(event: LoadEventInsert): DbLoadEventInsert {
  return {
    load_id: event.load_id,
    event_type: event.event_type,
    timestamp: event.timestamp,
    gps_lat: event.gps_lat == null ? null : String(event.gps_lat),
    gps_long: event.gps_long == null ? null : String(event.gps_long),
    note: event.note ?? null,
    id: event.id,
    created_at: event.created_at,
    source: event.source ?? 'system',
    edited_at: event.edited_at ?? null,
    original_timestamp: event.original_timestamp ?? null,
    timeline_override: event.timeline_override ?? false,
    override_reason: event.override_reason ?? null,
  };
}

async function insertLoadEvent(event: LoadEventInsert): Promise<LoadEvent> {
  const { data, error } = await supabase
    .from('load_events')
    .insert(toDbInsert(event))
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeLoadEvent(data);
}

export function useInsertLoadEvent(loadId: string) {
  const utils = useQueryClient();

  return useMutation<
    LoadEvent,
    Error,
    LoadEventInsert,
    { previous?: LoadEvent[] }
  >({
    mutationFn: insertLoadEvent,
    onMutate: async (newEvent) => {
      await utils.cancelQueries({ queryKey: ['loadEvents', loadId] });

      const previous = utils.getQueryData<LoadEvent[]>(['loadEvents', loadId]);
      const optimisticEvent: LoadEvent = {
        id: 'temp-id',
        load_id: newEvent.load_id,
        event_type: newEvent.event_type,
        timestamp: newEvent.timestamp ?? new Date().toISOString(),
        gps_lat: newEvent.gps_lat ?? null,
        gps_long: newEvent.gps_long ?? null,
        note: newEvent.note ?? null,
        created_at: new Date().toISOString(),
        source: newEvent.source ?? 'system',
        edited_at: newEvent.edited_at ?? null,
        original_timestamp: newEvent.original_timestamp ?? null,
        timeline_override: newEvent.timeline_override ?? false,
        override_reason: newEvent.override_reason ?? null,
      };

      utils.setQueryData<LoadEvent[]>(['loadEvents', loadId], (old = []) => [
        optimisticEvent,
        ...old,
      ]);

      return { previous };
    },
    onError: (_err, _vars, context) => {
      utils.setQueryData(['loadEvents', loadId], context?.previous);
    },
    onSettled: () => {
      utils.invalidateQueries({ queryKey: ['loadEvents', loadId] });
    },
  });
}
