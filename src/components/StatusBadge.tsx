interface StatusBadgeProps {
  status: string;
  detentionHours?: number;
}

const statusConfig: Record<string, { label: string; classes: string; dot: string }> = {
  in_transit: { label: 'In Transit', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
  scheduled: { label: 'Scheduled', classes: 'bg-sky-500/10 text-sky-400 border-sky-500/30', dot: 'bg-sky-400' },
  in_facility: { label: 'In Facility', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  at_facility: { label: 'At Facility', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  arrived: { label: 'Arrived', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  delayed: { label: 'Delayed', classes: 'bg-orange-500/10 text-orange-400 border-orange-500/30', dot: 'bg-orange-400' },
  completed: { label: 'Completed', classes: 'bg-slate-500/10 text-slate-400 border-slate-500/30', dot: 'bg-slate-400' },
  archived: { label: 'Ready for Billing', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
};

export default function StatusBadge({ status, detentionHours }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.scheduled;
  const isLongDetention = detentionHours !== undefined && detentionHours > 2;

  if (isLongDetention) {
    return (
      <span className="relative inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border bg-red-500/10 text-red-400 border-red-500/30 animate-pulse-glow">
        <span className="absolute inset-0 rounded-full bg-red-500/20 blur-md animate-pulse-slow" />
        <span className="relative w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        <span className="relative">{config.label}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${config.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      {config.label}
    </span>
  );
}
