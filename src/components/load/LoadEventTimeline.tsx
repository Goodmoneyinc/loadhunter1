'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { LoadEvent, LoadEventType } from '@/types/load-events';

interface LoadEventTimelineProps {
  loadId: string;
}

const EVENT_META: Record<LoadEventType, { label: string; icon: string; order: number }> = {
  arrived: { label: 'Arrived at Facility', icon: '📍', order: 1 },
  checked_in: { label: 'Checked In', icon: '✅', order: 2 },
  moved: { label: 'Moved Location', icon: '🚚', order: 3 },
  loading_started: { label: 'Loading Started', icon: '📦', order: 4 },
  departed: { label: 'Departed', icon: '🚀', order: 5 },
};

const EXPECTED_SEQUENCE: LoadEventType[] = ['arrived', 'checked_in', 'loading_started', 'departed'];

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function LoadEventTimeline({ loadId }: LoadEventTimelineProps) {
  const [events, setEvents] = useState<LoadEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getMissingSteps = (eventList: LoadEvent[]): LoadEventType[] => {
    const existingTypes = new Set(eventList.map((e) => e.event_type));
    const lastEvent = eventList[eventList.length - 1];
    if (!lastEvent) return EXPECTED_SEQUENCE;

    const lastOrder = EVENT_META[lastEvent.event_type].order;
    return EXPECTED_SEQUENCE.filter((step) => {
      const stepOrder = EVENT_META[step].order;
      return !existingTypes.has(step) && stepOrder <= lastOrder;
    });
  };

  const missingSteps = getMissingSteps(events);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('load_events')
        .select('*')
        .eq('load_id', loadId)
        .order('timestamp', { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setEvents((data as LoadEvent[]) || []);
        setError(null);
      }
      setLoading(false);
    };

    fetchEvents();

    const channel = supabase
      .channel(`load_events_timeline:${loadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'load_events',
          filter: `load_id=eq.${loadId}`,
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadId]);

  if (loading) {
    return <div className="animate-pulse space-y-4 p-4">Loading timeline...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  if (events.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <p>No events recorded yet.</p>
        <p className="mt-1 text-sm">Timeline will appear once driver updates status.</p>
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
      {missingSteps.length > 0 && (
        <div className="mb-6 rounded-md border-l-4 border-yellow-400 bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">⚠️</div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Missing expected steps</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-inside list-disc space-y-1">
                  {missingSteps.map((step) => (
                    <li key={step}>{EVENT_META[step]?.label || step}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <ul role="list" className="-mb-8">
        {Object.entries(groupedEvents).map(([dateKey, dayEvents], dateIdx, allEntries) => (
          <li key={dateKey}>
            <div className="relative pb-8">
              {dateIdx !== allEntries.length - 1 && (
                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
              )}
              <div className="relative flex space-x-3">
                <div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 ring-8 ring-white">
                    <span className="text-xs font-medium text-gray-500">{formatDate(dayEvents[0].timestamp)}</span>
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div className="w-full">
                    {dayEvents.map((event) => {
                      const meta = EVENT_META[event.event_type];
                      return (
                        <div key={event.id} className="mb-4 last:mb-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{meta?.icon || '📌'}</span>
                              <span className="text-sm font-medium text-gray-900">{formatTime(event.timestamp)}</span>
                              <span className="text-sm text-gray-600">{meta?.label || event.event_type}</span>
                              {event.gps_lat && event.gps_long && (
                                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                  📍 GPS
                                </span>
                              )}
                            </div>
                            {event.note && (
                              <span className="mt-1 max-w-[200px] truncate text-xs text-gray-400 sm:mt-0">
                                Note: {event.note}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
