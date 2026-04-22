import { supabase } from './supabase';
import type { LoadEvent } from '../types/load-events';

export interface DetentionResult {
  arrivalTime: Date | null;
  checkInTime: Date | null;
  detentionStart: Date | null;
  billableHours: number;
  revenue: number;
  isActive: boolean;
  configUsed: { freeTimeHours: number; ratePerHour: number };
}

export interface DetentionConfig {
  freeTimeHours: number;
  ratePerHour: number;
}

const DEFAULT_CONFIG: DetentionConfig = {
  freeTimeHours: 2,
  ratePerHour: 75,
};

/**
 * Calculate detention based on load_events for a given load.
 * @param loadId - The UUID of the load
 * @param overrideConfig - Optional override for free time and rate (takes precedence over load config)
 * @param now - Optional current timestamp (defaults to new Date())
 */
export async function calculateDetention(
  loadId: string,
  overrideConfig: Partial<DetentionConfig> = {},
  now: Date = new Date()
): Promise<DetentionResult> {
  const { data: load, error: loadError } = await supabase
    .from('loads')
    .select('free_time_hours, rate_per_hour')
    .eq('id', loadId)
    .single();

  if (loadError || !load) {
    console.error('Failed to fetch load config:', loadError);
    return computeDetention(
      loadId,
      {
        freeTimeHours: overrideConfig.freeTimeHours ?? DEFAULT_CONFIG.freeTimeHours,
        ratePerHour: overrideConfig.ratePerHour ?? DEFAULT_CONFIG.ratePerHour,
      },
      now
    );
  }

  const config: DetentionConfig = {
    freeTimeHours: overrideConfig.freeTimeHours ?? load.free_time_hours,
    ratePerHour: overrideConfig.ratePerHour ?? load.rate_per_hour,
  };

  return computeDetention(loadId, config, now);
}

async function computeDetention(
  loadId: string,
  config: DetentionConfig,
  now: Date
): Promise<DetentionResult> {
  const { freeTimeHours, ratePerHour } = config;
  const { data: events, error } = await supabase
    .from('load_events')
    .select('*')
    .eq('load_id', loadId)
    .order('timestamp', { ascending: true });

  if (error || !events) {
    console.error('Failed to fetch load_events:', error);
    return {
      arrivalTime: null,
      checkInTime: null,
      detentionStart: null,
      billableHours: 0,
      revenue: 0,
      isActive: false,
      configUsed: config,
    };
  }

  const arrivalEvent = events.find((e: LoadEvent) => e.event_type === 'arrived');
  const arrivalTime = arrivalEvent ? new Date(arrivalEvent.timestamp) : null;
  const checkInEvent = events.find((e: LoadEvent) => e.event_type === 'checked_in');
  const checkInTime = checkInEvent ? new Date(checkInEvent.timestamp) : null;
  const departureEvent = events.find((e: LoadEvent) => e.event_type === 'departed');
  const departureTime = departureEvent ? new Date(departureEvent.timestamp) : null;

  if (!arrivalTime) {
    return {
      arrivalTime: null,
      checkInTime: checkInTime || null,
      detentionStart: null,
      billableHours: 0,
      revenue: 0,
      isActive: false,
      configUsed: config,
    };
  }

  const stopTime = departureTime || now;
  const isActive = !departureTime;
  const detentionStart = new Date(arrivalTime.getTime() + freeTimeHours * 60 * 60 * 1000);

  let billableHours = 0;
  if (stopTime > detentionStart) {
    const diffMs = stopTime.getTime() - detentionStart.getTime();
    billableHours = Math.max(0, diffMs / (1000 * 60 * 60));
  }

  const revenue = billableHours * ratePerHour;

  return {
    arrivalTime,
    checkInTime: checkInTime || null,
    detentionStart,
    billableHours,
    revenue,
    isActive,
    configUsed: config,
  };
}
