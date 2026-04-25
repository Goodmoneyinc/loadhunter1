import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type EventType = 'arrived' | 'checked_in' | 'moved' | 'loading_started' | 'departed';

const EVENT_BUTTONS: { label: string; type: EventType }[] = [
  { label: 'Arrived at Facility', type: 'arrived' },
  { label: 'Checked In', type: 'checked_in' },
  { label: 'Moved Location', type: 'moved' },
  { label: 'Loading Started', type: 'loading_started' },
  { label: 'Departed', type: 'departed' },
];

interface DriverHubProps {
  trackingId: string;
  loadNumber?: string;
}

export default function DriverHub({ trackingId, loadNumber }: DriverHubProps) {
  const [loading, setLoading] = useState<EventType | null>(null);
  const [completedEvents, setCompletedEvents] = useState<Set<EventType>>(new Set());
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [resolvedLoadId, setResolvedLoadId] = useState<string | null>(null);

  useEffect(() => {
    const fetchExistingEvents = async () => {
      const { data: load, error: loadError } = await supabase
        .from('loads')
        .select('id')
        .eq('tracking_id', trackingId)
        .single();

      if (loadError || !load) {
        setFeedback({ message: 'Invalid tracking ID', type: 'error' });
        setIsInitializing(false);
        return;
      }

      setResolvedLoadId(load.id);

      const { data: events, error: eventsError } = await supabase
        .from('load_events')
        .select('event_type')
        .eq('load_id', load.id);

      if (!eventsError && events) {
        const completed = new Set(events.map((e) => e.event_type as EventType));
        setCompletedEvents(completed);
      }

      setIsInitializing(false);
    };

    fetchExistingEvents();
  }, [trackingId]);

  useEffect(() => {
    if (isInitializing || !resolvedLoadId) return;

    const channel = supabase
      .channel(`driver-hub:${trackingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'load_events',
          filter: `load_id=eq.${resolvedLoadId}`,
        },
        (payload) => {
          const newEventType = payload.new.event_type as EventType;
          setCompletedEvents((prev) => new Set(prev).add(newEventType));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trackingId, isInitializing, resolvedLoadId]);

  const getGeolocation = (): Promise<{ lat: number | null; lng: number | null }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: null, lng: null });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          resolve({ lat: null, lng: null });
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  };

  const handleEvent = async (eventType: EventType) => {
    if (completedEvents.has(eventType)) {
      setFeedback({ message: `${eventType} already recorded`, type: 'error' });
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    setLoading(eventType);
    setFeedback(null);

    const { lat, lng } = await getGeolocation();

    const { error } = await supabase.rpc('insert_load_event_via_tracking', {
      p_tracking_id: trackingId,
      p_event_type: eventType,
      p_timestamp: new Date().toISOString(),
      p_gps_lat: lat,
      p_gps_long: lng,
      p_note: null,
    });

    if (error) {
      console.error(error);
      setFeedback({ message: 'Failed to record event. Please try again.', type: 'error' });
    } else {
      const label = EVENT_BUTTONS.find((b) => b.type === eventType)?.label ?? eventType;
      setFeedback({ message: `${label} recorded!`, type: 'success' });
      setCompletedEvents((prev) => new Set(prev).add(eventType));
      setTimeout(() => setFeedback(null), 3000);
    }

    setLoading(null);
  };

  if (isInitializing) {
    return <div className="py-8 text-center">Loading driver hub...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        {loadNumber && (
          <div className="text-center">
            <p className="text-sm text-gray-500">Load</p>
            <p className="text-2xl font-bold">#{loadNumber}</p>
          </div>
        )}

        {feedback && (
          <div
            className={`p-3 rounded-lg text-center font-medium ${
              feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="space-y-3">
          {EVENT_BUTTONS.map((btn) => {
            const isCompleted = completedEvents.has(btn.type);
            return (
              <button
                key={btn.type}
                onClick={() => handleEvent(btn.type)}
                disabled={loading !== null || isCompleted}
                className={`w-full rounded-xl py-6 text-xl font-semibold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                  isCompleted ? 'cursor-not-allowed bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading === btn.type ? 'Recording...' : btn.label}
                {isCompleted && ' ✓'}
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400">
          Location is captured automatically when available.
          <br />
          Completed events are marked with ✓ and cannot be re-recorded.
        </p>
      </div>
    </div>
  );
}
