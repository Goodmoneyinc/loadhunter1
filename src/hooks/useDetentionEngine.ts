import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { calculateDetention, type DetentionConfig, type DetentionResult } from '../lib/detention';

interface ActiveDetention {
  detentionId: string;
  loadId: string;
  loadNumber: string;
  facilityAddress: string;
  arrivalTime: string;
  elapsedHours: number;
  billableHours: number;
  revenue: number;
}

interface LoadDetentionOptions {
  config?: Partial<DetentionConfig>;
  refreshInterval?: number;
}

interface ActiveDetentionEngineResult {
  activeDetentions: ActiveDetention[];
  totalLiveRevenue: number;
  loading: boolean;
}

interface SingleLoadDetentionResult {
  detention: DetentionResult;
  loading: boolean;
  error: string | null;
}

const FREE_TIME_HOURS = 2;
const HOURLY_RATE = 75;
const DEFAULT_SINGLE_LOAD_DETENTION: DetentionResult = {
  arrivalTime: null,
  checkInTime: null,
  detentionStart: null,
  billableHours: 0,
  revenue: 0,
  isActive: false,
  configUsed: { freeTimeHours: 0, ratePerHour: 0 },
};

export function useDetentionEngine(): ActiveDetentionEngineResult;
export function useDetentionEngine(
  loadId: string,
  options?: LoadDetentionOptions
): SingleLoadDetentionResult;
export function useDetentionEngine(loadId?: string, options: LoadDetentionOptions = {}) {
  const [activeDetentions, setActiveDetentions] = useState<ActiveDetention[]>([]);
  const [totalLiveRevenue, setTotalLiveRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detention, setDetention] = useState<DetentionResult>(DEFAULT_SINGLE_LOAD_DETENTION);
  const [error, setError] = useState<string | null>(null);
  const tickRef = useRef<number | null>(null);
  const singleLoadTickRef = useRef<number | null>(null);

  useEffect(() => {
    if (loadId) return;

    fetchActiveDetentions();

    const channel = supabase
      .channel('detention-engine')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'detention_events' },
        () => { fetchActiveDetentions(); }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'loads', filter: 'status=eq.at_facility' },
        () => { fetchActiveDetentions(); }
      )
      .subscribe();

    tickRef.current = window.setInterval(() => {
      setActiveDetentions(prev => recalculate(prev));
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [loadId]);

  useEffect(() => {
    if (!loadId) return;

    let isMounted = true;

    const fetchDetention = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await calculateDetention(loadId, options.config);
        if (isMounted) {
          setDetention(result);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to calculate detention');
          setLoading(false);
        }
      }
    };

    fetchDetention();

    const refreshMs = options.refreshInterval ?? 30000;
    singleLoadTickRef.current = window.setInterval(fetchDetention, refreshMs);

    return () => {
      isMounted = false;
      if (singleLoadTickRef.current) clearInterval(singleLoadTickRef.current);
    };
  }, [loadId, options.config, options.refreshInterval]);

  useEffect(() => {
    const total = activeDetentions.reduce((sum, d) => sum + d.revenue, 0);
    setTotalLiveRevenue(total);
  }, [activeDetentions]);

  function recalculate(detentions: ActiveDetention[]): ActiveDetention[] {
    const now = Date.now();
    return detentions.map(d => {
      const elapsed = (now - new Date(d.arrivalTime).getTime()) / (1000 * 60 * 60);
      const billable = Math.max(0, elapsed - FREE_TIME_HOURS);
      return {
        ...d,
        elapsedHours: Math.round(elapsed * 100) / 100,
        billableHours: Math.round(billable * 100) / 100,
        revenue: Math.round(billable * HOURLY_RATE * 100) / 100,
      };
    });
  }

  async function fetchActiveDetentions() {
    const { data: events } = await supabase
      .from('detention_events')
      .select('id, load_id, arrival_time, status')
      .eq('status', 'active')
      .order('arrival_time', { ascending: true });

    if (!events || events.length === 0) {
      setActiveDetentions([]);
      setLoading(false);
      return;
    }

    const loadIds = events.map(e => e.load_id).filter(Boolean);
    const { data: loads } = await supabase
      .from('loads')
      .select('id, load_number, facility_address')
      .in('id', loadIds);

    const loadsMap = new Map<string, { load_number: string; facility_address: string }>();
    if (loads) {
      for (const load of loads) {
        loadsMap.set(load.id, load);
      }
    }

    const now = Date.now();
    const detentions: ActiveDetention[] = events.map(event => {
      const load = loadsMap.get(event.load_id);
      const elapsed = (now - new Date(event.arrival_time).getTime()) / (1000 * 60 * 60);
      const billable = Math.max(0, elapsed - FREE_TIME_HOURS);
      return {
        detentionId: event.id,
        loadId: event.load_id,
        loadNumber: load?.load_number || 'N/A',
        facilityAddress: load?.facility_address || 'Unknown',
        arrivalTime: event.arrival_time,
        elapsedHours: Math.round(elapsed * 100) / 100,
        billableHours: Math.round(billable * 100) / 100,
        revenue: Math.round(billable * HOURLY_RATE * 100) / 100,
      };
    });

    setActiveDetentions(detentions);
    setLoading(false);
  }

  if (loadId) {
    return {
      detention,
      loading,
      error,
    };
  }

  return {
    activeDetentions,
    totalLiveRevenue,
    loading,
  };
}
