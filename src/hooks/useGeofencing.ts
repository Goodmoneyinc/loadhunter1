import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { calculateDistance } from '../lib/geocoding';

interface GeofenceLoad {
  id: string;
  facility_lat: number;
  facility_long: number;
  facility_address: string;
  status: string;
}

interface GeofenceOptions {
  driverId: string;
  enabled: boolean;
  radiusMeters?: number;
  onArrival?: (loadId: string, address: string) => void;
}

export function useGeofencing({
  driverId,
  enabled,
  radiusMeters = 200,
  onArrival,
}: GeofenceOptions) {
  const [checkedLoads, setCheckedLoads] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !driverId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    checkProximity();
    intervalRef.current = window.setInterval(checkProximity, 60000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, driverId]);

  async function checkProximity() {
    try {
      const { data: driver } = await supabase
        .from('drivers')
        .select('current_lat, current_long')
        .eq('id', driverId)
        .maybeSingle();

      if (!driver?.current_lat || !driver?.current_long) return;

      const { data: loads } = await supabase
        .from('loads')
        .select('id, facility_lat, facility_long, facility_address, status')
        .eq('driver_id', driverId)
        .eq('status', 'in_transit');

      if (!loads || loads.length === 0) return;

      for (const load of loads as GeofenceLoad[]) {
        if (!load.facility_lat || !load.facility_long) continue;
        if (checkedLoads.has(load.id)) continue;

        const distance = calculateDistance(
          driver.current_lat,
          driver.current_long,
          load.facility_lat,
          load.facility_long
        );

        if (distance <= radiusMeters) {
          const { error: updateError } = await supabase
            .from('loads')
            .update({ status: 'at_facility' })
            .eq('id', load.id);

          if (!updateError) {
            await supabase
              .from('detention_events')
              .insert([{
                load_id: load.id,
                arrival_time: new Date().toISOString(),
                status: 'active',
                gps_lat: driver.current_lat,
                gps_long: driver.current_long,
              }]);

            setCheckedLoads(prev => new Set(prev).add(load.id));
            if (onArrival) onArrival(load.id, load.facility_address);
          }
        }
      }

      setError(null);
    } catch {
      setError('Geofence check failed');
    }
  }

  return { error };
}
