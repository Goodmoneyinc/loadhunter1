import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Driver {
  id: string;
  name: string;
}

interface Load {
  id: string;
  status: string;
  facility_address: string;
  driver_id: string | null;
  driver?: Driver | null;
  facility_lat: number | null;
  facility_long: number | null;
  load_number?: string | null;
}

interface Stats {
  totalActive: number;
  onTime: number;
  delayed: number;
  avgDetention: number;
}

interface LeaderboardStats {
  totalDetentionCost: number;
  percentageOfTarget: number;
}

export function useRealtimeStats() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [stats, setStats] = useState<Stats>({ totalActive: 0, onTime: 0, delayed: 0, avgDetention: 0 });
  const [leaderboardStats, setLeaderboardStats] = useState<LeaderboardStats>({ totalDetentionCost: 0, percentageOfTarget: 0 });
  const [loading, setLoading] = useState(true);

  async function calculateStats(loadsData: Load[]) {
    const totalActive = loadsData.filter(l => l.status !== 'completed').length;
    const delayed = loadsData.filter(l => l.status === 'delayed').length;
    const onTime = totalActive - delayed;

    const { data: detentionData } = await supabase
      .from('detention_events')
      .select('arrival_time, departure_time')
      .not('departure_time', 'is', null);

    let avgDetention = 0;
    let totalDetentionCost = 0;

    if (detentionData && detentionData.length > 0) {
      const totalHours = detentionData.reduce((sum, event) => {
        const arrival = new Date(event.arrival_time).getTime();
        const departure = new Date(event.departure_time).getTime();
        const hours = (departure - arrival) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      avgDetention = Math.round((totalHours / detentionData.length) * 10) / 10;

      totalDetentionCost = Math.round(totalHours * 75);
    }

    const monthlyTarget = 7000;
    const percentageOfTarget = Math.round((totalDetentionCost / monthlyTarget) * 100);

    setStats({ totalActive, onTime, delayed, avgDetention });
    setLeaderboardStats({ totalDetentionCost, percentageOfTarget });
  }

  async function fetchLoadsWithDrivers() {
    const { data: loadsData } = await supabase
      .from('loads')
      .select('*')
      .order('scheduled_time', { ascending: false });

    const { data: driversData } = await supabase.from('drivers').select('id, name');
    const driversMap = new Map<string, Driver>();
    if (driversData) {
      for (const driver of driversData) {
        driversMap.set(driver.id, driver);
      }
    }

    const loadsWithDrivers = (loadsData || []).map((load) => ({
      ...load,
      driver: load.driver_id ? driversMap.get(load.driver_id) || null : null,
    }));

    setLoads(loadsWithDrivers);
    await calculateStats(loadsWithDrivers);
    setLoading(false);
  }

  useEffect(() => {
    fetchLoadsWithDrivers();

    const loadsChannel = supabase
      .channel('loads-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'loads' },
        () => {
          console.log('Realtime: Loads table changed, refreshing stats...');
          fetchLoadsWithDrivers();
        }
      )
      .subscribe();

    const driversChannel = supabase
      .channel('drivers-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        () => {
          console.log('Realtime: Drivers table changed, refreshing stats...');
          fetchLoadsWithDrivers();
        }
      )
      .subscribe();

    const subscriptionsChannel = supabase
      .channel('subscriptions-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => {
          console.log('Realtime: Subscriptions table changed, refreshing leaderboard...');
          calculateStats(loads);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(loadsChannel);
      supabase.removeChannel(driversChannel);
      supabase.removeChannel(subscriptionsChannel);
    };
  }, []);

  return { loads, stats, leaderboardStats, loading };
}
