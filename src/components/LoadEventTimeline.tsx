import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  normalizeLoadEvent,
  normalizeLoadEvents,
  type LoadEvent,
  type LoadEventRowInput,
  type LoadEventType,
} from '@/types/load-events';

export interface LoadEventTimelineProps {
  loadId: string;
}

const EVENT_LABELS: Record<LoadEventType, string> = {
  arrived: 'Arrived',
  checked_in: 'Checked In',
  moved: 'Moved Location',
  loading_started: 'Loading Started',
  departed: 'Departed',
};

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getDisplayText(event: LoadEvent): string {
  const time = formatTime(event.timestamp);
  const label = EVENT_LABELS[event.event_type];
  const gpsSuffix = event.gps_lat && event.gps_long ? ' (GPS verified)' : '';
  return `${time} — ${label}${gpsSuffix}`;
}

export function LoadEventTimeline({ loadId }: LoadEventTimelineProps) {
  const [events, setEvents] = useState<LoadEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchEvents = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('load_events')
        .select('*')
        .eq('load_id', loadId)
        .order('timestamp', { ascending: true });

      if (!active) return;

      if (fetchError) {
        console.error(fetchError);
        setError('Failed to load timeline.');
        setEvents([]);
      } else {
        setEvents(data ?? []);
      }
      setLoading(false);
    };

    void fetchEvents();

    const channel = supabase
      .channel(`timeline:${loadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'load_events',
          filter: `load_id=eq.${loadId}`,
        },
        (payload) => {
          const row = normalizeLoadEvent(payload.new as LoadEventRowInput);
          setEvents((prev) => {
            if (prev.some((e) => e.id === row.id)) return prev;
            const next = [...prev, row];
            next.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [loadId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 p-2">{error}</div>;
  }

  if (events.length === 0) {
    return <div className="text-gray-500 text-sm p-2">No timeline events yet.</div>;
  }

  return (
    <div className="space-y-1">
      {events.map((event) => (
        <div key={event.id} className="py-1 text-sm text-gray-700">
          {getDisplayText(event)}
          {event.note ? (
            <div className="text-xs text-gray-400 ml-4 mt-0.5">Note: {event.note}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
