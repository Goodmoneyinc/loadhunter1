import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getDispatcherId } from '@/lib/dispatcher';
import { supabase } from '@/lib/supabase';

interface RevenueHeaderMetrics {
  todaysRevenue: number;
  weeklyRevenue: number;
  activeLoads: number;
}

function startOfTodayIso(now: Date): string {
  const localStart = new Date(now);
  localStart.setHours(0, 0, 0, 0);
  return localStart.toISOString();
}

function startOfWeekIso(now: Date): string {
  const localStart = new Date(now);
  const day = localStart.getDay();
  const diff = day === 0 ? 6 : day - 1;
  localStart.setDate(localStart.getDate() - diff);
  localStart.setHours(0, 0, 0, 0);
  return localStart.toISOString();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function useCountUp(target: number, durationMs = 700): number {
  const [displayValue, setDisplayValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    startRef.current = null;
    fromRef.current = displayValue;
    const toValue = target;
    let frameId = 0;

    const tick = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = fromRef.current + (toValue - fromRef.current) * eased;
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
    // displayValue intentionally omitted to avoid restarting animation every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return displayValue;
}

function calculateDetentionAmount(
  arrivalTime: string | null,
  departureTime: string | null,
  freeTimeHours: number,
  ratePerHour: number
): number {
  if (!arrivalTime || !departureTime) return 0;
  const arrival = new Date(arrivalTime);
  if (Number.isNaN(arrival.getTime())) return 0;
  const departure = new Date(departureTime);
  if (Number.isNaN(departure.getTime())) return 0;

  const elapsedHours = (departure.getTime() - arrival.getTime()) / (1000 * 60 * 60);
  const detentionHours = Math.max(0, elapsedHours - freeTimeHours);
  if (detentionHours <= 0) return 0;
  return detentionHours * ratePerHour;
}

export default function DetentionRevenueHeader() {
  const { user, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<RevenueHeaderMetrics>({
    todaysRevenue: 0,
    weeklyRevenue: 0,
    activeLoads: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!user) {
      setMetrics({ todaysRevenue: 0, weeklyRevenue: 0, activeLoads: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dispatcherId = await getDispatcherId();
      if (!dispatcherId) throw new Error('Could not resolve dispatcher.');

      const { data: loads, error: loadsError } = await supabase
        .from('loads')
        .select('id, rate_per_hour, free_time_hours')
        .eq('dispatcher_id', dispatcherId);

      if (loadsError) throw new Error(loadsError.message);
      if (!loads || loads.length === 0) {
        setMetrics({ todaysRevenue: 0, weeklyRevenue: 0, activeLoads: 0 });
        return;
      }

      const now = new Date();
      const todayStartIso = startOfTodayIso(now);
      const weekStartIso = startOfWeekIso(now);
      const loadById = new Map(loads.map((load) => [load.id, load]));
      const loadIds = loads.map((load) => load.id);

      const { data: events, error: eventsError } = await supabase
        .from('detention_events')
        .select('load_id, arrival_time, departure_time')
        .in('load_id', loadIds);

      if (eventsError) throw new Error(eventsError.message);

      const aggregateByLoad = new Map<string, { firstArrivalTime: string | null; lastDepartureTime: string | null }>();
      (events ?? []).forEach((event) => {
        const entry = aggregateByLoad.get(event.load_id) ?? { firstArrivalTime: null, lastDepartureTime: null };

        if (event.arrival_time) {
          const arrivalMs = new Date(event.arrival_time).getTime();
          const existingArrivalMs = entry.firstArrivalTime ? new Date(entry.firstArrivalTime).getTime() : Number.POSITIVE_INFINITY;
          if (!Number.isNaN(arrivalMs) && arrivalMs < existingArrivalMs) {
            entry.firstArrivalTime = event.arrival_time;
          }
        }

        if (event.departure_time) {
          const departureMs = new Date(event.departure_time).getTime();
          const existingDepartureMs = entry.lastDepartureTime ? new Date(entry.lastDepartureTime).getTime() : Number.NEGATIVE_INFINITY;
          if (!Number.isNaN(departureMs) && departureMs > existingDepartureMs) {
            entry.lastDepartureTime = event.departure_time;
          }
        }

        aggregateByLoad.set(event.load_id, entry);
      });

      let todaysRevenue = 0;
      let weeklyRevenue = 0;
      let activeLoads = 0;

      aggregateByLoad.forEach((timeline, loadId) => {
        const load = loadById.get(loadId);
        if (!load) return;

        if (timeline.firstArrivalTime && !timeline.lastDepartureTime) {
          activeLoads += 1;
          return;
        }

        const revenue = calculateDetentionAmount(
          timeline.firstArrivalTime,
          timeline.lastDepartureTime,
          load.free_time_hours ?? 0,
          load.rate_per_hour ?? 0
        );

        if (revenue <= 0 || !timeline.lastDepartureTime) return;

        const departureMs = new Date(timeline.lastDepartureTime).getTime();
        if (Number.isNaN(departureMs)) return;

        if (departureMs >= new Date(todayStartIso).getTime()) {
          todaysRevenue += revenue;
        }
        if (departureMs >= new Date(weekStartIso).getTime()) {
          weeklyRevenue += revenue;
        }
      });

      setMetrics({
        todaysRevenue: Number(todaysRevenue.toFixed(2)),
        weeklyRevenue: Number(weeklyRevenue.toFixed(2)),
        activeLoads,
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load detention revenue header');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const scheduleRefetch = useCallback(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      void fetchMetrics();
    }, 350);
  }, [fetchMetrics]);

  useEffect(() => {
    if (authLoading) return;
    void fetchMetrics();
  }, [authLoading, fetchMetrics]);

  useEffect(() => {
    if (authLoading || !user) return;

    const channel = supabase
      .channel('detention-revenue-header')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detention_events' }, scheduleRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loads' }, scheduleRefetch)
      .subscribe();

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [authLoading, scheduleRefetch, user]);

  const animatedToday = useCountUp(metrics.todaysRevenue);
  const animatedWeek = useCountUp(metrics.weeklyRevenue);
  const animatedActive = useCountUp(metrics.activeLoads, 550);

  const cards = useMemo(
    () => [
      {
        value: loading ? '...' : formatCurrency(animatedToday),
        label: "Today's Detention Revenue",
        valueClass: 'text-[#FFB067]',
      },
      {
        value: loading ? '...' : formatCurrency(animatedWeek),
        label: "This Week's Revenue",
        valueClass: 'text-emerald-300',
      },
      {
        value: loading ? '...' : Math.round(animatedActive).toLocaleString(),
        label: 'Active Loads Accumulating Detention',
        valueClass: 'text-white',
      },
    ],
    [animatedActive, animatedToday, animatedWeek, loading]
  );

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F0F0F] overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="px-5 py-5 md:px-6 md:py-6 border-b md:border-b-0 md:border-r border-white/10 last:border-b-0 md:last:border-r-0"
          >
            <p className={`text-3xl md:text-4xl font-black tracking-tight ${card.valueClass}`}>{card.value}</p>
            <p className="text-xs md:text-sm text-gray-400 mt-1 uppercase tracking-wide">{card.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="px-5 py-3 border-t border-red-500/30 bg-red-950/20 text-red-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => void fetchMetrics()} className="text-xs text-[#FF6B00] hover:underline">
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
