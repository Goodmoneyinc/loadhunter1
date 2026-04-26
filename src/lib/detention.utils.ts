import type { LoadEvent } from '@/types/load-events';

/** Minimal event shape for detention math (full `LoadEvent` rows are accepted). */
export type DetentionCalculationEvent = Pick<LoadEvent, 'event_type' | 'timestamp'>;

export interface LoadWithDetentionConfig {
  free_time_hours: number;
  rate_per_hour: number;
}

export interface DetentionFromEventsResult {
  detention_hours: number;
  detention_amount: number;
}

function eventTimeMs(e: DetentionCalculationEvent): number {
  return new Date(e.timestamp).getTime();
}

/**
 * Calculate detention hours and amount based on arrival/departure events and load config.
 * Uses first `arrived` and last `departed` by timestamp when multiple exist.
 *
 * @param load - Object containing free_time_hours and rate_per_hour
 * @param events - Array of load events (must include `arrived` and `departed` for non-zero detention)
 *
 * @example
 * ```ts
 * const load = { free_time_hours: 2, rate_per_hour: 75 };
 * const events = [
 *   { event_type: 'arrived', timestamp: '2025-04-23T10:00:00Z' },
 *   { event_type: 'departed', timestamp: '2025-04-23T15:30:00Z' },
 * ];
 * calculateDetention(load, events);
 * // { detention_hours: 3.5, detention_amount: 262.5 }  // 5.5h dwell − 2h free = 3.5h × $75
 * ```
 */
export function calculateDetention(
  load: LoadWithDetentionConfig,
  events: ReadonlyArray<DetentionCalculationEvent>
): DetentionFromEventsResult {
  const sorted = [...events].sort((a, b) => eventTimeMs(a) - eventTimeMs(b));

  const arrivalEvent = sorted.find((e) => e.event_type === 'arrived');
  const departureEvent = [...sorted].reverse().find((e) => e.event_type === 'departed');

  if (!arrivalEvent || !departureEvent) {
    return { detention_hours: 0, detention_amount: 0 };
  }

  const diffMs = eventTimeMs(departureEvent) - eventTimeMs(arrivalEvent);
  const totalHours = diffMs / (1000 * 60 * 60);

  const freeHours = load.free_time_hours ?? 2;
  const rate = load.rate_per_hour ?? 75;

  const detentionHours = Math.max(0, totalHours - freeHours);
  const detentionAmount = detentionHours * rate;

  return {
    detention_hours: detentionHours,
    detention_amount: detentionAmount,
  };
}
