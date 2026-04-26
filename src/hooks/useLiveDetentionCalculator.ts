import { useEffect, useMemo, useState } from 'react';

interface UseLiveDetentionCalculatorInput {
  arrival_time: string | null | undefined;
  departure_time?: string | null | undefined;
  free_time_hours: number;
  rate_per_hour: number;
  server_now_utc?: string | null | undefined;
  locale?: string;
  currency?: string;
}

interface UseLiveDetentionCalculatorResult {
  current_detention_amount: number;
  formatted_detention_amount: string;
  current_detention_hours: number;
  current_billable_hours: number;
}

const MS_PER_HOUR = 1000 * 60 * 60;

export function useLiveDetentionCalculator({
  arrival_time,
  departure_time,
  free_time_hours,
  rate_per_hour,
  server_now_utc,
  locale = 'en-US',
  currency = 'USD',
}: UseLiveDetentionCalculatorInput): UseLiveDetentionCalculatorResult {
  const [serverBaseMs, setServerBaseMs] = useState<number | null>(() => {
    const initial = server_now_utc ? new Date(server_now_utc).getTime() : NaN;
    return Number.isFinite(initial) ? initial : null;
  });
  const [perfBaseMs, setPerfBaseMs] = useState<number>(() => performance.now());

  useEffect(() => {
    const parsed = server_now_utc ? new Date(server_now_utc).getTime() : NaN;
    if (!Number.isFinite(parsed)) return;
    setServerBaseMs(parsed);
    setPerfBaseMs(performance.now());
  }, [server_now_utc]);

  const [liveNowMs, setLiveNowMs] = useState<number>(() => Date.now());

  /** Tick every second while on site (arrival, no departure) so free-time countdown and live detention stay smooth. */
  useEffect(() => {
    if (!arrival_time || departure_time) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const nextNow =
        serverBaseMs !== null
          ? serverBaseMs + (performance.now() - perfBaseMs)
          : Date.now();
      setLiveNowMs(nextNow);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [arrival_time, departure_time, serverBaseMs, perfBaseMs]);

  return useMemo(() => {
    const arrivalMs = arrival_time ? new Date(arrival_time).getTime() : NaN;
    const settledEndMs = departure_time ? new Date(departure_time).getTime() : NaN;
    const endMs = Number.isFinite(settledEndMs) ? settledEndMs : liveNowMs;

    if (!Number.isFinite(arrivalMs) || !Number.isFinite(endMs) || endMs <= arrivalMs) {
      return {
        current_detention_amount: 0,
        formatted_detention_amount: new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
        }).format(0),
        current_detention_hours: 0,
        current_billable_hours: 0,
      };
    }

    const current_detention_hours = (endMs - arrivalMs) / MS_PER_HOUR;
    const current_billable_hours = Math.max(0, current_detention_hours - free_time_hours);
    const current_detention_amount = current_billable_hours * rate_per_hour;

    return {
      current_detention_amount,
      formatted_detention_amount: new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).format(current_detention_amount),
      current_detention_hours,
      current_billable_hours,
    };
  }, [
    arrival_time,
    departure_time,
    liveNowMs,
    free_time_hours,
    rate_per_hour,
    locale,
    currency,
  ]);
}
