import { calculateDetention } from '@/lib/detention.utils';
import { supabase } from '@/lib/supabase';
import { normalizeLoadEvents, type LoadEvent, type LoadEventRowInput } from '@/types/load-events';

export interface DetentionReportData {
  loadId: string;
  loadNumber: string;
  freeTimeHours: number;
  ratePerHour: number;
  arrivalTime: Date | null;
  departureTime: Date | null;
  billableHours: number;
  totalAmount: number;
  timeline: Array<{
    timestamp: Date;
    eventType: string;
    note: string | null;
    gpsAvailable: boolean;
  }>;
  generatedAt: Date;
}

/** JSON-serialized shape (`JSON.stringify` / `JSON.parse` on `DetentionReportData`). */
export type DetentionReportWire = Omit<
  DetentionReportData,
  'arrivalTime' | 'departureTime' | 'generatedAt' | 'timeline'
> & {
  arrivalTime: string | null;
  departureTime: string | null;
  generatedAt: string;
  timeline: Array<{
    timestamp: string;
    eventType: string;
    note: string | null;
    gpsAvailable: boolean;
  }>;
};

export type DetentionReportInput = DetentionReportData | DetentionReportWire;

function coerceDate(value: Date | string | null | undefined): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function requireDate(value: Date | string, label: string): Date {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${label}`);
  return d;
}

/** Accepts in-memory `DetentionReportData` or wire JSON with ISO date strings. */
export function normalizeDetentionReportInput(report: DetentionReportInput): DetentionReportData {
  return {
    loadId: report.loadId,
    loadNumber: report.loadNumber,
    freeTimeHours: report.freeTimeHours,
    ratePerHour: report.ratePerHour,
    arrivalTime: coerceDate(report.arrivalTime),
    departureTime: coerceDate(report.departureTime),
    billableHours: report.billableHours,
    totalAmount: report.totalAmount,
    generatedAt: requireDate(report.generatedAt, 'generatedAt'),
    timeline: report.timeline.map((ev, i) => ({
      eventType: ev.eventType,
      note: ev.note,
      gpsAvailable: ev.gpsAvailable,
      timestamp: requireDate(ev.timestamp, `timeline[${i}].timestamp`),
    })),
  };
}

/** Same arrival/departure picks as `calculateDetention` in `detention.utils`. */
function arrivalAndDepartureEvents(events: LoadEvent[]): {
  arrival: LoadEvent | null;
  departure: LoadEvent | null;
} {
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const arrival = sorted.find((e) => e.event_type === 'arrived') ?? null;
  const departure = [...sorted].reverse().find((e) => e.event_type === 'departed') ?? null;
  return { arrival, departure };
}

export async function generateDetentionReport(loadId: string): Promise<DetentionReportData> {
  const { data: load, error: loadError } = await supabase
    .from('loads')
    .select('id, load_number, free_time_hours, rate_per_hour')
    .eq('id', loadId)
    .single();

  if (loadError || !load) {
    throw new Error(`Load not found: ${loadError?.message || loadId}`);
  }

  const freeTimeHours = load.free_time_hours ?? 2;
  const ratePerHour = load.rate_per_hour ?? 75;

  const { data: events, error: eventsError } = await supabase
    .from('load_events')
    .select('*')
    .eq('load_id', loadId)
    .order('timestamp', { ascending: true });

  if (eventsError) {
    throw new Error(`Failed to fetch events: ${eventsError.message}`);
  }

  const eventRows = normalizeLoadEvents((events ?? []) as LoadEventRowInput[]);
  const { arrival, departure } = arrivalAndDepartureEvents(eventRows);

  const detention = calculateDetention(
    {
      free_time_hours: load.free_time_hours,
      rate_per_hour: load.rate_per_hour,
    },
    eventRows
  );

  const timeline = eventRows.map((event) => ({
    timestamp: new Date(event.timestamp),
    eventType: event.event_type,
    note: event.note ?? null,
    gpsAvailable: !!(event.gps_lat != null && event.gps_long != null),
  }));

  return {
    loadId: load.id,
    loadNumber: load.load_number,
    freeTimeHours,
    ratePerHour,
    arrivalTime: arrival ? new Date(arrival.timestamp) : null,
    departureTime: departure ? new Date(departure.timestamp) : null,
    billableHours: detention.detention_hours,
    totalAmount: detention.detention_amount,
    timeline,
    generatedAt: new Date(),
  };
}
