'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ClipboardCheck,
  LogOut,
  MapPin,
  Package,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  normalizeLoadEvent,
  normalizeLoadEvents,
  type LoadEvent,
  type LoadEventRowInput,
  type LoadEventType,
} from '@/types/load-events';

export interface LoadTimelineProps {
  /** UUID of the load — all `load_events` for this load are shown in chronological order. */
  loadId: string;
  /** Gaps longer than this (minutes) between consecutive events are highlighted as potential delays. */
  delayThresholdMinutes?: number;
}

const EVENT_LABELS: Record<LoadEventType, string> = {
  arrived: 'Arrived at facility',
  checked_in: 'Checked in',
  moved: 'Moved location',
  loading_started: 'Loading started',
  departed: 'Departed',
};

const EVENT_ICONS: Record<LoadEventType, LucideIcon> = {
  arrived: MapPin,
  checked_in: ClipboardCheck,
  moved: Truck,
  loading_started: Package,
  departed: LogOut,
};

const EVENT_ACCENT: Record<LoadEventType, string> = {
  arrived: 'bg-emerald-500 ring-emerald-500/20',
  checked_in: 'bg-sky-500 ring-sky-500/20',
  moved: 'bg-amber-500 ring-amber-500/20',
  loading_started: 'bg-violet-500 ring-violet-500/20',
  departed: 'bg-slate-700 ring-slate-700/20',
};

function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatGap(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function formatFacilityDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  if (h === 0) return `${m} min`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function findArrived(events: LoadEvent[]): LoadEvent | undefined {
  return events.find((e) => e.event_type === 'arrived');
}

function findDeparted(events: LoadEvent[]): LoadEvent | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].event_type === 'departed') return events[i];
  }
  return undefined;
}

export default function LoadTimeline({ loadId, delayThresholdMinutes = 60 }: LoadTimelineProps) {
  const [events, setEvents] = useState<LoadEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('load_events')
      .select('*')
      .eq('load_id', loadId)
      .order('timestamp', { ascending: true });

    if (fetchError) {
      console.error(fetchError);
      setError('Failed to load timeline.');
      setEvents([]);
    } else {
      setEvents(normalizeLoadEvents((data ?? []) as LoadEventRowInput[]));
    }

    setLoading(false);
  }, [loadId]);

  useEffect(() => {
    void fetchEvents();

    const channel = supabase
      .channel(`load-timeline:${loadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'load_events',
          filter: `load_id=eq.${loadId}`,
        },
        () => {
          void fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadId, fetchEvents]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="h-4 w-2/3 rounded bg-slate-200" />
        <div className="h-16 w-full rounded-lg bg-slate-100" />
        <div className="h-16 w-full rounded-lg bg-slate-100" />
        <div className="h-16 w-full rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
        <button
          type="button"
          onClick={() => void fetchEvents()}
          className="mt-3 block w-full text-sm font-medium text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 py-14 text-center text-slate-600">
        <p className="text-lg font-medium text-slate-800">No events yet</p>
        <p className="mt-2 max-w-md mx-auto text-sm text-slate-500">
          Driver updates will appear here in order — useful as a paper trail for detention billing.
        </p>
      </div>
    );
  }

  const arrived = findArrived(events);
  const departed = findDeparted(events);
  const delayMs = delayThresholdMinutes * 60_000;

  let facilitySummary: { label: string; sub?: string } | null = null;
  if (arrived) {
    const end = departed ? new Date(departed.timestamp).getTime() : Date.now();
    const start = new Date(arrived.timestamp).getTime();
    const dwell = Math.max(0, end - start);
    if (departed) {
      facilitySummary = {
        label: `Time at facility: ${formatFacilityDuration(dwell)}`,
        sub: `From arrival to departure (${formatDateTime(arrived.timestamp)} → ${formatDateTime(departed.timestamp)})`,
      };
    } else {
      facilitySummary = {
        label: `Time on site so far: ${formatFacilityDuration(dwell)}`,
        sub: `Since arrival (${formatDateTime(arrived.timestamp)}) — no departure logged yet`,
      };
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4 md:px-6">
        <h3 className="text-base font-semibold text-slate-900">Load timeline</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Chronological record of driver events · {events.length} event{events.length === 1 ? '' : 's'}
        </p>
        {facilitySummary && (
          <div className="mt-3 rounded-xl bg-slate-900 px-4 py-3 text-white">
            <p className="text-sm font-semibold tracking-tight">{facilitySummary.label}</p>
            {facilitySummary.sub && (
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{facilitySummary.sub}</p>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-6 md:px-6">
        <ol className="relative border-l border-slate-200 pl-8 md:pl-10">
          {events.map((event, index) => {
            const prev = index > 0 ? events[index - 1] : null;
            const gapMs = prev ? new Date(event.timestamp).getTime() - new Date(prev.timestamp).getTime() : 0;
            const showDelay = prev && gapMs >= delayMs;
            const Icon = EVENT_ICONS[event.event_type];
            const accent = EVENT_ACCENT[event.event_type];
            const hasGps = event.gps_lat != null && event.gps_long != null;

            return (
              <li key={event.id} className="relative pb-10 last:pb-0">
                <span
                  className={`absolute -left-8 top-1 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-md ring-4 ring-white md:-left-10 md:h-8 md:w-8 ${accent}`}
                  aria-hidden
                >
                  <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={2.5} />
                </span>

                {showDelay && (
                  <div
                    className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900"
                    role="status"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                    <div className="min-w-0 text-xs leading-snug">
                      <span className="font-semibold">Gap: {formatGap(gapMs)}</span>
                      <span className="text-amber-800/90">
                        {' '}
                        between {EVENT_LABELS[prev!.event_type]} and {EVENT_LABELS[event.event_type]} — review for
                        detention context.
                      </span>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 md:px-4 md:py-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{EVENT_LABELS[event.event_type]}</p>
                    <time
                      className="text-xs font-medium tabular-nums text-slate-500"
                      dateTime={event.timestamp}
                    >
                      {formatDateTime(event.timestamp)}
                    </time>
                  </div>
                  {event.note ? (
                    <p className="mt-2 border-t border-slate-200/80 pt-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-500">Note: </span>
                      {event.note}
                    </p>
                  ) : null}
                  {hasGps ? (
                    <p className="mt-2 font-mono text-xs text-slate-600">
                      <span className="font-sans font-medium text-slate-500">GPS: </span>
                      {event.gps_lat!.toFixed(5)}, {event.gps_long!.toFixed(5)}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">No GPS captured for this event</p>
                  )}
                  {event.timeline_override && (
                    <p className="mt-2 text-xs text-violet-700">
                      Timeline override
                      {event.override_reason ? `: ${event.override_reason}` : ''}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-center text-[11px] text-slate-500 md:px-6">
        Timestamps are shown in your local timezone. Export a formal report from the load detail actions when
        billing.
      </div>
    </div>
  );
}
