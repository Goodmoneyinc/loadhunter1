'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DollarSign, Radio, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getDispatcherId } from '@/lib/dispatcher';
import { getDetentionScoreboardData, type DetentionScoreboardData } from '@/lib/detentionScoreboard';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';

export function DetentionScoreboard() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DetentionScoreboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const dispatcherId = await getDispatcherId();
      if (!dispatcherId) {
        setError('Could not resolve dispatcher.');
        setData(null);
        return;
      }
      const next = await getDetentionScoreboardData({ dispatcherId });
      setData(next);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to load scoreboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const scheduleRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void fetchData();
    }, 450);
  }, [fetchData]);

  useEffect(() => {
    if (authLoading) return;
    void fetchData();
  }, [authLoading, fetchData]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('detention-scoreboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detention_events' }, scheduleRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loads' }, scheduleRefetch)
      .subscribe();

    const tick = window.setInterval(() => void fetchData(), 30_000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
      window.clearInterval(tick);
    };
  }, [user, fetchData, scheduleRefetch]);

  if (authLoading || loading) {
    return (
      <div className="grid animate-pulse gap-4 md:grid-cols-3">
        <div className="md:col-span-2 h-24 rounded-2xl bg-slate-200/80" />
        <div className="h-24 rounded-2xl bg-slate-200/60" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
        <button type="button" className="ml-3 underline" onClick={() => void fetchData()}>
          Retry
        </button>
      </div>
    );
  }

  const total = data?.totalDetentionRevenue ?? 0;
  const active = data?.activeDetentionLoads ?? 0;
  const today = data?.todaysRevenue ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-3 md:items-stretch">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-700/30 bg-gradient-to-br from-emerald-700 to-emerald-900 p-5 text-white shadow-lg md:col-span-2 md:p-6">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="flex items-center gap-2 text-emerald-100">
          <DollarSign className="h-5 w-5 shrink-0" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider">Detention captured</span>
        </div>
        <p className="mt-2 text-3xl font-black tabular-nums tracking-tight sm:text-4xl md:text-5xl">
          {formatCurrency(total)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-100/90">
          <span className="inline-flex items-center gap-1">
            <Radio className="h-3.5 w-3.5" aria-hidden />
            Live updates
          </span>
          <span>Loads + detention events</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active loads</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-700">{active}</p>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">Generating detention now</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            Revenue today
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">{formatCurrency(today)}</p>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">From detention rows created today</p>
        </div>
      </div>
    </div>
  );
}
