'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { LoadEventType } from '@/types/load-events';
import { formatTime } from '@/lib/utils';

type EventType = LoadEventType;

const ACTIONS: { type: EventType; label: string; short: string }[] = [
  { type: 'arrived', label: 'I Arrived', short: 'Arrived' },
  { type: 'checked_in', label: 'Checked In', short: 'Checked in' },
  { type: 'moved', label: 'Moved Location', short: 'Moved' },
  { type: 'loading_started', label: 'Loading Started', short: 'Loading' },
  { type: 'departed', label: 'Departed', short: 'Departed' },
];

function eventLabel(type: EventType): string {
  return ACTIONS.find((a) => a.type === type)?.short ?? type;
}

function statusFromLastEvent(last: { event_type: EventType } | null): string {
  if (!last) return 'Not started — tap an action below when you are ready.';
  const map: Record<EventType, string> = {
    arrived: 'You are marked as arrived at the facility.',
    checked_in: 'You are checked in and waiting.',
    moved: 'Location move recorded.',
    loading_started: 'Loading is in progress.',
    departed: 'You are marked as departed.',
  };
  return map[last.event_type] ?? 'Status updated.';
}

interface LastEventRow {
  event_type: EventType;
  timestamp: string;
  note: string | null;
}

interface DriverHubActionsProps {
  trackingId: string;
  /** Optional — avoids waiting on load fetch for header */
  loadNumber?: string;
}

export default function DriverHubActions({ trackingId, loadNumber: loadNumberProp }: DriverHubActionsProps) {
  const [loadId, setLoadId] = useState<string | null>(null);
  const [loadNumber, setLoadNumber] = useState<string | undefined>(loadNumberProp);
  const [loadStatus, setLoadStatus] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<LastEventRow | null>(null);
  const [moveNote, setMoveNote] = useState('');
  const [loading, setLoading] = useState<EventType | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [ready, setReady] = useState(false);

  const refreshLastEvent = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('load_events')
      .select('event_type, timestamp, note')
      .eq('load_id', id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }
    if (data) {
      setLastEvent({
        event_type: data.event_type as EventType,
        timestamp: data.timestamp,
        note: data.note,
      });
    } else {
      setLastEvent(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setInitError(null);
      const { data: load, error } = await supabase
        .from('loads')
        .select('id, load_number, status')
        .eq('tracking_id', trackingId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !load) {
        setInitError('This tracking link is invalid or has expired.');
        setReady(true);
        return;
      }

      setLoadId(load.id);
      setLoadNumber((prev) => load.load_number ?? prev);
      setLoadStatus(load.status ?? null);
      await refreshLastEvent(load.id);
      setReady(true);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [trackingId, refreshLastEvent]);

  useEffect(() => {
    if (!loadId) return;

    const channel = supabase
      .channel(`driver-hub-actions:${loadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'load_events',
          filter: `load_id=eq.${loadId}`,
        },
        () => {
          void refreshLastEvent(loadId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadId, refreshLastEvent]);

  const getGeolocation = (): Promise<{ lat: number | null; lng: number | null }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: null, lng: null });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => resolve({ lat: null, lng: null }),
        { timeout: 8000, enableHighAccuracy: false, maximumAge: 60_000 }
      );
    });
  };

  const logEvent = async (eventType: EventType) => {
    if (!loadId) return;

    if (lastEvent?.event_type === eventType) {
      setFeedback({
        message: `You already logged "${eventLabel(eventType)}" last. Pick the next step when it happens.`,
        type: 'error',
      });
      setTimeout(() => setFeedback(null), 3500);
      return;
    }

    setLoading(eventType);
    setFeedback(null);

    const note =
      eventType === 'moved' && moveNote.trim().length > 0 ? moveNote.trim() : null;

    const { lat, lng } = await getGeolocation();

    const { error } = await supabase.rpc('insert_load_event_via_tracking', {
      p_tracking_id: trackingId,
      p_event_type: eventType,
      p_timestamp: new Date().toISOString(),
      p_gps_lat: lat,
      p_gps_long: lng,
      p_note: note,
    });

    setLoading(null);

    if (error) {
      console.error(error);
      setFeedback({ message: 'Could not save that event. Check your connection and try again.', type: 'error' });
      return;
    }

    if (eventType === 'moved') setMoveNote('');
    setFeedback({
      message: `${ACTIONS.find((a) => a.type === eventType)?.label ?? eventType} saved.`,
      type: 'success',
    });
    setTimeout(() => setFeedback(null), 2800);
    await refreshLastEvent(loadId);
  };

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <p className="text-center text-gray-500">Loading…</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-lg font-medium text-red-700">{initError}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10 pt-4">
      <div className="mx-auto w-full max-w-lg space-y-6 px-4">
        {(loadNumber ?? loadNumberProp) && (
          <header className="text-center">
            <p className="text-sm font-medium text-slate-500">Load</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900">#{loadNumber ?? loadNumberProp}</p>
            {loadStatus && (
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Dispatcher status: {loadStatus}</p>
            )}
          </header>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Where you are now</h2>
          <p className="mt-2 text-base leading-snug text-slate-800">{statusFromLastEvent(lastEvent)}</p>
          {lastEvent && (
            <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Last logged:</span>{' '}
              {eventLabel(lastEvent.event_type)} · {formatTime(lastEvent.timestamp)}
              {lastEvent.note ? (
                <span className="mt-1 block text-slate-500">&ldquo;{lastEvent.note}&rdquo;</span>
              ) : null}
            </p>
          )}
        </section>

        {feedback && (
          <div
            role="status"
            className={`rounded-xl px-4 py-3 text-center text-sm font-medium ${
              feedback.type === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-800'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="space-y-3">
          {ACTIONS.map(({ type, label }) => {
            const isDuplicateNext = lastEvent?.event_type === type;
            const busy = loading !== null;
            return (
              <div key={type}>
                <button
                  type="button"
                  onClick={() => void logEvent(type)}
                  disabled={busy || isDuplicateNext}
                  title={
                    isDuplicateNext
                      ? 'Same as your last log — use the next step when it happens'
                      : undefined
                  }
                  className="flex w-full min-h-[3.5rem] items-center justify-center rounded-2xl bg-blue-600 px-4 py-4 text-lg font-semibold text-white shadow-md transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
                >
                  {loading === type ? 'Saving…' : label}
                </button>
                {type === 'moved' && (
                  <label className="mt-2 block">
                    <span className="sr-only">Optional note for this move</span>
                    <textarea
                      value={moveNote}
                      onChange={(e) => setMoveNote(e.target.value)}
                      placeholder="Add note (optional) — e.g. new door or yard"
                      rows={2}
                      maxLength={500}
                      className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-slate-400">
          Location is added when your browser allows it. Same event twice in a row is blocked — log the next step when
          it happens.
        </p>
      </div>
    </div>
  );
}
