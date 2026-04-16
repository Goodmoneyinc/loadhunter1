import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Navigation, CheckCircle, Upload, Camera, Clock, MapPin, AlertCircle, Loader2, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isInsideGeofence } from '../lib/geocoding';

interface TrackedLoad {
  id: string;
  load_number: string;
  facility_address: string;
  facility_lat: number | null;
  facility_long: number | null;
  status: string;
  scheduled_time: string;
  driver_id: string | null;
  driver?: { id: string; name: string } | null;
}

type TrackingState = 'idle' | 'tracking' | 'arrived' | 'error';

export default function DriverTracking() {
  const { trackingId } = useParams<{ trackingId: string }>();
  const [load, setLoad] = useState<TrackedLoad | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [trackingState, setTrackingState] = useState<TrackingState>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const throttleRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (trackingId) fetchLoad();
    return () => stopWatch();
  }, [trackingId]);

  async function fetchLoad() {
    setPageLoading(true);
    const { data, error } = await supabase
      .from('loads')
      .select('id, load_number, facility_address, facility_lat, facility_long, status, scheduled_time, driver_id, driver:drivers(id, name)')
      .eq('tracking_id', trackingId)
      .maybeSingle();

    if (error || !data) {
      setNotFound(true);
      setPageLoading(false);
      return;
    }

    const driverData = Array.isArray(data.driver) ? data.driver[0] : data.driver;
    setLoad({ ...data, driver: driverData } as TrackedLoad);

    if (data.status === 'at_facility') {
      setTrackingState('arrived');
    }

    setPageLoading(false);
  }

  function stopWatch() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  const pushLocation = useCallback(async (lat: number, lng: number) => {
    if (!load?.driver_id) return;

    const now = Date.now();
    if (now - throttleRef.current < 55000) return;
    throttleRef.current = now;

    try {
      await supabase
        .from('drivers')
        .update({
          current_lat: lat,
          current_long: lng,
          last_gps_update: new Date().toISOString(),
          is_tracking: true,
        })
        .eq('id', load.driver_id);

      setLastUpdate(new Date());
      setGpsError(null);
    } catch {
      setGpsError('GPS update failed');
    }

    if (load.facility_lat && load.facility_long && load.status === 'in_transit') {
      const inside = isInsideGeofence(lat, lng, load.facility_lat, load.facility_long, 200);
      if (inside) {
        await handleArrival();
      }
    }
  }, [load]);

  async function handleArrival() {
    if (!load) return;

    await supabase
      .from('loads')
      .update({ status: 'at_facility' })
      .eq('id', load.id);

    await supabase
      .from('detention_events')
      .insert([{
        load_id: load.id,
        arrival_time: new Date().toISOString(),
        status: 'active',
      }]);

    setLoad(prev => prev ? { ...prev, status: 'at_facility' } : prev);
    setTrackingState('arrived');
    stopWatch();

    if (load.driver_id) {
      await supabase
        .from('drivers')
        .update({ is_tracking: false })
        .eq('id', load.driver_id);
    }
  }

  function startTracking() {
    if (!navigator.geolocation) {
      setGpsError('GPS is not available on this device');
      setTrackingState('error');
      return;
    }

    setTrackingState('tracking');
    setGpsError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        pushLocation(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        setGpsError(err.message || 'Could not get your location');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }

  async function handleBOLUpload(file: File) {
    if (!load) return;

    setUploading(true);
    setUploadError(null);

    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${load.id}/bol-${Date.now()}.${ext}`;

    const { error: storageError } = await supabase.storage
      .from('bol-documents')
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (storageError) {
      setUploadError('Upload failed. Please try again.');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('bol-documents')
      .getPublicUrl(filePath);

    await supabase
      .from('detention_events')
      .update({ bol_url: urlData.publicUrl })
      .eq('load_id', load.id)
      .eq('status', 'active');

    setUploadSuccess(true);
    setUploading(false);
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#FF6B00] animate-spin" />
      </div>
    );
  }

  if (notFound || !load) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#FF6B00]/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-[#FF6B00]" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Load Not Found</h1>
          <p className="text-sm text-gray-400">This tracking link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <header className="px-5 py-4 border-b border-white/10 bg-[#0F0F0F] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FF6B00] flex items-center justify-center">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold text-white uppercase tracking-wide truncate">LoadHunters</h1>
          <p className="text-[10px] text-gray-500 font-mono">ID: {trackingId}</p>
        </div>
      </header>

      <div className="flex-1 px-5 py-6 space-y-5 max-w-lg mx-auto w-full">
        <div className="rounded-xl border border-white/10 bg-[#0F0F0F] p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-[#FF6B00]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white leading-snug">{load.facility_address}</p>
              <p className="text-xs text-gray-500 font-mono mt-1">Load: {load.load_number}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-400">
                {new Date(load.scheduled_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' '}
                {new Date(load.scheduled_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
            {load.driver?.name && (
              <div className="flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-400">{load.driver.name}</span>
              </div>
            )}
          </div>
        </div>

        {trackingState === 'idle' && (
          <button
            onClick={startTracking}
            className="w-full py-5 rounded-2xl bg-[#FF6B00] hover:bg-[#FF5500] active:scale-[0.98] transition-all text-white font-black text-lg uppercase tracking-widest shadow-lg shadow-[#FF6B00]/30 hover:shadow-[#FF6B00]/50 flex items-center justify-center gap-3"
          >
            <Navigation className="w-6 h-6" />
            Start Tracking Trip
          </button>
        )}

        {trackingState === 'tracking' && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-[#FF6B00]/40 bg-[#FF6B00]/5 p-6 text-center">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-[#FF6B00]/50 animate-ping" />
                <div className="absolute inset-2 rounded-full border-2 border-[#FF6B00]/30 animate-ping" style={{ animationDelay: '0.5s' }} />
                <div className="relative w-full h-full rounded-full bg-[#FF6B00] flex items-center justify-center">
                  <Navigation className="w-7 h-7 text-white" />
                </div>
              </div>
              <p className="text-base font-bold text-white mb-1">GPS Tracking Active</p>
              <p className="text-xs text-gray-400">
                Updating every 60 seconds. Auto-arrival triggers within 200m of facility.
              </p>
              {lastUpdate && (
                <p className="text-[10px] text-gray-500 mt-3 font-mono">
                  Last sync: {lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>

            {gpsError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{gpsError}</p>
              </div>
            )}
          </div>
        )}

        {trackingState === 'arrived' && (
          <div className="space-y-5">
            <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <p className="text-lg font-bold text-white mb-1">Arrived at Facility</p>
              <p className="text-sm text-emerald-400 font-bold">Detention Clock Started</p>
              <p className="text-xs text-gray-500 mt-2">Your arrival has been logged automatically.</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0F0F0F] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Camera className="w-5 h-5 text-[#FF6B00]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Upload Signed BOL</h3>
              </div>

              {uploadSuccess ? (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-400">BOL Uploaded</p>
                    <p className="text-xs text-gray-400 mt-0.5">Document saved successfully.</p>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBOLUpload(file);
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full py-4 rounded-xl border-2 border-dashed border-white/20 hover:border-[#FF6B00]/40 bg-white/5 hover:bg-[#FF6B00]/5 transition-all flex flex-col items-center gap-2 disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-[#FF6B00]" />
                    )}
                    <span className="text-sm font-bold text-gray-300">
                      {uploading ? 'Uploading...' : 'Tap to Take Photo or Select File'}
                    </span>
                    <span className="text-[10px] text-gray-500">JPG, PNG, or PDF</span>
                  </button>

                  {uploadError && (
                    <div className="flex items-center gap-2 p-3 mt-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <p className="text-xs text-red-400">{uploadError}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {trackingState === 'error' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-white mb-1">GPS Not Available</p>
              <p className="text-xs text-gray-400">{gpsError || 'Please enable location services and try again.'}</p>
            </div>
            <button
              onClick={() => { setTrackingState('idle'); setGpsError(null); }}
              className="w-full py-3 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/15 transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      <footer className="px-5 py-4 border-t border-white/5 text-center">
        <p className="text-[10px] text-gray-600">Powered by LoadHunters Detention Tracking</p>
      </footer>
    </div>
  );
}
