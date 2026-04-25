'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { calculateDetention as calcDetentionLive } from '@/lib/detentionUtils';
import { getDispatcherId } from '@/lib/dispatcher';
import { supabase } from '@/lib/supabase';
import type { Load } from '@/types';
import { formatCurrency } from '@/lib/utils';
import LoadTimeline from '@/components/load/LoadTimeline';

type LoadRow = Pick<Load, 'id' | 'load_number' | 'free_time_hours' | 'rate_per_hour'>;

export interface DetentionRevenueRow {
  id: string;
  load_number: string;
  arrival_time: string | null;
  departure_time: string | null;
  free_time_hours: number;
  rate_per_hour: number;
  detention_hours: number;
  detention_amount: number;
  isActive: boolean;
}

function deriveArrivalDeparture(events: { event_type: string; timestamp: string }[]): {
  arrival: string | null;
  departure: string | null;
} {
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const arrival = sorted.find((e) => e.event_type === 'arrived')?.timestamp ?? null;
  const departure = [...sorted].reverse().find((e) => e.event_type === 'departed')?.timestamp ?? null;
  return { arrival, departure };
}

export interface DetentionRevenueTableProps {
  /** Parent-controlled selection (e.g. command center). When set, row clicks invoke this and the built-in timeline modal is disabled. */
  onRowSelect?: (row: DetentionRevenueRow) => void;
  /** Highlights the active row for controlled layouts */
  selectedLoadId?: string | null;
}

export function DetentionRevenueTable(props: DetentionRevenueTableProps = {}) {
  const { onRowSelect, selectedLoadId } = props;
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<DetentionRevenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timelineLoadId, setTimelineLoadId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const loadIdsRef = useRef<Set<string>>(new Set());

  const fetchRows = useCallback(async () => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dispatcherId = await getDispatcherId();
      if (!dispatcherId) {
        setError('Could not resolve dispatcher.');
        setRows([]);
        return;
      }

      const { data: loadsData, error: loadsError } = await supabase
        .from('loads')
        .select('id, load_number, free_time_hours, rate_per_hour')
        .eq('dispatcher_id', dispatcherId)
        .order('created_at', { ascending: false });

      if (loadsError) throw new Error(loadsError.message);
      if (!loadsData?.length) {
        setRows([]);
        return;
      }

      const loads = loadsData as LoadRow[];
      const loadIds = loads.map((l) => l.id);
      loadIdsRef.current = new Set(loadIds);

      const { data: evData, error: evError } = await supabase
        .from('load_events')
        .select('load_id, event_type, timestamp')
        .in('load_id', loadIds)
        .in('event_type', ['arrived', 'departed'])
        .order('timestamp', { ascending: true });

      if (evError) throw new Error(evError.message);

      const byLoad = new Map<string, { event_type: string; timestamp: string }[]>();
      for (const e of evData ?? []) {
        const list = byLoad.get(e.load_id) ?? [];
        list.push({ event_type: e.event_type, timestamp: e.timestamp });
        byLoad.set(e.load_id, list);
      }

      const next: DetentionRevenueRow[] = [];

      for (const load of loads) {
        const evs = byLoad.get(load.id) ?? [];
        const { arrival, departure } = deriveArrivalDeparture(evs);
        if (!arrival) continue;

        const isActive = !departure;
        const freeH = load.free_time_hours ?? 2;
        const rate = load.rate_per_hour ?? 75;
        const { detentionHours, detentionAmount } = calcDetentionLive({
          arrivalTime: arrival,
          departureTime: departure,
          freeTimeHours: freeH,
          ratePerHour: rate,
        });

        if (!isActive && detentionAmount <= 0) continue;

        next.push({
          id: load.id,
          load_number: load.load_number,
          arrival_time: arrival,
          departure_time: departure,
          free_time_hours: freeH,
          rate_per_hour: rate,
          detention_hours: detentionHours,
          detention_amount: detentionAmount,
          isActive,
        });
      }

      next.sort((a, b) => b.detention_amount - a.detention_amount);
      setRows(next);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load detention revenue');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void fetchRows();
  }, [authLoading, fetchRows]);

  useEffect(() => {
    const hasActive = rows.some((r) => r.isActive);
    if (!hasActive) return;

    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [rows]);

  useEffect(() => {
    const channel = supabase
      .channel('detention-revenue-table-events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'load_events' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { load_id?: string } | undefined;
          const lid = row?.load_id;
          if (lid && loadIdsRef.current.has(lid)) void fetchRows();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRows]);

  const displayRows = useMemo(() => {
    void tick;
    return rows.map((r) => {
      if (!r.isActive) return r;
      const live = calcDetentionLive({
        arrivalTime: r.arrival_time!,
        departureTime: r.departure_time,
        freeTimeHours: r.free_time_hours,
        ratePerHour: r.rate_per_hour,
      });
      return {
        ...r,
        detention_hours: live.detentionHours,
        detention_amount: live.detentionAmount,
      };
    });
  }, [rows, tick]);

  const formatWhen = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <div className="h-8 w-1/3 rounded bg-slate-200" />
        <div className="h-12 w-full rounded bg-slate-100" />
        <div className="h-12 w-full rounded bg-slate-100" />
        <div className="h-12 w-full rounded bg-slate-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error}
        <button type="button" className="mt-2 block font-medium underline" onClick={() => void fetchRows()}>
          Retry
        </button>
      </div>
    );
  }

  if (displayRows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
        <p className="font-medium text-slate-800">No detention revenue yet</p>
        <p className="mt-2 text-sm">
          Loads appear here after an arrival is logged, and when there is billable detention or an active visit still
          on the clock.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 md:px-6">
          <h3 className="text-base font-semibold text-slate-900">Detention revenue</h3>
          <p className="text-xs text-slate-500">Sorted by highest amount · click a row for event timeline (proof)</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 md:px-6">Load</th>
                <th className="whitespace-nowrap px-4 py-3 md:px-6">Arrival</th>
                <th className="whitespace-nowrap px-4 py-3 md:px-6">Departure</th>
                <th className="whitespace-nowrap px-4 py-3 text-right md:px-6">Detention hrs</th>
                <th className="whitespace-nowrap px-4 py-3 text-right md:px-6">Rate / hr</th>
                <th className="whitespace-nowrap px-4 py-3 text-right md:px-6">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayRows.map((row) => (
                <tr
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (onRowSelect) {
                      onRowSelect(row);
                    } else {
                      setTimelineLoadId(row.id);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (onRowSelect) {
                        onRowSelect(row);
                      } else {
                        setTimelineLoadId(row.id);
                      }
                    }
                  }}
                  className={`cursor-pointer transition hover:bg-emerald-50/60 focus-visible:bg-emerald-50/60 focus-visible:outline-none ${
                    selectedLoadId === row.id ? 'bg-emerald-100/50' : ''
                  }`}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 md:px-6">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      #{row.load_number}
                      {row.isActive && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                          Active
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700 md:px-6">{formatWhen(row.arrival_time)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700 md:px-6">
                    {row.departure_time ? formatWhen(row.departure_time) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-800 md:px-6">
                    {row.detention_hours.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700 md:px-6">
                    {formatCurrency(row.rate_per_hour)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-emerald-800 md:px-6">
                    {formatCurrency(row.detention_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!onRowSelect && timelineLoadId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detention-timeline-title"
          onClick={() => setTimelineLoadId(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <h2 id="detention-timeline-title" className="text-lg font-semibold text-slate-900">
                Event timeline
              </h2>
              <button
                type="button"
                onClick={() => setTimelineLoadId(null)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close timeline"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <LoadTimeline loadId={timelineLoadId} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
