import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { LoadEvent, LoadEventInsert } from '../types/load-events';

async function insertLoadEvent(event: LoadEventInsert): Promise<LoadEvent> {
  const { data, error } = await supabase
    .from('load_events')
    .insert(event)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
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
