import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { supabase } from './supabase';

type ScoreboardLoad = Pick<
  Database['public']['Tables']['loads']['Row'],
  'id' | 'free_time_hours' | 'rate_per_hour'
>;

type ScoreboardDetentionEvent = Pick<
  Database['public']['Tables']['detention_events']['Row'],
  'load_id' | 'arrival_time' | 'departure_time' | 'created_at'
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

function calculateDetentionAmount(
  arrivalTime: string,
  departureTime: string | null,
  freeTimeHours: number,
  ratePerHour: number,
  now: Date
): { detentionHours: number; detentionAmount: number; isActive: boolean } {
  const arrival = new Date(arrivalTime);
  if (Number.isNaN(arrival.getTime())) {
    return { detentionHours: 0, detentionAmount: 0, isActive: false };
  }

  const resolvedDeparture = departureTime ? new Date(departureTime) : now;
  if (Number.isNaN(resolvedDeparture.getTime())) {
    return { detentionHours: 0, detentionAmount: 0, isActive: false };
  }

  const diffHours = Math.max(0, (resolvedDeparture.getTime() - arrival.getTime()) / (1000 * 60 * 60));
  const detentionHours = Math.max(0, diffHours - freeTimeHours);
  const detentionAmount = detentionHours * ratePerHour;

  return {
    detentionHours,
    detentionAmount,
    isActive: !departureTime,
  };
}

/**
 * Computes detention scoreboard aggregates for a dispatcher.
 * Uses `loads` + latest `detention_events` row per load.
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

  const { data: detentionEvents, error: eventsError } = await supabaseClient
    .from('detention_events')
    .select('load_id, arrival_time, departure_time, created_at')
    .in('load_id', loadIds);

  if (eventsError || !detentionEvents) {
    throw new Error('Failed to fetch detention events for detention scoreboard');
  }

  // Keep latest detention row per load by created_at.
  const latestEventByLoad = new Map<string, ScoreboardDetentionEvent>();
  detentionEvents.forEach((event: ScoreboardDetentionEvent) => {
    const existing = latestEventByLoad.get(event.load_id);
    if (!existing || new Date(event.created_at).getTime() > new Date(existing.created_at).getTime()) {
      latestEventByLoad.set(event.load_id, event);
    }
  });

  let totalDetentionRevenue = 0;
  let activeDetentionLoads = 0;
  let todaysRevenue = 0;

  latestEventByLoad.forEach((event, loadId) => {
    if (!event.arrival_time) return;
    const load = loadById.get(loadId);
    if (!load) return;

    const { detentionHours, detentionAmount, isActive } = calculateDetentionAmount(
      event.arrival_time,
      event.departure_time,
      load.free_time_hours,
      load.rate_per_hour,
      now
    );

    totalDetentionRevenue += detentionAmount;
    if (isActive && detentionHours > 0) {
      activeDetentionLoads += 1;
    }
    if (event.created_at.slice(0, 10) === todayKey) {
      todaysRevenue += detentionAmount;
    }
  });

  return {
    totalDetentionRevenue: roundCurrency(totalDetentionRevenue),
    activeDetentionLoads,
    todaysRevenue: roundCurrency(todaysRevenue),
  };
}
