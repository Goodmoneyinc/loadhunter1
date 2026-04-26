import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getDispatcherId } from '@/lib/dispatcher';

interface DetentionEventRow {
  id: string;
  load_id: string;
  arrival_time: string | null;
  departure_time: string | null;
}

interface LoadConfigRow {
  id: string;
  free_time_hours: number | null;
  rate_per_hour: number | null;
}

const DEFAULT_FREE_TIME_HOURS = 2;
const DEFAULT_RATE_PER_HOUR = 75;
const MS_PER_HOUR = 1000 * 60 * 60;

function getTodayBounds(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

function calculateTodayDetentionAmount(
  event: DetentionEventRow,
  loadConfig: LoadConfigRow | undefined,
  nowMs: number
): number {
  if (!event.arrival_time) return 0;

  const arrivalMs = new Date(event.arrival_time).getTime();
  const departureMs = event.departure_time ? new Date(event.departure_time).getTime() : nowMs;

  if (!Number.isFinite(arrivalMs) || !Number.isFinite(departureMs) || departureMs <= arrivalMs) {
    return 0;
  }

  const freeTimeHours = loadConfig?.free_time_hours ?? DEFAULT_FREE_TIME_HOURS;
  const ratePerHour = loadConfig?.rate_per_hour ?? DEFAULT_RATE_PER_HOUR;
  const billableStartMs = arrivalMs + freeTimeHours * MS_PER_HOUR;
  const { start: dayStartMs, end: dayEndMs } = getTodayBounds(new Date(nowMs));

  const overlapStartMs = Math.max(billableStartMs, dayStartMs);
  const overlapEndMs = Math.min(departureMs, dayEndMs);

  if (overlapEndMs <= overlapStartMs) return 0;

  const billableHoursToday = (overlapEndMs - overlapStartMs) / MS_PER_HOUR;
  return billableHoursToday * ratePerHour;
}

export default function DetentionRevenueBar() {
  const [targetAmount, setTargetAmount] = useState(0);
  const [displayAmount, setDisplayAmount] = useState(0);
  const [loadsInDetention, setLoadsInDetention] = useState(0);
  const [isIncreasing, setIsIncreasing] = useState(false);

  const previousTargetRef = useRef(0);
  const displayAmountRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    displayAmountRef.current = displayAmount;
  }, [displayAmount]);

  useEffect(() => {
    const animate = () => {
      const startValue = displayAmountRef.current;
      const endValue = targetAmount;
      const durationMs = 650;
      const startedAt = performance.now();

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      const step = (timestamp: number) => {
        const elapsed = timestamp - startedAt;
        const progress = Math.min(1, elapsed / durationMs);
        const eased = 1 - Math.pow(1 - progress, 3);
        const next = startValue + (endValue - startValue) * eased;
        setDisplayAmount(next);

        if (progress < 1) {
          animationFrameRef.current = window.requestAnimationFrame(step);
        } else {
          setDisplayAmount(endValue);
        }
      };

      animationFrameRef.current = window.requestAnimationFrame(step);
    };

    if (targetAmount > previousTargetRef.current) {
      setIsIncreasing(true);
      animate();
      const timeoutId = window.setTimeout(() => setIsIncreasing(false), 1100);
      previousTargetRef.current = targetAmount;
      return () => {
        window.clearTimeout(timeoutId);
        if (animationFrameRef.current) {
          window.cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }

    setDisplayAmount(targetAmount);
    previousTargetRef.current = targetAmount;
    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetAmount]);

  useEffect(() => {
    let isMounted = true;

    async function refreshMetrics() {
      const nowMs = Date.now();
      const dispatcherId = await getDispatcherId();

      if (!dispatcherId) {
        if (!isMounted) return;
        setTargetAmount(0);
        setLoadsInDetention(0);
        return;
      }

      const { data: loadsData, error: loadsError } = await supabase
        .from('loads')
        .select('id, free_time_hours, rate_per_hour')
        .eq('dispatcher_id', dispatcherId);

      if (loadsError || !loadsData) {
        console.error('Failed loading loads for detention bar:', loadsError);
        return;
      }

      const loadConfigMap = new Map<string, LoadConfigRow>();
      for (const row of loadsData) {
        loadConfigMap.set(row.id, row);
      }

      const loadIds = loadsData.map((load) => load.id);
      if (loadIds.length === 0) {
        if (!isMounted) return;
        setTargetAmount(0);
        setLoadsInDetention(0);
        return;
      }

      const { data: eventsData, error: eventsError } = await supabase
        .from('detention_events')
        .select('id, load_id, arrival_time, departure_time')
        .in('load_id', loadIds)
        .not('arrival_time', 'is', null);

      if (eventsError || !eventsData) {
        console.error('Failed loading detention events for detention bar:', eventsError);
        return;
      }

      const total = eventsData.reduce((sum, event) => {
        return sum + calculateTodayDetentionAmount(event, loadConfigMap.get(event.load_id), nowMs);
      }, 0);

      const loadsWithDetention = new Set(
        eventsData
          .filter((event) => calculateTodayDetentionAmount(event, loadConfigMap.get(event.load_id), nowMs) > 0)
          .map((event) => event.load_id)
      );

      if (!isMounted) return;
      setTargetAmount(total);
      setLoadsInDetention(loadsWithDetention.size);
    }

    refreshMetrics();

    tickRef.current = window.setInterval(refreshMetrics, 1000);

    const channel = supabase
      .channel('detention-revenue-bar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detention_events' }, refreshMetrics)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'loads' }, refreshMetrics)
      .subscribe();

    return () => {
      isMounted = false;
      if (tickRef.current) window.clearInterval(tickRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  const formattedAmount = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(displayAmount),
    [displayAmount]
  );

  return (
    <div className="sticky top-0 z-40 rounded-xl border border-white/10 bg-[#0F0F0F]/95 backdrop-blur-md px-5 py-4 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
            Total Detention Earned Today
          </p>
          <p
            className={`text-4xl font-black font-mono tabular-nums transition-colors ${
              isIncreasing ? 'text-emerald-400' : 'text-white'
            }`}
          >
            {formattedAmount}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Loads In Detention</p>
          <p className="text-2xl font-black text-[#FF6B00] font-mono">{loadsInDetention}</p>
        </div>
      </div>
    </div>
  );
}
