import { useState, useEffect } from 'react';
import { Navigation, Play, Square, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGPSTracking } from '../hooks/useGPSTracking';

interface Driver {
  id: string;
  name: string;
}

interface Load {
  id: string;
  load_number: string;
  facility_address: string;
  status: string;
}

export default function DriverSimulator() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [loads, setLoads] = useState<Load[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [notification, setNotification] = useState<string>('');

  const { tracking, lastUpdate, error } = useGPSTracking({
    driverId: selectedDriver,
    enabled: isTracking,
    onGeofenceEnter: (_loadId, facilityAddress) => {
      setNotification(`Auto-arrived at ${facilityAddress}! Detention clock started.`);
      setTimeout(() => setNotification(''), 5000);
      fetchLoads();
    },
  });

  useEffect(() => {
    fetchDrivers();
    fetchLoads();
  }, []);

  async function fetchDrivers() {
    const { data } = await supabase
      .from('drivers')
      .select('id, name')
      .order('name', { ascending: true });

    if (data) setDrivers(data);
  }

  async function fetchLoads() {
    const { data } = await supabase
      .from('loads')
      .select('id, load_number, facility_address, status, driver_id')
      .eq('status', 'in_transit')
      .order('scheduled_time', { ascending: true });

    if (data) setLoads(data);
  }

  return (
    <div className="rounded-xl p-5 border border-white/10 bg-[#0F0F0F]">
      <div className="flex items-center gap-2 mb-4">
        <Navigation className="w-5 h-5 text-[#FF6B00]" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wide">Live GPS Tracking</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-2">
            Select Driver
          </label>
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            disabled={isTracking}
            className="w-full px-3 py-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] disabled:opacity-50"
          >
            <option value="">Choose a driver...</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
        </div>

        {notification && (
          <div className="flex items-center gap-2 p-3 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-[#FF6B00]" />
            <p className="text-xs text-[#FF6B00]">{notification}</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {!isTracking ? (
          <button
            onClick={() => { if (selectedDriver) setIsTracking(true); }}
            disabled={!selectedDriver}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#FF5500] disabled:bg-[#333] disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm transition-all"
          >
            <Play className="w-4 h-4" />
            Start Tracking
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-lg">
              <p className="text-xs font-bold text-[#FF6B00] mb-1">
                {tracking ? 'GPS Tracking Active' : 'Initializing...'}
              </p>
              <p className="text-xs text-gray-400">
                Updates every 60 seconds. Move within 200m of a facility to trigger auto-arrival.
              </p>
              {lastUpdate && (
                <p className="text-xs text-gray-500 mt-2">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
            <button
              onClick={() => setIsTracking(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1A1A] border border-white/10 hover:bg-white/5 text-white rounded-lg text-sm font-bold transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop Tracking
            </button>
          </div>
        )}

        {loads.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs font-bold text-gray-400 mb-2">
              In-Transit Loads ({loads.length})
            </p>
            <div className="space-y-2">
              {loads.map((load) => (
                <div
                  key={load.id}
                  className="p-2 bg-[#1A1A1A] rounded-lg border border-white/10"
                >
                  <p className="text-xs font-bold text-gray-300 font-mono">{load.load_number}</p>
                  <p className="text-xs text-gray-500 truncate">{load.facility_address}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
