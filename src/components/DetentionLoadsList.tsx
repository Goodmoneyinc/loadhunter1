import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { calculateDetention, type DetentionCalculationEvent } from '@/lib/detention.utils';
import { getDispatcherId } from '@/lib/dispatcher';
import { supabase } from '@/lib/supabase';
import type { Load } from '@/types';
import { DetentionReportActions } from './DetentionReportActions';

type LoadDetentionRow = Pick<Load, 'id' | 'load_number' | 'status' | 'free_time_hours' | 'rate_per_hour'>;

interface DetentionLoad {
  id: string;
  load_number: string;
  status: string;
  detention_hours: number;
  detention_amount: number;
}

function statusBadgeClass(status: string): string {
  if (status === 'billed') return 'bg-gray-100 text-gray-600';
  if (status === 'Ready to submit') return 'bg-green-100 text-green-800';
  if (status === 'Missing BOL') return 'bg-red-100 text-red-800';
  return 'bg-yellow-100 text-yellow-800';
}

export function DetentionLoadsList() {
  const { user, loading: authLoading } = useAuth();
  const [loads, setLoads] = useState<DetentionLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetentionLoads = useCallback(async () => {
    if (!user) {
      setLoads([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dispatcherId = await getDispatcherId();
      if (!dispatcherId) {
        setError('Could not resolve dispatcher.');
        setLoads([]);
        return;
      }

      const { data: loadsData, error: loadsError } = await supabase
        .from('loads')
        .select('id, load_number, status, free_time_hours, rate_per_hour')
        .eq('dispatcher_id', dispatcherId)
        .order('created_at', { ascending: false });

      if (loadsError) throw new Error(loadsError.message);
      if (!loadsData || loadsData.length === 0) {
        setLoads([]);
        return;
      }

      const rows = loadsData as LoadDetentionRow[];
      const loadIds = rows.map((l) => l.id);

      const { data: allEvents, error: eventsError } = await supabase
        .from('load_events')
        .select('load_id, event_type, timestamp')
        .in('load_id', loadIds)
        .order('timestamp', { ascending: true });

      if (eventsError) throw new Error(eventsError.message);

      const eventsByLoad = new Map<string, DetentionCalculationEvent[]>();
      for (const row of allEvents ?? []) {
        const list = eventsByLoad.get(row.load_id) ?? [];
        list.push({ event_type: row.event_type, timestamp: row.timestamp });
        eventsByLoad.set(row.load_id, list);
      }

      const loadsWithDetention: DetentionLoad[] = [];

      for (const load of rows) {
        const events = eventsByLoad.get(load.id) ?? [];
        const detention = calculateDetention(
          {
            free_time_hours: load.free_time_hours,
            rate_per_hour: load.rate_per_hour,
          },
          events
        );

        if (detention.detention_amount <= 0) continue;

        loadsWithDetention.push({
          id: load.id,
          load_number: load.load_number,
          status: load.status || 'scheduled',
          detention_hours: detention.detention_hours,
          detention_amount: detention.detention_amount,
        });
      }

      loadsWithDetention.sort((a, b) => b.detention_amount - a.detention_amount);
      setLoads(loadsWithDetention);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load detention loads');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void fetchDetentionLoads();
  }, [authLoading, fetchDetentionLoads]);

  if (authLoading || loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-16 bg-gray-100 rounded-lg" />
        <div className="h-16 bg-gray-100 rounded-lg" />
        <div className="h-16 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <div className="flex items-start gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchDetentionLoads()}
          className="mt-3 text-sm text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loads.length === 0) {
    return (
      <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500 border border-gray-100">
        No loads with billable detention (arrived and departed, over free time).
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {loads.map((load) => (
        <div key={load.id} className="bg-white border rounded-lg p-4 flex justify-between items-center">
          <div>
            <h3 className="font-semibold">Load #{load.load_number}</h3>
            <div className="flex gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded ${statusBadgeClass(load.status)}`}>{load.status}</span>
              <span className="text-xs text-gray-500">{load.detention_hours.toFixed(1)} hrs</span>
            </div>
          </div>
          <div className="text-right min-w-[200px]">
            <div className="text-xl font-bold text-green-700">${load.detention_amount.toFixed(2)}</div>
            <DetentionReportActions
              loadId={load.id}
              loadNumber={load.load_number}
              loadStatus={load.status}
              compact
              onBrokerSent={() => void fetchDetentionLoads()}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
