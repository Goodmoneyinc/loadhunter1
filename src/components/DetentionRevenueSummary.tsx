import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { calculateDetention } from '@/lib/detention';
import { getDispatcherId } from '@/lib/dispatcher';
import { supabase } from '@/lib/supabase';
import type { Load } from '@/types';

type LoadDetentionRow = Pick<Load, 'id' | 'free_time_hours' | 'rate_per_hour'>;

interface DetentionSummary {
  pendingRevenue: number;
  capturedRevenue: number;
  loadsAffected: number;
}

export interface DetentionRevenueSummaryProps {
  /** `light` matches Load activity / gray dashboards; `dark` matches Command Center. */
  variant?: 'light' | 'dark';
}

export function DetentionRevenueSummary({ variant = 'light' }: DetentionRevenueSummaryProps) {
  const isDark = variant === 'dark';
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<DetentionSummary>({
    pendingRevenue: 0,
    capturedRevenue: 0,
    loadsAffected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!user) {
      setSummary({ pendingRevenue: 0, capturedRevenue: 0, loadsAffected: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dispatcherId = await getDispatcherId();
      if (!dispatcherId) {
        setError('Could not resolve dispatcher.');
        setSummary({ pendingRevenue: 0, capturedRevenue: 0, loadsAffected: 0 });
        return;
      }

      const { data: loads, error: loadsError } = await supabase
        .from('loads')
        .select('id, free_time_hours, rate_per_hour')
        .eq('dispatcher_id', dispatcherId)
        .order('created_at', { ascending: false });

      if (loadsError) throw new Error(loadsError.message);
      if (!loads || loads.length === 0) {
        setSummary({ pendingRevenue: 0, capturedRevenue: 0, loadsAffected: 0 });
        return;
      }

      const results = await Promise.all(
        (loads as LoadDetentionRow[]).map(async (load) => {
          const detention = await calculateDetention(load.id, {
            freeTimeHours: load.free_time_hours,
            ratePerHour: load.rate_per_hour,
          });
          return { ...detention, loadId: load.id };
        })
      );

      let pendingRevenue = 0;
      let capturedRevenue = 0;
      const loadsWithDetention = new Set<string>();

      for (const result of results) {
        if (result.revenue <= 0) continue;

        loadsWithDetention.add(result.loadId);

        if (result.isActive) {
          pendingRevenue += result.revenue;
        } else {
          capturedRevenue += result.revenue;
        }
      }

      setSummary({
        pendingRevenue,
        capturedRevenue,
        loadsAffected: loadsWithDetention.size,
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load detention summary');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void fetchSummary();
    const interval = setInterval(() => void fetchSummary(), 60000);
    return () => clearInterval(interval);
  }, [authLoading, fetchSummary]);

  if (authLoading || loading) {
    return (
      <div
        className={
          isDark
            ? 'rounded-xl border border-white/10 bg-[#0F0F0F] p-6 animate-pulse'
            : 'bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse'
        }
      >
        <div className={`h-4 rounded w-1/3 mb-4 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
        <div className="grid grid-cols-3 gap-4">
          <div className={`h-12 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
          <div className={`h-12 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
          <div className={`h-12 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={
          isDark
            ? 'rounded-xl p-6 border border-red-500/30 bg-red-950/20'
            : 'bg-red-50 rounded-xl p-6 border border-red-200'
        }
      >
        <div className={`flex items-start gap-2 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchSummary()}
          className={
            isDark
              ? 'mt-3 text-sm text-[#FF6B00] hover:underline'
              : 'mt-3 text-sm text-red-600 underline'
          }
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className={
        isDark
          ? 'rounded-xl border border-white/10 bg-[#0F0F0F] overflow-hidden'
          : 'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'
      }
    >
      <div
        className={
          isDark
            ? 'px-5 py-4 border-b border-white/10 bg-[#1A1A1A]'
            : 'px-6 py-4 border-b border-gray-100 bg-gray-50/50'
        }
      >
        <h3
          className={
            isDark
              ? 'text-sm font-bold text-white uppercase tracking-wide'
              : 'text-sm font-semibold text-gray-600 uppercase tracking-wide'
          }
        >
          Detention Revenue
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center md:text-left">
            <div className={`text-3xl md:text-4xl font-black ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              ${summary.pendingRevenue.toFixed(2)}
            </div>
            <div className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pending Revenue</div>
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Active loads · increasing in real time
            </div>
          </div>

          <div className="text-center md:text-left">
            <div className={`text-3xl md:text-4xl font-black ${isDark ? 'text-emerald-400' : 'text-green-700'}`}>
              ${summary.capturedRevenue.toFixed(2)}
            </div>
            <div className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Captured Revenue</div>
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Completed loads · locked value
            </div>
          </div>

          <div className="text-center md:text-left">
            <div className={`text-3xl md:text-4xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {summary.loadsAffected}
            </div>
            <div className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loads with Detention</div>
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Any billable hours incurred
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => void fetchSummary()}
            className={
              isDark
                ? 'text-xs text-gray-500 hover:text-gray-300 transition'
                : 'text-xs text-gray-400 hover:text-gray-600 transition'
            }
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
