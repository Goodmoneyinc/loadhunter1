'use client';

import useSWR from 'swr';
import { formatCurrency } from '../lib/utils';

interface PerLoadDetention {
  loadId: string;
  loadNumber: string;
  revenue: number;
  isActive: boolean;
  billableHours: number;
}

interface DashboardDetentionResponse {
  totalToday: number;
  perLoad: PerLoadDetention[];
}

const fetcher = async (url: string): Promise<DashboardDetentionResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch dashboard detention data');
  }

  return res.json() as Promise<DashboardDetentionResponse>;
};

export function DashboardDetentionSummary() {
  const { data, error, isLoading } = useSWR<DashboardDetentionResponse>('/api/dashboard/detention', fetcher, {
    refreshInterval: 30000, // refresh every 30s
  });

  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-gray-100" />;
  if (error) return <div className="text-red-600">Failed to load detention data</div>;
  if (!data) return <div className="text-gray-600">No detention data available</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-100 p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          Total Detention Revenue Today
        </p>
        <p className="mt-2 text-5xl font-black text-green-800">{formatCurrency(data.totalToday)}</p>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h3 className="text-lg font-bold text-gray-800">Detention per Load</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {data.perLoad.map((load) => (
            <div key={load.loadId} className="flex items-center justify-between px-6 py-4">
              <div>
                <span className="font-medium text-gray-900">Load #{load.loadNumber}</span>
                {load.isActive && (
                  <span className="ml-2 inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    active
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="font-bold text-green-700">{formatCurrency(load.revenue)}</div>
                <div className="text-xs text-gray-500">{load.billableHours.toFixed(1)} billable hrs</div>
              </div>
            </div>
          ))}
          {data.perLoad.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">No loads with detention today</div>
          )}
        </div>
      </div>
    </div>
  );
}
