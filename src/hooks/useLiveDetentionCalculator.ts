import { useEffect, useMemo, useState } from 'react';

interface UseLiveDetentionCalculatorInput {
  arrival_time: string | null | undefined;
  departure_time?: string | null | undefined;
  free_time_hours: number;
  rate_per_hour: number;
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
  locale = 'en-US',
  currency = 'USD',
}: UseLiveDetentionCalculatorInput): UseLiveDetentionCalculatorResult {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!arrival_time || departure_time) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [arrival_time, departure_time]);

  return useMemo(() => {
    const arrivalMs = arrival_time ? new Date(arrival_time).getTime() : NaN;
    const endMs = departure_time ? new Date(departure_time).getTime() : nowMs;

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
    nowMs,
    free_time_hours,
    rate_per_hour,
    locale,
    currency,
  ]);
}
