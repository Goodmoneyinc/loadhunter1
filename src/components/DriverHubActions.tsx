'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { LoadEventType } from '@/types/load-events';
import { formatTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getDispatcherId } from '@/lib/dispatcher';

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

type EventAvailability = {
  disabled: boolean;
  reason?: string;
};

interface DriverHubActionsProps {
  trackingId: string;
  /** Optional — avoids waiting on load fetch for header */
  loadNumber?: string;
}

export default function DriverHubActions({ trackingId, loadNumber: loadNumberProp }: DriverHubActionsProps) {
  const { user } = useAuth();
  const [loadId, setLoadId] = useState<string | null>(null);
  const [loadNumber, setLoadNumber] = useState<string | undefined>(loadNumberProp);
  const [loadStatus, setLoadStatus] = useState<string | null>(null);
  const [dispatcherIdForLoad, setDispatcherIdForLoad] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<LastEventRow | null>(null);
  const [completedEvents, setCompletedEvents] = useState<Set<EventType>>(new Set());
  const [moveNote, setMoveNote] = useState('');
  const [loading, setLoading] = useState<EventType | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [ready, setReady] = useState(false);
  const [manualEditMode, setManualEditMode] = useState(false);
  const [canOverride, setCanOverride] = useState(false);

  const refreshEventsState = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('load_events')
      .select('event_type, timestamp, note')
      .eq('load_id', id)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    const typedEvents =
      data?.map((row) => ({
        event_type: row.event_type as EventType,
        timestamp: row.timestamp,
        note: row.note,
      })) ?? [];

    setCompletedEvents(new Set(typedEvents.map((e) => e.event_type)));

    if (typedEvents.length > 0) {
      const latest = typedEvents[0];
      setLastEvent({
        event_type: latest.event_type,
        timestamp: latest.timestamp,
        note: latest.note,
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
        .select('id, load_number, status, dispatcher_id')
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
      setDispatcherIdForLoad(load.dispatcher_id ?? null);
      await refreshEventsState(load.id);
      setReady(true);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [trackingId, refreshEventsState]);

  useEffect(() => {
    let cancelled = false;

    async function resolveOverridePermission() {
      if (!user || !dispatcherIdForLoad) {
        if (!cancelled) setCanOverride(false);
        return;
      }

      const currentDispatcherId = await getDispatcherId();
      if (!cancelled) {
        setCanOverride(Boolean(currentDispatcherId && currentDispatcherId === dispatcherIdForLoad));
      }
    }

    void resolveOverridePermission();
    return () => {
      cancelled = true;
    };
  }, [user, dispatcherIdForLoad]);

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
          void refreshEventsState(loadId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadId, refreshEventsState]);

  function getEventAvailability(eventType: EventType): EventAvailability {
    if (manualEditMode && canOverride) {
      return { disabled: false };
    }

    if (eventType === 'checked_in' && !completedEvents.has('arrived')) {
      return { disabled: true, reason: 'Must mark Arrived first' };
    }

    if (eventType === 'loading_started' && !completedEvents.has('checked_in')) {
      return { disabled: true, reason: 'Must mark Checked In first' };
    }

    if (eventType === 'departed' && !completedEvents.has('arrived')) {
      return { disabled: true, reason: 'Must mark Arrived first' };
    }

    return { disabled: false };
  }

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
    const availability = getEventAvailability(eventType);
    if (availability.disabled) {
      setFeedback({
        message: availability.reason ?? 'This action is blocked until prerequisite events are logged.',
        type: 'error',
      });
      setTimeout(() => setFeedback(null), 2800);
      return;
    }

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

    const { error } =
      manualEditMode && canOverride
        ? await supabase.rpc('insert_load_event_override', {
            p_load_id: loadId,
            p_event_type: eventType,
            p_timestamp: new Date().toISOString(),
            p_gps_lat: lat,
            p_gps_long: lng,
            p_note: note,
            p_override_reason: 'Fix timeline (DriverHub)',
          })
        : await supabase.rpc('insert_load_event_via_tracking', {
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
    await refreshEventsState(loadId);
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
          {canOverride && (
            <button
              type="button"
              onClick={() => setManualEditMode((prev) => !prev)}
              className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                manualEditMode
                  ? 'border-amber-500 bg-amber-50 text-amber-900'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {manualEditMode ? 'Fix timeline mode: ON' : 'Fix timeline'}
            </button>
          )}

          {ACTIONS.map(({ type, label }) => {
            const isDuplicateNext = lastEvent?.event_type === type;
            const availability = getEventAvailability(type);
            const busy = loading !== null;
            const isDisabled = busy || isDuplicateNext || availability.disabled;
            const title =
              availability.reason ??
              (isDuplicateNext ? 'Same as your last log — use the next step when it happens' : undefined);
            return (
              <div key={type}>
                <button
                  type="button"
                  onClick={() => void logEvent(type)}
                  disabled={isDisabled}
                  title={title}
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
