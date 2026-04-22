import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { LoadEvent, LoadEventType } from '../../types/load-events';

interface LoadTimelineProps {
  loadId: string;
}

const EVENT_LABELS: Record<LoadEventType, string> = {
  arrived: 'Arrived at Facility',
  checked_in: 'Checked In',
  moved: 'Moved Location',
  loading_started: 'Loading Started',
  departed: 'Departed',
};

const KEY_EVENTS: LoadEventType[] = ['arrived', 'checked_in', 'departed'];

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

export default function LoadTimeline({ loadId }: LoadTimelineProps) {
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
      } else {
        setEvents(data ?? []);
      }

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
            if (prev.some((event) => event.id === next.id)) return prev;
            const newEvents = [...prev, next];
            newEvents.sort(
              (a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            return newEvents;
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [loadId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-4">
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="h-4 w-1/2 rounded bg-gray-200" />
        <div className="h-4 w-5/6 rounded bg-gray-200" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">{error}</div>;
  }

  if (events.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p className="text-lg">No events recorded yet.</p>
        <p className="mt-2 text-sm">Timeline will appear once the driver shares updates.</p>
      </div>
    );
  }

  const groupedEvents: Record<string, LoadEvent[]> = {};
  events.forEach((event) => {
    const dateKey = new Date(event.timestamp).toDateString();
    if (!groupedEvents[dateKey]) groupedEvents[dateKey] = [];
    groupedEvents[dateKey].push(event);
  });

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {Object.entries(groupedEvents).map(([dateKey, dayEvents], dateIdx) => (
          <li key={dateKey}>
            <div className="relative pb-8">
              {dateIdx !== Object.keys(groupedEvents).length - 1 && (
                <span
                  className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex space-x-3">
                <div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 ring-8 ring-white">
                    <span className="text-xs font-medium text-gray-500">
                      {formatDate(dayEvents[0].timestamp)}
                    </span>
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div className="w-full">
                    {dayEvents.map((event) => (
                      <div key={event.id} className="mb-4 last:mb-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-sm font-medium ${
                                KEY_EVENTS.includes(event.event_type)
                                  ? 'font-semibold text-gray-900'
                                  : 'text-gray-600'
                              }`}
                            >
                              {formatTime(event.timestamp)}
                            </span>
                            <span
                              className={`text-sm ${
                                KEY_EVENTS.includes(event.event_type)
                                  ? 'font-medium text-gray-900'
                                  : 'text-gray-500'
                              }`}
                            >
                              {EVENT_LABELS[event.event_type]}
                            </span>
                            {event.gps_lat && event.gps_long && (
                              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                GPS
                              </span>
                            )}
                          </div>
                          {event.note && (
                            <span className="max-w-[120px] truncate text-xs text-gray-400">
                              {event.note}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
