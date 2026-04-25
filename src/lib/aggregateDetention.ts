import { supabase } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateDetention } from './detentionUtils';
import type { Database } from './database.types';

export interface LoadDetentionSummary {
  loadId: string;
  loadNumber: string;
  arrivalTime: Date | null;
  departureTime: Date | null;
  freeTimeHours: number;
  ratePerHour: number;
  detentionHours: number;
  detentionAmount: number;
  isActive: boolean;
}

export interface DetentionAggregation {
  totalDetentionAmount: number;
  activeDetentionAmount: number;
  perLoad: LoadDetentionSummary[];
}

interface AggregateDetentionOptions {
  supabaseClient?: SupabaseClient<Database>;
  dispatcherId?: string;
}

/**
 * Aggregates detention revenue across all loads.
 * Uses pure calculateDetention per load.
 */
export async function aggregateDetentionRevenue(
  options: AggregateDetentionOptions = {}
): Promise<DetentionAggregation> {
  const supabaseClient = options.supabaseClient ?? supabase;

  // 1. Fetch all loads with their config
  let loadsQuery = supabaseClient.from('loads').select('id, load_number, free_time_hours, rate_per_hour');
  if (options.dispatcherId) {
    loadsQuery = loadsQuery.eq('dispatcher_id', options.dispatcherId);
  }
  const { data: loads, error: loadsError } = await loadsQuery;

  if (loadsError || !loads) {
    throw new Error('Failed to fetch loads');
  }

  // 2. For each load, fetch its arrival and departure events
  const perLoadSummaries: LoadDetentionSummary[] = await Promise.all(
    loads.map(async (load) => {
      // Fetch first 'arrived' and first 'departed' events for this load
      const { data: events, error: eventsError } = await supabaseClient
        .from('load_events')
        .select('event_type, timestamp')
        .eq('load_id', load.id)
        .in('event_type', ['arrived', 'departed'])
        .order('timestamp', { ascending: true });

      if (eventsError) {
        console.error(`Error fetching events for load ${load.id}:`, eventsError);
        return {
          loadId: load.id,
          loadNumber: load.load_number,
          arrivalTime: null,
          departureTime: null,
          freeTimeHours: load.free_time_hours,
          ratePerHour: load.rate_per_hour,
          detentionHours: 0,
          detentionAmount: 0,
          isActive: false,
        };
      }

      const arrivalEvent = events?.find((e) => e.event_type === 'arrived');
      const departureEvent = events?.find((e) => e.event_type === 'departed');

      const arrivalTime = arrivalEvent ? new Date(arrivalEvent.timestamp) : null;
      const departureTime = departureEvent ? new Date(departureEvent.timestamp) : null;

      let detentionHours = 0;
      let detentionAmount = 0;
      let isActive = false;

      if (arrivalTime) {
        const result = calculateDetention({
          arrivalTime,
          departureTime: departureTime ?? undefined,
          freeTimeHours: load.free_time_hours,
          ratePerHour: load.rate_per_hour,
        });
        detentionHours = result.detentionHours;
        detentionAmount = result.detentionAmount;
        isActive = !departureTime;
      }

      return {
        loadId: load.id,
        loadNumber: load.load_number,
        arrivalTime,
        departureTime,
        freeTimeHours: load.free_time_hours,
        ratePerHour: load.rate_per_hour,
        detentionHours,
        detentionAmount,
        isActive,
      };
    })
  );

  const totalDetentionAmount = perLoadSummaries.reduce((sum, l) => sum + l.detentionAmount, 0);
  const activeDetentionAmount = perLoadSummaries
    .filter((l) => l.isActive)
    .reduce((sum, l) => sum + l.detentionAmount, 0);

  return {
    totalDetentionAmount: Number(totalDetentionAmount.toFixed(2)),
    activeDetentionAmount: Number(activeDetentionAmount.toFixed(2)),
    perLoad: perLoadSummaries,
  };
}
