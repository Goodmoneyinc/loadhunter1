import { useEffect, useState } from 'react';
import { Clock3, MapPin, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';

type TopFacilityRow = {
  facility_address: string;
  total_detention_hours: number;
  total_revenue: number;
};

type AvgWaitRow = {
  avg_wait_minutes: number | null;
};

type WorstOffenderRow = {
  load_id: string;
  load_number: string;
  facility_address: string;
  detention_hours: number;
  revenue: number;
  last_departed_at: string;
};

export function DetentionAnalyticsCards() {
  const [topFacility, setTopFacility] = useState<TopFacilityRow | null>(null);
  const [avgWaitMinutes, setAvgWaitMinutes] = useState<number | null>(null);
  const [worstOffender, setWorstOffender] = useState<WorstOffenderRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchViews = async () => {
      const [topRes, waitRes, worstRes] = await Promise.all([
        supabase.from('top_detention_facilities').select('*').limit(1).maybeSingle(),
        supabase.from('avg_wait_time').select('*').limit(1).maybeSingle(),
        supabase.from('worst_offenders_last_7_days').select('*').limit(1).maybeSingle(),
      ]);

      if (!mounted) return;

      setTopFacility((topRes.data as TopFacilityRow | null) ?? null);
      setAvgWaitMinutes((waitRes.data as AvgWaitRow | null)?.avg_wait_minutes ?? null);
      setWorstOffender((worstRes.data as WorstOffenderRow | null) ?? null);
      setLoading(false);
    };

    void fetchViews();
    const id = window.setInterval(() => void fetchViews(), 30000);

    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-28 rounded-xl border border-white/10 bg-[#0F0F0F] animate-pulse" />
        <div className="h-28 rounded-xl border border-white/10 bg-[#0F0F0F] animate-pulse" />
        <div className="h-28 rounded-xl border border-white/10 bg-[#0F0F0F] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-[#0F0F0F] p-4">
        <div className="flex items-center gap-2 text-[#FF6B00]">
          <MapPin className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Top Facility</span>
        </div>
        <p className="mt-2 truncate text-sm font-semibold text-white">{topFacility?.facility_address ?? 'No data yet'}</p>
        <p className="mt-1 text-xl font-black text-[#FFB067]">
          {topFacility ? formatCurrency(topFacility.total_revenue) : formatCurrency(0)}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0F0F0F] p-4">
        <div className="flex items-center gap-2 text-emerald-300">
          <Clock3 className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Avg Wait Time</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-white">Arrival to loading started</p>
        <p className="mt-1 text-xl font-black text-emerald-300">
          {avgWaitMinutes !== null ? `${avgWaitMinutes.toFixed(1)} min` : 'No data yet'}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0F0F0F] p-4">
        <div className="flex items-center gap-2 text-red-300">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Worst Offender (7d)</span>
        </div>
        <p className="mt-2 truncate text-sm font-semibold text-white">
          {worstOffender ? `Load #${worstOffender.load_number}` : 'No data yet'}
        </p>
        <p className="mt-1 text-xl font-black text-red-300">
          {worstOffender ? formatCurrency(worstOffender.revenue) : formatCurrency(0)}
        </p>
      </div>
    </div>
  );
}
