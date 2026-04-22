import { supabase } from './supabase';

export interface DetentionResult {
  arrivalTime: Date | null;
  checkInTime: Date | null;
  detentionStart: Date | null;
  billableHours: number;
  revenue: number;
  isActive: boolean; // true if load hasn't departed yet
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
 * @param config - Optional override for free time and rate
 * @param now - Optional current timestamp (defaults to new Date())
 */
export async function calculateDetention(
  loadId: string,
  config: Partial<DetentionConfig> = {},
  now: Date = new Date()
): Promise<DetentionResult> {
  const { freeTimeHours, ratePerHour } = { ...DEFAULT_CONFIG, ...config };

  // Fetch all events for this load, sorted by timestamp
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
    };
  }

  // Find first 'arrived' event
  const arrivalEvent = events.find((e) => e.event_type === 'arrived');
  const arrivalTime = arrivalEvent ? new Date(arrivalEvent.timestamp) : null;

  // Find first 'checked_in' event (could be after arrival)
  const checkInEvent = events.find((e) => e.event_type === 'checked_in');
  const checkInTime = checkInEvent ? new Date(checkInEvent.timestamp) : null;

  // Find departure event (if any)
  const departureEvent = events.find((e) => e.event_type === 'departed');
  const departureTime = departureEvent ? new Date(departureEvent.timestamp) : null;

  // No arrival -> no detention
  if (!arrivalTime) {
    return {
      arrivalTime: null,
      checkInTime: checkInTime || null,
      detentionStart: null,
      billableHours: 0,
      revenue: 0,
      isActive: false,
    };
  }

  // Determine the effective "stop time" for detention:
  // - If departed, use departureTime
  // - Otherwise use current time (now)
  const stopTime = departureTime || now;
  const isActive = !departureTime;

  // Calculate detention start = arrival + freeTimeHours
  const detentionStart = new Date(arrivalTime.getTime() + freeTimeHours * 60 * 60 * 1000);

  // If stop time is before detention start -> 0 billable hours
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
  };
}
