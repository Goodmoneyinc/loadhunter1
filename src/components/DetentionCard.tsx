'use client';

import { useEffect, useState } from 'react';
import { useDetentionEngine } from '../hooks/useDetentionEngine';

interface DetentionCardProps {
  loadId: string;
}

export function DetentionCard({ loadId }: DetentionCardProps) {
  const { detention, loading, error } = useDetentionEngine(loadId, {
    config: { freeTimeHours: 2, ratePerHour: 75 },
    refreshInterval: 10000, // refresh every 10s while active
  });

  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  // Countdown timer for free time remaining.
  useEffect(() => {
    if (!detention.arrivalTime || detention.detentionStart === null) {
      setMinutesLeft(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const start = detention.detentionStart!;
      if (now >= start) {
        setMinutesLeft(0);
      } else {
        const diffMs = start.getTime() - now.getTime();
        setMinutesLeft(Math.ceil(diffMs / (1000 * 60)));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // update every minute
    return () => clearInterval(interval);
  }, [detention.arrivalTime, detention.detentionStart]);

  if (loading) return <div className="h-32 animate-pulse rounded-lg bg-gray-100" />;
  if (error) return <div className="text-red-600">Error loading detention data</div>;
  if (!detention.arrivalTime) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-gray-500">No arrival recorded - detention not applicable</p>
      </div>
    );
  }

  const isInFreeTime = minutesLeft !== null && minutesLeft > 0;

  return (
    <div className="overflow-hidden rounded-xl border-2 border-green-200 bg-white shadow-md">
      <div className="border-b border-green-200 bg-green-50 px-6 py-4">
        <h2 className="text-xl font-bold text-green-900">Detention Revenue</h2>
      </div>
      <div className="space-y-4 px-6 py-5">
        <div className="text-center">
          <div className="text-5xl font-extrabold text-green-700">${detention.revenue.toFixed(2)}</div>
          <div className="mt-1 text-sm text-gray-500">current revenue</div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-center">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Detention started</div>
            <div className="font-semibold">
              {detention.detentionStart
                ? detention.detentionStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Billable hours</div>
            <div className="font-semibold">{detention.billableHours.toFixed(2)}h</div>
          </div>
        </div>

        {isInFreeTime && (
          <div className="rounded border-l-4 border-yellow-400 bg-yellow-50 p-3">
            <p className="font-medium text-yellow-800">
              Detention starts in <span className="font-bold">{minutesLeft} min</span>
            </p>
            <p className="mt-1 text-xs text-yellow-700">Free time: {detention.config?.freeTimeHours || 2}h included</p>
          </div>
        )}

        {detention.isActive && !isInFreeTime && (
          <div className="rounded bg-green-100 p-2 text-center">
            <span className="inline-flex items-center gap-1 font-medium text-green-800">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
              Clock running - revenue increasing
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
