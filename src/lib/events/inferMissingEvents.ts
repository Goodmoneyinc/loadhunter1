import type { LoadEvent } from '@/types/load-events';

export interface GpsPoint {
  timestamp: Date | string;
  lat: number;
  lon: number;
}

export interface FacilityLocation {
  lat: number;
  lon: number;
}

/**
 * Calculate distance between two GPS coordinates in meters (Haversine formula)
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert ISO timestamp string to Date if needed
 */
function toDate(timestamp: Date | string): Date {
  return timestamp instanceof Date ? timestamp : new Date(timestamp);
}

/**
 * Infer missing 'arrived' and 'checked_in' events.
 * @param events - Existing load_events (array of LoadEvent-like objects)
 * @param gpsData - Array of GPS points with timestamps
 * @param facility - Optional facility coordinates (lat, lon) to filter "near facility"
 * @param radiusMeters - Radius to consider "near facility" (default 100m)
 * @returns A new event array with inferred events inserted where missing
 */
export function inferMissingEvents(
  events: Partial<LoadEvent>[],
  gpsData: GpsPoint[],
  facility?: FacilityLocation,
  radiusMeters: number = 100
): Partial<LoadEvent>[] {
  const sortedEvents = [...events].sort(
    (a, b) => toDate(a.timestamp!).getTime() - toDate(b.timestamp!).getTime()
  );

  const hasLoadingStarted = sortedEvents.some((e) => e.event_type === 'loading_started');
  const hasArrived = sortedEvents.some((e) => e.event_type === 'arrived');
  const hasCheckedIn = sortedEvents.some((e) => e.event_type === 'checked_in');

  if (!hasLoadingStarted || hasArrived) {
    return sortedEvents;
  }

  const loadingStartedEvent = sortedEvents.find((e) => e.event_type === 'loading_started');
  if (!loadingStartedEvent?.timestamp) {
    return sortedEvents;
  }

  const loadingTime = toDate(loadingStartedEvent.timestamp);
  const loadingTimeMs = loadingTime.getTime();

  const beforeLoad = gpsData
    .map((p) => ({ ...p, timestamp: toDate(p.timestamp) }))
    .filter((p) => p.timestamp.getTime() < loadingTimeMs)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (beforeLoad.length === 0) {
    return sortedEvents;
  }

  let arrivalPoint: (GpsPoint & { timestamp: Date }) | null = null;
  if (facility) {
    arrivalPoint =
      beforeLoad.find(
        (p) => haversineDistance(p.lat, p.lon, facility.lat, facility.lon) <= radiusMeters
      ) ?? beforeLoad[0];
  } else {
    arrivalPoint = beforeLoad[0];
  }

  const arrivalTime = arrivalPoint.timestamp;
  const arrivalEvent: Partial<LoadEvent> = {
    event_type: 'arrived',
    timestamp: arrivalTime.toISOString(),
    gps_lat: arrivalPoint.lat,
    gps_long: arrivalPoint.lon,
    note: '[Inferred] Arrival from GPS',
  };

  const afterArrival = beforeLoad.filter((p) => p.timestamp.getTime() > arrivalTime.getTime());
  let checkedInTime: Date;
  let checkedInGps: (typeof beforeLoad)[number] | null = null;
  if (afterArrival.length > 0) {
    checkedInTime = afterArrival[0].timestamp;
    checkedInGps = afterArrival[0];
  } else {
    const midpointMs = (arrivalTime.getTime() + loadingTimeMs) / 2;
    checkedInTime = new Date(midpointMs);
  }

  const checkedInEvent: Partial<LoadEvent> = {
    event_type: 'checked_in',
    timestamp: checkedInTime.toISOString(),
    gps_lat: checkedInGps?.lat ?? arrivalPoint.lat,
    gps_long: checkedInGps?.lon ?? arrivalPoint.lon,
    note: '[Inferred] Check-in from GPS or midpoint',
  };

  const finalEvents = [...sortedEvents];
  if (!hasArrived) {
    finalEvents.push(arrivalEvent);
  }
  if (!hasCheckedIn) {
    finalEvents.push(checkedInEvent);
  }

  return finalEvents.sort(
    (a, b) => toDate(a.timestamp!).getTime() - toDate(b.timestamp!).getTime()
  );
}
