import { useEffect, useMemo, useState } from 'react';

interface DetentionTimerProps {
  arrivalTime: Date | string | null;
  freeTimeHours?: number;
  ratePerHour?: number;
  className?: string;
}

const formatRemaining = (remainingMs: number): string => {
  if (remainingMs <= 0) return '0m';

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m`;

  return `${minutes}m`;
};

export function DetentionTimer({
  arrivalTime,
  freeTimeHours = 2,
  ratePerHour = 75,
  className = '',
}: DetentionTimerProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const arrivalDate = useMemo(() => {
    if (!arrivalTime) return null;

    const date = new Date(arrivalTime);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [arrivalTime]);

  const detentionStart = useMemo(() => {
    if (!arrivalDate) return null;
    return new Date(arrivalDate.getTime() + freeTimeHours * 60 * 60 * 1000);
  }, [arrivalDate, freeTimeHours]);

  const { isActive, remainingMs, billableHours, amount } = useMemo(() => {
    if (!detentionStart || !arrivalDate) {
      return { isActive: false, remainingMs: 0, billableHours: 0, amount: 0 };
    }

    const now = currentTime.getTime();
    const start = detentionStart.getTime();

    if (now < start) {
      return {
        isActive: false,
        remainingMs: start - now,
        billableHours: 0,
        amount: 0,
      };
    }

    const billableMs = now - start;
    const hours = billableMs / (1000 * 60 * 60);
    const amountDue = hours * ratePerHour;

    return {
      isActive: true,
      remainingMs: 0,
      billableHours: hours,
      amount: amountDue,
    };
  }, [arrivalDate, currentTime, detentionStart, ratePerHour]);

  if (!arrivalDate) {
    return <div className={`text-gray-400 ${className}`}>No arrival recorded</div>;
  }

  if (!isActive) {
    return (
      <div className={className}>
        <div className="text-sm text-gray-500">Free time remaining</div>
        <div className="text-lg font-semibold text-amber-600">{formatRemaining(remainingMs)}</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="text-sm text-gray-500">Detention accruing</div>
      <div className="text-2xl font-bold text-green-700">${amount.toFixed(2)}</div>
      <div className="text-xs text-gray-400">{billableHours.toFixed(2)} billable hours</div>
    </div>
  );
}
