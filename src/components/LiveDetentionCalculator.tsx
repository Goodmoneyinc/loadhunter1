'use client';

import { useCallback, useEffect, useState } from 'react';
import { DollarSign, Timer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLiveDetentionCalculator } from '@/hooks/useLiveDetentionCalculator';

const MS_PER_HOUR = 3_600_000;

export interface LiveDetentionCalculatorProps {
  loadId: string;
}

function formatHMS(totalMs: number): string {
  const sec = Math.max(0, Math.floor(totalMs / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}`;
}

export function LiveDetentionCalculator({ loadId }: LiveDetentionCalculatorProps) {
  const [freeTimeHours, setFreeTimeHours] = useState<number>(2);
  const [ratePerHour, setRatePerHour] = useState<number>(75);
  const [arrivalTime, setArrivalTime] = useState<string | null>(null);
  const [departureTime, setDepartureTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);

    const { data: loadRow, error: loadErr } = await supabase
      .from('loads')
      .select('free_time_hours, rate_per_hour')
      .eq('id', loadId)
      .maybeSingle();

    if (loadErr) {
      setError(loadErr.message);
      setLoading(false);
      return;
    }
    if (!loadRow) {
      setError('Load not found');
      setLoading(false);
      return;
    }

    setFreeTimeHours(loadRow.free_time_hours ?? 2);
    setRatePerHour(loadRow.rate_per_hour ?? 75);

    const { data: detentionRow, error: detErr } = await supabase
      .from('detention_events')
      .select('arrival_time, departure_time')
      .eq('load_id', loadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (detErr) {
      setError(detErr.message);
      setLoading(false);
      return;
    }

    setArrivalTime(detentionRow?.arrival_time ?? null);
    setDepartureTime(detentionRow?.departure_time ?? null);
    setLoading(false);
  }, [loadId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const ch = supabase
      .channel(`live-detention:${loadId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'detention_events', filter: `load_id=eq.${loadId}` },
        () => {
          void refresh({ silent: true });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'loads', filter: `id=eq.${loadId}` },
        () => {
          void refresh({ silent: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [loadId, refresh]);

  const { formatted_detention_amount, current_billable_hours } = useLiveDetentionCalculator({
    arrival_time: arrivalTime,
    departure_time: departureTime,
    free_time_hours: freeTimeHours,
    rate_per_hour: ratePerHour,
  });

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-8">
        <div className="mx-auto h-8 w-48 rounded bg-slate-200" />
        <div className="mx-auto mt-4 h-12 w-64 rounded bg-slate-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
        {error}
        <button type="button" className="mt-3 block w-full text-sm underline" onClick={() => void refresh()}>
          Retry
        </button>
      </div>
    );
  }

  if (!arrivalTime) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-lg font-semibold text-slate-700">Not started</p>
        <p className="mt-2 text-sm text-slate-500">
          No arrival time yet. Detention tracking begins when arrival is recorded for this load.
        </p>
      </div>
    );
  }

  const arrivalMs = new Date(arrivalTime).getTime();
  const endMs = departureTime ? new Date(departureTime).getTime() : Date.now();
  const freeEndMs = arrivalMs + freeTimeHours * MS_PER_HOUR;
  const onSiteMs = Math.max(0, endMs - arrivalMs);
  const freeRemainingMs = Math.max(0, freeEndMs - endMs);
  const inFreePeriod = endMs <= freeEndMs;
  const detentionActive = current_billable_hours > 0;
  const detentionBillingMs = detentionActive ? Math.max(0, endMs - freeEndMs) : 0;
  const completed = Boolean(departureTime);

  return (
    <div
      className={`rounded-2xl border-2 p-6 shadow-lg transition-colors md:p-8 ${
        detentionActive && !completed
          ? 'border-red-500 bg-gradient-to-b from-red-50 to-white ring-2 ring-red-200/80'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Timer
            className={`h-6 w-6 ${detentionActive && !completed ? 'text-red-600' : 'text-slate-600'}`}
            aria-hidden
          />
          <h3 className={`text-lg font-bold ${detentionActive && !completed ? 'text-red-900' : 'text-slate-900'}`}>
            Live detention
          </h3>
        </div>
        {completed && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Completed</span>
        )}
      </div>

      <div className="mt-6 space-y-6">
        {inFreePeriod && !completed && (
          <div>
            <p className="text-sm font-medium text-emerald-800">Free time remaining</p>
            <p className="mt-1 font-mono text-4xl font-black tabular-nums tracking-tight text-emerald-900 md:text-5xl">
              {formatHMS(freeRemainingMs)}
            </p>
            <p className="mt-2 text-xs text-emerald-700/90">
              {freeTimeHours}h free · no detention charges until this reaches zero
            </p>
          </div>
        )}

        {detentionActive && (
          <div
            className={
              !completed ? 'rounded-xl border border-red-200 bg-red-50/90 p-4' : 'rounded-xl border border-slate-200 bg-slate-50 p-4'
            }
          >
            <p
              className={`text-sm font-semibold uppercase tracking-wide ${
                !completed ? 'text-red-800' : 'text-slate-700'
              }`}
            >
              {completed ? 'Detention period (final)' : 'Detention started'}
            </p>
            <p
              className={`mt-2 font-mono text-4xl font-black tabular-nums tracking-tight md:text-5xl ${
                !completed ? 'text-red-700' : 'text-slate-800'
              }`}
            >
              {formatHMS(detentionBillingMs)}
            </p>
            <p className="mt-1 text-xs text-slate-600">Billable detention clock (after free time)</p>
          </div>
        )}

        {!detentionActive && inFreePeriod && !completed && (
          <p className="text-center text-sm text-slate-500">Amount owed: $0.00 until free time elapses</p>
        )}

        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-6 ${
            detentionActive && !completed
              ? 'border-red-300 bg-red-100/80'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 text-slate-600">
            <DollarSign className="h-5 w-5" aria-hidden />
            <span className="text-sm font-medium uppercase tracking-wide">Live amount</span>
          </div>
          <p
            className={`font-mono text-4xl font-black tabular-nums md:text-5xl ${
              detentionActive && !completed ? 'text-red-700' : 'text-slate-900'
            }`}
          >
            {formatted_detention_amount}
          </p>
          <p className="text-center text-xs text-slate-500">
            {ratePerHour.toFixed(2)} USD/h · {freeTimeHours}h free · on site {formatHMS(onSiteMs)} total
          </p>
        </div>
      </div>

      {detentionActive && !completed && (
        <p className="mt-4 text-center text-xs font-medium text-red-700">
          Billing in real time — amount increases every second while detention is active.
        </p>
      )}
    </div>
  );
}
