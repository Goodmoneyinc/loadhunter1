export interface DetentionInput {
  arrivalTime: Date | string; // Required: when driver arrived
  departureTime?: Date | string | null; // Optional: when driver left (null/undefined = still active)
  freeTimeHours: number; // Default 2 hours, but caller provides
  ratePerHour: number; // Default $75, but caller provides
}

export interface DetentionResult {
  detentionHours: number; // Billable hours (rounded to 2 decimals)
  detentionAmount: number; // Revenue in dollars (rounded to 2 decimals)
}

/**
 * Calculate detention hours and revenue for a load.
 *
 * @param input - DetentionInput with arrival, optional departure, free time, and rate.
 * @returns DetentionResult with billable hours and amount.
 *
 * @example
 * // Example 1: Load that has departed
 * const result1 = calculateDetention({
 *   arrivalTime: '2025-04-25T08:00:00Z',
 *   departureTime: '2025-04-25T14:30:00Z', // 6.5 hours later
 *   freeTimeHours: 2,
 *   ratePerHour: 75
 * });
 * // detentionHours = (6.5 - 2) = 4.5
 * // detentionAmount = 337.5
 *
 * // Example 2: Load still active (no departure)
 * const result2 = calculateDetention({
 *   arrivalTime: '2025-04-25T10:00:00Z',
 *   departureTime: null, // still on site
 *   freeTimeHours: 2,
 *   ratePerHour: 75
 * });
 * // Uses current time (e.g., 15:30 same day -> 5.5 hours)
 * // detentionHours = 3.5, detentionAmount = 262.5
 *
 * // Example 3: Within free time
 * const result3 = calculateDetention({
 *   arrivalTime: '2025-04-25T12:00:00Z',
 *   departureTime: '2025-04-25T13:30:00Z', // only 1.5 hours
 *   freeTimeHours: 2,
 *   ratePerHour: 75
 * });
 * // detentionHours = 0, detentionAmount = 0
 */
export function calculateDetention(input: DetentionInput): DetentionResult {
  const { arrivalTime, departureTime, freeTimeHours, ratePerHour } = input;

  // Validate required inputs
  if (!arrivalTime) {
    throw new Error('arrivalTime is required');
  }
  if (freeTimeHours < 0) {
    throw new Error('freeTimeHours cannot be negative');
  }
  if (ratePerHour < 0) {
    throw new Error('ratePerHour cannot be negative');
  }

  // Convert to Date objects (handles string or Date)
  const arrival = new Date(arrivalTime);
  if (Number.isNaN(arrival.getTime())) {
    throw new Error('Invalid arrivalTime');
  }

  // Use current time if no departure
  let departure = departureTime ? new Date(departureTime) : new Date();
  if (departureTime && Number.isNaN(departure.getTime())) {
    throw new Error('Invalid departureTime');
  }

  // Ensure departure is not before arrival (clamp to arrival if needed)
  if (departure < arrival) {
    departure = arrival;
  }

  // Total time in hours
  const totalMs = departure.getTime() - arrival.getTime();
  const totalHours = totalMs / (1000 * 60 * 60);

  // Billable hours = max(0, total - free)
  const detentionHours = Math.max(0, totalHours - freeTimeHours);
  const detentionAmount = detentionHours * ratePerHour;

  // Return rounded to 2 decimal places
  return {
    detentionHours: Number(detentionHours.toFixed(2)),
    detentionAmount: Number(detentionAmount.toFixed(2)),
  };
}
