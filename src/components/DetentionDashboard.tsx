'use client';

import { useDetentionAggregation } from '@/hooks/useDetentionAggregation';

export function DetentionDashboard() {
  const { aggregation, loading, error } = useDetentionAggregation();

  if (loading) {
    return <div className="animate-pulse space-y-4">Loading detention data...</div>;
  }

  if (error) {
    return <div className="text-red-600">Failed to load: {error.message}</div>;
  }

  if (!aggregation) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-100 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase text-green-700">Total Detention Revenue</p>
          <p className="text-3xl font-black text-green-800">${aggregation.totalDetentionAmount.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-r from-amber-50 to-yellow-100 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase text-amber-700">Active Detention (still on site)</p>
          <p className="text-3xl font-black text-amber-800">${aggregation.activeDetentionAmount.toFixed(2)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h3 className="text-lg font-bold">Detention per Load</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {aggregation.perLoad.map((load) => (
            <div key={load.loadId} className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
              <div className="min-w-[150px] flex-1">
                <span className="font-medium text-gray-900">Load #{load.loadNumber}</span>
                {load.isActive && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    active
                  </span>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Free: {load.freeTimeHours}h | Rate: ${load.ratePerHour}/h
                </p>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-700">${load.detentionAmount.toFixed(2)}</div>
                <div className="text-xs text-gray-500">{load.detentionHours.toFixed(2)} billable hrs</div>
              </div>
            </div>
          ))}
          {aggregation.perLoad.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">No loads with detention events</div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">Updates in real time as new events are recorded.</p>
    </div>
  );
}
