'use client';

import { useDetentionAggregation } from '@/hooks/useDetentionAggregation';
import { formatCurrency } from '@/lib/utils';

export function DetentionFinancialDashboard() {
  const { aggregation, loading, error } = useDetentionAggregation();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100 lg:col-span-1" />
        <div className="h-96 animate-pulse rounded-2xl bg-gray-100 lg:col-span-2" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        Failed to load detention data: {error.message}
      </div>
    );
  }

  if (!aggregation) return null;

  const activeDetentionLoads = aggregation.perLoad.filter((load) => load.detentionHours > 0);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 to-emerald-800 shadow-xl">
        <div className="px-6 py-8 md:px-8">
          <div className="text-sm font-semibold uppercase tracking-wider text-green-100">
            Total Detention Revenue
          </div>
          <div className="mt-2 text-5xl font-black tracking-tight text-white md:text-6xl">
            {formatCurrency(aggregation.totalDetentionAmount)}
          </div>
          <div className="mt-4 flex gap-4 text-sm text-green-200">
            <span>💰 Live updated</span>
            <span>⚡ Real-time events</span>
          </div>
        </div>
        <div className="h-1 w-full bg-green-400/30" />
        <div className="flex justify-between bg-green-700/30 px-6 py-3 text-xs text-green-100">
          <span>Active loads: {activeDetentionLoads.length}</span>
          <span>Active detention amount: {formatCurrency(aggregation.activeDetentionAmount)}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <span>📊</span> Loads Currently Accruing Detention
          </h3>
          <p className="mt-1 text-xs text-gray-500">Only loads with billable hours &gt; 0 are shown</p>
        </div>

        {activeDetentionLoads.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p className="text-lg">✨ No active detention</p>
            <p className="mt-1 text-sm">All loads are within free time or have departed.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {activeDetentionLoads.map((load) => (
              <li key={load.loadId} className="px-6 py-4 transition-colors hover:bg-gray-50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">Load #{load.loadNumber}</span>
                      {load.isActive && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          active
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">{load.detentionHours.toFixed(2)} billable hours</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-700">{formatCurrency(load.detentionAmount)}</div>
                    <div className="text-xs text-gray-400">
                      Rate: ${load.ratePerHour}/h · Free: {load.freeTimeHours}h
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 text-center text-xs text-gray-400">
          Updates in real time when drivers record events or when detention rules change
        </div>
      </div>
    </div>
  );
}
