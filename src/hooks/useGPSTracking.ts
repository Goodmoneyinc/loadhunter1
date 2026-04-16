import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { isInsideGeofence } from '../lib/geocoding';

interface GPSTrackingOptions {
  driverId: string;
  enabled: boolean;
  onGeofenceEnter?: (loadId: string, facilityAddress: string) => void;
}

export function useGPSTracking({ driverId, enabled, onGeofenceEnter }: GPSTrackingOptions) {
  const [tracking, setTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const throttleRef = useRef<number>(0);
  const enabledRef = useRef(enabled);
  const driverIdRef = useRef(driverId);

  enabledRef.current = enabled;
  driverIdRef.current = driverId;

  const pushLocation = useCallback(async (lat: number, lng: number) => {
    const now = Date.now();
    if (now - throttleRef.current < 55000) return;
    throttleRef.current = now;

    try {
      const { error: updateError } = await supabase
        .from('drivers')
        .update({
          current_lat: lat,
          current_long: lng,
          last_gps_update: new Date().toISOString(),
        })
        .eq('id', driverIdRef.current);

      if (updateError) {
        setError('Failed to update GPS');
        return;
      }

      setLastUpdate(new Date());
      setError(null);

      await checkGeofenceEntry(lat, lng);
    } catch {
      setError('GPS update failed');
    }
  }, []);

  async function checkGeofenceEntry(currentLat: number, currentLng: number) {
    try {
      const { data: loads, error: loadsError } = await supabase
        .from('loads')
        .select('id, facility_address, facility_lat, facility_long, status')
        .eq('driver_id', driverIdRef.current)
        .eq('status', 'in_transit');

      if (loadsError || !loads || loads.length === 0) return;

      for (const load of loads) {
        if (!load.facility_lat || !load.facility_long) continue;

        const inside = isInsideGeofence(
          currentLat,
          currentLng,
          load.facility_lat,
          load.facility_long,
          200
        );

        if (inside) {
          await triggerAutoArrival(load.id, load.facility_address);
        }
      }
    } catch {
      // silently fail geofence check
    }
  }

  async function triggerAutoArrival(loadId: string, facilityAddress: string) {
    try {
      const { error: updateError } = await supabase
        .from('loads')
        .update({ status: 'at_facility' })
        .eq('id', loadId);

      if (updateError) return;

      await supabase
        .from('detention_events')
        .insert([{
          load_id: loadId,
          arrival_time: new Date().toISOString(),
          status: 'active',
        }]);

      if (onGeofenceEnter) {
        onGeofenceEnter(loadId, facilityAddress);
      }
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    if (!enabled || !driverId) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (driverId) {
        supabase.from('drivers').update({ is_tracking: false }).eq('id', driverId);
      }
      setTracking(false);
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setTracking(true);
    setError(null);

    supabase.from('drivers').update({ is_tracking: true }).eq('id', driverId);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        pushLocation(latitude, longitude);
      },
      (err) => {
        setError(err.message || 'Failed to get GPS location');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      supabase.from('drivers').update({ is_tracking: false }).eq('id', driverId);
      setTracking(false);
    };
  }, [enabled, driverId, pushLocation]);

  return {
    tracking,
    lastUpdate,
    error,
  };
}
