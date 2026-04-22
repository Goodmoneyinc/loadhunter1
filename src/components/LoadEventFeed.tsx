import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { LoadEvent } from '../types/load-events';

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function LoadEventFeed({ loadId }: { loadId: string }) {
  const [events, setEvents] = useState<LoadEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchEvents = async () => {
      const { data } = await supabase
        .from('load_events')
        .select('*')
        .eq('load_id', loadId)
        .order('timestamp', { ascending: false });

      if (!active) return;
      if (data) setEvents(data);
      setLoading(false);
    };

    fetchEvents();

    const channel = supabase
      .channel(`load_events:${loadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'load_events',
          filter: `load_id=eq.${loadId}`,
        },
        (payload) => {
          const next = payload.new as LoadEvent;
          setEvents((prev) => {
            if (prev.some((e) => e.id === next.id)) return prev;
            return [next, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [loadId]);

  if (loading) return <div>Loading events...</div>;
  if (events.length === 0) return <div>No events yet.</div>;

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div key={event.id} className="rounded-lg border border-white/10 bg-[#0F0F0F] p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#FF6B00]">
              {event.event_type.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-400">{formatTimestamp(event.timestamp)}</span>
          </div>
          {event.note && <p className="mt-2 text-sm text-gray-200">{event.note}</p>}
          {(event.gps_lat || event.gps_long) && (
            <p className="mt-1 text-xs text-gray-500">
              GPS: {event.gps_lat ?? '-'}, {event.gps_long ?? '-'}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
