import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { supabase } from './supabase';
import { calculateDetention } from './detention.utils';

type ScoreboardLoad = Pick<
  Database['public']['Tables']['loads']['Row'],
  'id' | 'free_time_hours' | 'rate_per_hour'
>;

type ScoreboardLoadEvent = Pick<
  Database['public']['Tables']['load_events']['Row'],
  'load_id' | 'event_type' | 'timestamp'
>;

export interface DetentionScoreboardData {
  totalDetentionRevenue: number;
  activeDetentionLoads: number;
  todaysRevenue: number;
}

interface GetDetentionScoreboardOptions {
  dispatcherId: string;
  supabaseClient?: SupabaseClient<Database>;
  now?: Date;
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

/**
 * Computes detention scoreboard aggregates for a dispatcher.
 * Uses `loads` + `load_events` (first arrived / last departed) and
 * shared detention math from `detention.utils`.
 */
export async function getDetentionScoreboardData(
  options: GetDetentionScoreboardOptions
): Promise<DetentionScoreboardData> {
  const supabaseClient = options.supabaseClient ?? supabase;
  const now = options.now ?? new Date();
  const todayKey = now.toISOString().slice(0, 10);

  const { data: loads, error: loadsError } = await supabaseClient
    .from('loads')
    .select('id, free_time_hours, rate_per_hour')
    .eq('dispatcher_id', options.dispatcherId);

  if (loadsError || !loads) {
    throw new Error('Failed to fetch loads for detention scoreboard');
  }

  if (loads.length === 0) {
    return { totalDetentionRevenue: 0, activeDetentionLoads: 0, todaysRevenue: 0 };
  }

  const loadIds = loads.map((load) => load.id);
  const loadById = new Map(loads.map((load: ScoreboardLoad) => [load.id, load]));

  const { data: loadEvents, error: eventsError } = await supabaseClient
    .from('load_events')
    .select('load_id, event_type, timestamp')
    .in('load_id', loadIds);

  if (eventsError || !loadEvents) {
    throw new Error('Failed to fetch load events for detention scoreboard');
  }

  const eventsByLoad = new Map<string, ScoreboardLoadEvent[]>();
  loadEvents.forEach((event: ScoreboardLoadEvent) => {
    const list = eventsByLoad.get(event.load_id) ?? [];
    list.push(event);
    eventsByLoad.set(event.load_id, list);
  });

  let totalDetentionRevenue = 0;
  let activeDetentionLoads = 0;
  let todaysRevenue = 0;

  eventsByLoad.forEach((events, loadId) => {
    const load = loadById.get(loadId);
    if (!load) return;

    const sorted = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const arrival = sorted.find((e) => e.event_type === 'arrived')?.timestamp ?? null;
    const departure = [...sorted].reverse().find((e) => e.event_type === 'departed')?.timestamp ?? null;
    if (!arrival) return;

    const { detention_hours: completedDetentionHours, detention_amount: completedDetentionAmount } = calculateDetention(
      {
        free_time_hours: load.free_time_hours,
        rate_per_hour: load.rate_per_hour,
      },
      sorted
    );

    const activeDetentionAmount = !departure
      ? Math.max(0, ((now.getTime() - new Date(arrival).getTime()) / (1000 * 60 * 60)) - load.free_time_hours) *
        load.rate_per_hour
      : 0;
    const effectiveAmount = departure ? completedDetentionAmount : activeDetentionAmount;
    const effectiveHours = departure ? completedDetentionHours : effectiveAmount / Math.max(load.rate_per_hour, 1);

    totalDetentionRevenue += effectiveAmount;
    if (!departure && effectiveHours > 0) {
      activeDetentionLoads += 1;
    }
    if (departure && departure.slice(0, 10) === todayKey) {
      todaysRevenue += effectiveAmount;
    }
  });

  return {
    totalDetentionRevenue: roundCurrency(totalDetentionRevenue),
    activeDetentionLoads,
    todaysRevenue: roundCurrency(todaysRevenue),
  };
}
