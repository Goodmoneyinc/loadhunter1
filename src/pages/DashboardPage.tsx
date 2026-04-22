import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Route } from 'lucide-react';
import { SubscriptionStatus } from '../components/SubscriptionStatus';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getDispatcherId } from '../lib/dispatcher';
import type { LoadEvent, LoadEventType } from '../lib/loadEvents';

const EVENT_LABELS: Record<LoadEventType, string> = {
  arrived: 'Arrived at facility',
  checked_in: 'Checked in',
  moved: 'Moved',
  loading_started: 'Loading started',
  departed: 'Departed',
};

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<LoadEvent[]>([]);
  const [loadMeta, setLoadMeta] = useState<Record<string, { load_number: string; facility_address: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLoadEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setLoadMeta({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const dispatcherId = await getDispatcherId();
      if (!dispatcherId) {
        setError('Could not resolve dispatcher.');
        setEvents([]);
        setLoadMeta({});
        return;
      }

      const { data: loadsData, error: loadsError } = await supabase
        .from('loads')
        .select('id, load_number, facility_address')
        .eq('dispatcher_id', dispatcherId);

      if (loadsError) throw loadsError;

      const loads = loadsData ?? [];
      const meta: Record<string, { load_number: string; facility_address: string }> = {};
      for (const row of loads) {
        meta[row.id] = {
          load_number: row.load_number,
          facility_address: row.facility_address,
        };
      }
      setLoadMeta(meta);

      const loadIds = loads.map((l) => l.id);
      if (loadIds.length === 0) {
        setEvents([]);
        return;
      }

      const { data: eventsData, error: eventsError } = await supabase
        .from('load_events')
        .select('*')
        .in('load_id', loadIds)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (eventsError) throw eventsError;
      setEvents((eventsData as LoadEvent[]) ?? []);
    } catch (e) {
      console.error(e);
      setError('Failed to load events.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void fetchLoadEvents();
  }, [authLoading, fetchLoadEvents]);

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-load-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'load_events' },
        () => {
          void fetchLoadEvents();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchLoadEvents]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SubscriptionStatus />

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Load activity</h1>
            <p className="text-sm text-gray-600 mt-1">
              Live timeline of driver checkpoints and status updates across your loads.
            </p>
          </div>
          <Link
            to="/loads"
            className="text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            Manage loads →
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Route className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">Recent load events</h2>
          </div>

          <div className="p-6">
            {authLoading || loading ? (
              <div className="flex items-center justify-center py-16 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mr-2" />
                <span>Loading events…</span>
              </div>
            ) : !user ? (
              <p className="text-center text-gray-600 py-12">
                Sign in to see load events for your fleet.
              </p>
            ) : error ? (
              <p className="text-center text-red-600 py-12">{error}</p>
            ) : events.length === 0 ? (
              <p className="text-center text-gray-500 py-12">
                No load events yet. Events appear here when drivers report milestones on tracked loads.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {events.map((ev) => {
                  const load = loadMeta[ev.load_id];
                  return (
                    <li key={ev.id} className="py-4 first:pt-0 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {EVENT_LABELS[ev.event_type]}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {load?.load_number ? `Load #${load.load_number}` : 'Load'}{' '}
                          <span className="text-gray-400">·</span>{' '}
                          {load?.facility_address ?? 'Unknown facility'}
                        </p>
                        {ev.note ? (
                          <p className="text-sm text-gray-500 mt-2 italic">&ldquo;{ev.note}&rdquo;</p>
                        ) : null}
                      </div>
                      <div className="text-sm text-gray-500 sm:text-right shrink-0">
                        {formatEventTime(ev.timestamp)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
