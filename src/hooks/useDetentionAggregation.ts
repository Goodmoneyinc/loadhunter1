import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { DetentionAggregation } from '@/lib/aggregateDetention';

export function useDetentionAggregation() {
  const [aggregation, setAggregation] = useState<DetentionAggregation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAggregation = async () => {
    try {
      const res = await fetch('/api/detention/aggregate');
      if (!res.ok) {
        throw new Error('Failed to fetch');
      }

      const data: DetentionAggregation = await res.json();
      setAggregation(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAggregation();
  }, []);

  // Subscribe to changes that affect detention calculation
  useEffect(() => {
    // Listen for any changes to load_events
    const eventsChannel = supabase
      .channel('detention-aggregation-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'load_events' }, () => {
        fetchAggregation(); // re-fetch when any event changes
      })
      .subscribe();

    // Listen for changes to loads' detention config
    const loadsChannel = supabase
      .channel('detention-aggregation-loads')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'loads' }, (payload) => {
        // Only re-fetch if free_time_hours or rate_per_hour changed
        const changed =
          payload.new?.free_time_hours !== payload.old?.free_time_hours ||
          payload.new?.rate_per_hour !== payload.old?.rate_per_hour;
        if (changed) {
          fetchAggregation();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(loadsChannel);
    };
  }, []);

  return { aggregation, loading, error, refetch: fetchAggregation };
}
