import { AlertTriangle, Clock } from 'lucide-react';
import { useLiveDetentionCalculator } from '@/hooks/useLiveDetentionCalculator';

interface DetentionSummaryCardProps {
  arrivalTime: string | null | undefined;
  departureTime?: string | null | undefined;
  freeTimeHours: number;
  ratePerHour: number;
}

function formatHoursToClock(hours: number): string {
  const safeHours = Math.max(0, hours);
  const wholeHours = Math.floor(safeHours);
  const minutes = Math.round((safeHours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
}

export function DetentionSummaryCard({
  arrivalTime,
  departureTime,
  freeTimeHours,
  ratePerHour,
}: DetentionSummaryCardProps) {
  const { formatted_detention_amount, current_detention_amount, current_detention_hours, current_billable_hours } =
    useLiveDetentionCalculator({
      arrival_time: arrivalTime,
      departure_time: departureTime,
      free_time_hours: freeTimeHours,
      rate_per_hour: ratePerHour,
    });

  const hasArrival = Boolean(arrivalTime);
  const detentionOwed = current_detention_amount > 0;
  const isCompleted = Boolean(departureTime);
  const alertTone = detentionOwed ? (isCompleted ? 'red' : 'yellow') : 'neutral';

  const freeTimeLabel = hasArrival
    ? current_billable_hours > 0
      ? `Exceeded by ${formatHoursToClock(current_billable_hours)}`
      : `${formatHoursToClock(Math.max(freeTimeHours - current_detention_hours, 0))} remaining`
    : 'Not started';

  return (
    <section
      className={`rounded-xl border p-5 ${
        alertTone === 'red'
          ? 'border-red-500/40 bg-red-500/10'
          : alertTone === 'yellow'
            ? 'border-yellow-500/40 bg-yellow-500/10'
            : 'border-slate-800 bg-slate-900'
      }`}
    >
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-emerald-400" />
        <h3 className="text-lg font-bold text-white">Detention Summary</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Arrival Time</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {hasArrival
              ? new Date(arrivalTime as string).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })
              : 'No arrival recorded'}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Free Time</p>
          <p className={`mt-1 text-sm font-semibold ${current_billable_hours > 0 ? 'text-orange-300' : 'text-white'}`}>
            {freeTimeLabel}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Current Detention Amount</p>
          <p className={`mt-1 text-3xl font-black tabular-nums ${detentionOwed ? 'text-orange-300' : 'text-emerald-400'}`}>
            {formatted_detention_amount}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Rate Per Hour</p>
          <p className="mt-1 text-sm font-semibold text-white">${ratePerHour.toFixed(2)}/hr</p>
        </div>
      </div>

      {detentionOwed && (
        <div className="mt-4 rounded-lg border border-orange-400/30 bg-orange-500/10 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-orange-300">
            <AlertTriangle className="h-4 w-4" />
            You are currently owed {formatted_detention_amount} for this load
          </p>
        </div>
      )}
    </section>
  );
}
