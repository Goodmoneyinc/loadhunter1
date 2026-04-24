import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, MapPin, Calendar, User, Clock, CheckCircle, AlertTriangle, Loader2, Upload, FileCheck, Download, Navigation, Mail } from 'lucide-react';
import { LoadEventTimeline } from '@/components/LoadEventTimeline';
import StatusBadge from '../components/StatusBadge';
import LoadMap from '../components/LoadMap';
import { useGeofencing } from '../hooks/useGeofencing';
import { useLiveDetentionCalculator } from '../hooks/useLiveDetentionCalculator';
import { generateDetentionInvoicePDF } from '../lib/pdfGenerator';
import { DetentionSummaryCard } from '@/components/DetentionSummaryCard';

interface Load {
  id: string;
  load_number: string;
  status: string;
  facility_address: string;
  scheduled_time: string;
  driver_id: string;
  facility_lat: number | null;
  facility_long: number | null;
  free_time_hours: number;
  rate_per_hour: number;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
}

interface DetentionEvent {
  id: string;
  load_id: string;
  arrival_time: string | null;
  departure_time: string | null;
  gps_lat: number | null;
  gps_long: number | null;
  bol_url: string | null;
}

interface LoadEventProof {
  event_type: string;
  timestamp: string;
  gps_lat: string | null;
  gps_long: string | null;
  note: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function LoadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [detentionEvent, setDetentionEvent] = useState<DetentionEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'arrival' | 'departure' | 'bol' | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState<'download' | 'email' | null>(null);
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [invoiceMessage, setInvoiceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [error, setError] = useState('');
  const [geoNotification, setGeoNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoArrivalTriggered = useRef(false);

  const { driverLocation, isInsideGeofence } = useGeofencing({
    facilityLat: load?.facility_lat || 0,
    facilityLong: load?.facility_long || 0,
    radius: 200,
    enabled: !!(load?.facility_lat && load?.facility_long && !detentionEvent?.arrival_time),
    onEnter: () => {
      if (!autoArrivalTriggered.current && !detentionEvent?.arrival_time) {
        autoArrivalTriggered.current = true;
        handleAutoArrival();
      }
    },
  });

  useEffect(() => {
    fetchLoadDetails();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`load-detail-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'detention_events', filter: `load_id=eq.${id}` },
        () => {
          void fetchLoadDetails();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'loads', filter: `id=eq.${id}` },
        () => {
          void fetchLoadDetails();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id]);

  async function fetchLoadDetails() {
    try {
      setLoading(true);

      if (!id || !UUID_REGEX.test(id)) {
        setError('Invalid load ID format');
        setLoading(false);
        return;
      }

      const { data: loadData, error: loadError } = await supabase
        .from('loads')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (loadError) throw loadError;
      if (!loadData) {
        setError('Load not found');
        setLoading(false);
        return;
      }

      setLoad(loadData);

      if (loadData.driver_id) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('*')
          .eq('id', loadData.driver_id)
          .maybeSingle();

        setDriver(driverData);
      }

      const { data: detentionData } = await supabase
        .from('detention_events')
        .select('*')
        .eq('load_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setDetentionEvent(detentionData);
    } catch (err: any) {
      setError(err.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmArrival() {
    try {
      setActionLoading('arrival');
      setError('');

      let gpsLat = null;
      let gpsLong = null;

      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            });
          });
          gpsLat = position.coords.latitude;
          gpsLong = position.coords.longitude;
        } catch (geoError) {
          console.warn('GPS capture failed, continuing without location:', geoError);
        }
      }

      const { data, error } = await supabase
        .from('detention_events')
        .insert([
          {
            load_id: id,
            arrival_time: new Date().toISOString(),
            gps_lat: gpsLat,
            gps_long: gpsLong,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setDetentionEvent(data);

      await supabase
        .from('loads')
        .update({ status: 'in_facility' })
        .eq('id', id);

      if (load) {
        setLoad({ ...load, status: 'in_facility' });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to confirm arrival');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConfirmDeparture() {
    if (!detentionEvent) return;

    try {
      setActionLoading('departure');
      setError('');

      const { data, error } = await supabase
        .from('detention_events')
        .update({ departure_time: new Date().toISOString() })
        .eq('id', detentionEvent.id)
        .select()
        .single();

      if (error) throw error;

      setDetentionEvent(data);

      await supabase
        .from('loads')
        .update({ status: 'completed' })
        .eq('id', id);

      if (load) {
        setLoad({ ...load, status: 'completed' });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to confirm departure');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBOLUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !detentionEvent) return;

    try {
      setActionLoading('bol');
      setError('');

      const fileExt = file.name.split('.').pop();
      const fileName = `${detentionEvent.load_id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('bol-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('bol-documents')
        .getPublicUrl(filePath);

      const { data, error: updateError } = await supabase
        .from('detention_events')
        .update({ bol_url: publicUrl })
        .eq('id', detentionEvent.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setDetentionEvent(data);

      await supabase
        .from('loads')
        .update({ status: 'archived' })
        .eq('id', id);

      if (load) {
        setLoad({ ...load, status: 'archived' });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload BOL');
    } finally {
      setActionLoading(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleAutoArrival() {
    try {
      setGeoNotification('Arrival Detected - Detention Clock Started');
      setTimeout(() => setGeoNotification(null), 5000);

      if (!detentionEvent) {
        const { data, error: createError } = await supabase
          .from('detention_events')
          .insert([{
            load_id: id,
            arrival_time: new Date().toISOString(),
            gps_lat: driverLocation?.latitude || null,
            gps_long: driverLocation?.longitude || null,
          }])
          .select()
          .single();

        if (createError) throw createError;
        setDetentionEvent(data);

        await supabase
          .from('loads')
          .update({ status: 'at_facility' })
          .eq('id', id);

        if (load) {
          setLoad({ ...load, status: 'at_facility' });
        }
      }
    } catch (err: any) {
      console.error('Auto-arrival error:', err);
    }
  }

  function formatDuration(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  }

  async function buildInvoice() {
    if (!detentionEvent?.arrival_time || !detentionEvent?.departure_time || !load || !driver) return;

    const arrival = new Date(detentionEvent.arrival_time).getTime();
    const departure = new Date(detentionEvent.departure_time).getTime();
    const hours = (departure - arrival) / (1000 * 60 * 60);
    const cost = Math.max(0, (hours - load.free_time_hours) * load.rate_per_hour);

    const { data: timelineEvents } = await supabase
      .from('load_events')
      .select('event_type, timestamp, gps_lat, gps_long, note')
      .eq('load_id', load.id)
      .order('timestamp', { ascending: true });

    return generateDetentionInvoicePDF({
      companyName: 'Logistics Pro',
      loadNumber: load.load_number || load.id.slice(0, 8),
      facilityAddress: load.facility_address,
      arrivalTime: detentionEvent.arrival_time,
      departureTime: detentionEvent.departure_time,
      totalDuration: hours,
      calculatedCost: cost,
      driverName: driver.name,
      gpsVerified: !!(detentionEvent.gps_lat && detentionEvent.gps_long),
      ratePerHour: load.rate_per_hour,
      freeTimeHours: load.free_time_hours,
      arrivalGpsLat: detentionEvent.gps_lat ? String(detentionEvent.gps_lat) : null,
      arrivalGpsLong: detentionEvent.gps_long ? String(detentionEvent.gps_long) : null,
      bolImageUrl: detentionEvent.bol_url,
      timelineEvents: (timelineEvents ?? []).map((event: LoadEventProof) => ({
        eventType: event.event_type,
        timestamp: event.timestamp,
        gpsLat: event.gps_lat,
        gpsLong: event.gps_long,
        note: event.note,
      })),
    });
  }

  async function handleDownloadPDF() {
    try {
      setInvoiceLoading('download');
      setInvoiceMessage(null);
      const invoice = await buildInvoice();
      if (!invoice) return;

      const url = URL.createObjectURL(invoice.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = invoice.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setInvoiceMessage({ type: 'success', text: 'Invoice generated and downloaded.' });
    } catch (err: any) {
      setInvoiceMessage({ type: 'error', text: err.message || 'Failed to generate invoice.' });
    } finally {
      setInvoiceLoading(null);
    }
  }

  async function handleEmailInvoice() {
    if (!invoiceEmail.trim()) {
      setInvoiceMessage({ type: 'error', text: 'Enter an email address first.' });
      return;
    }

    try {
      setInvoiceLoading('email');
      setInvoiceMessage(null);
      const invoice = await buildInvoice();
      if (!invoice) return;

      const arrayBuffer = await invoice.blob.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const pdfBase64 = btoa(binary);

      const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      if (!baseUrl) throw new Error('VITE_SUPABASE_URL is missing.');
      const endpoint = `${baseUrl}/functions/v1/send-detention-invoice`;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          loadId: load.id,
          recipientEmail: invoiceEmail.trim(),
          filename: invoice.filename,
          pdfBase64,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send invoice email.');
      }

      setInvoiceMessage({ type: 'success', text: `Invoice sent to ${invoiceEmail.trim()}.` });
    } catch (err: any) {
      setInvoiceMessage({ type: 'error', text: err.message || 'Failed to send invoice.' });
    } finally {
      setInvoiceLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/loads')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Back to loads"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Load Details</h2>
            <p className="text-sm text-slate-500 mt-0.5">Loading...</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading load details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !load) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/loads')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Back to loads"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Load Details</h2>
            <p className="text-sm text-slate-500 mt-0.5">Error loading load</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
            <p className="text-lg font-semibold text-white mb-2">Load Not Found</p>
            <p className="text-sm text-slate-500 mb-4">{error || 'This load does not exist or you do not have access to it.'}</p>
            <button
              onClick={() => navigate('/loads')}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Back to Active Loads
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasArrived = !!detentionEvent?.arrival_time;
  const hasDeparted = !!detentionEvent?.departure_time;
  const {
    current_detention_amount,
    formatted_detention_amount,
    current_detention_hours,
    current_billable_hours,
  } = useLiveDetentionCalculator({
    arrival_time: detentionEvent?.arrival_time,
    departure_time: detentionEvent?.departure_time,
    free_time_hours: load.free_time_hours,
    rate_per_hour: load.rate_per_hour,
  });
  const detentionHours = hasArrived ? current_detention_hours : null;
  const overThreshold = current_billable_hours > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/loads')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Back to loads"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Load Details</h2>
          <p className="text-sm text-slate-500 mt-0.5">Track detention and verify check-in times</p>
        </div>
      </div>

      {geoNotification && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-start gap-3 animate-pulse">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-400 font-semibold">{geoNotification}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Load #{load.id.slice(0, 8)}</h3>
            <p className="text-xs text-slate-500">ID: {load.id}</p>
          </div>
          <StatusBadge status={load.status} />
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Facility Address</p>
              <p className="text-sm font-medium text-white">{load.facility_address}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-sky-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-sky-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Scheduled Time</p>
              <p className="text-sm font-medium text-white">
                {new Date(load.scheduled_time).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </p>
            </div>
          </div>

          {driver && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Assigned Driver</p>
                <p className="text-sm font-medium text-white">{driver.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{driver.phone}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <DetentionSummaryCard
        arrivalTime={detentionEvent?.arrival_time}
        departureTime={detentionEvent?.departure_time}
        freeTimeHours={load.free_time_hours}
        ratePerHour={load.rate_per_hour}
      />

      {load.facility_lat && load.facility_long && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Navigation className="w-5 h-5 text-sky-400" />
            <h3 className="text-lg font-bold text-white">GPS Tracking</h3>
          </div>
          <div className="h-[300px] w-full rounded-xl overflow-hidden border-2 border-slate-800 mb-4">
            <LoadMap
              facilityLat={load.facility_lat}
              facilityLong={load.facility_long}
              facilityName={load.facility_address}
              driverLat={driverLocation?.latitude}
              driverLong={driverLocation?.longitude}
              driverName={driver?.name}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isInsideGeofence ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <p className="text-xs text-slate-400">
                {isInsideGeofence ? 'Inside geofence - Auto-arrival enabled' : 'Outside geofence area'}
              </p>
            </div>
            {driverLocation && (
              <p className="text-xs text-slate-500">
                Accuracy: ±{Math.round(driverLocation.accuracy)}m
              </p>
            )}
          </div>
        </div>
      )}

      {id && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="rounded-lg bg-white p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Timeline</h2>
            <LoadEventTimeline loadId={id} />
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-bold text-white">Detention Verification</h3>
        </div>

        {detentionEvent && (
          <div className="mb-6 space-y-3">
            {hasArrived && (
              <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">Arrival Confirmed</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(detentionEvent.arrival_time!).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {hasDeparted && (
              <div className="flex items-center justify-between p-4 bg-sky-500/10 border border-sky-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-sky-400" />
                  <div>
                    <p className="text-sm font-semibold text-sky-400">Departure Confirmed</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(detentionEvent.departure_time!).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {detentionHours !== null && (
              <div
                className={`p-6 rounded-xl border-2 ${
                  overThreshold
                    ? 'bg-orange-500/10 border-orange-500/30'
                    : 'bg-emerald-500/10 border-emerald-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                      {overThreshold ? 'PAYABLE DETENTION' : 'Standard Window'}
                    </p>
                    <p className={`text-4xl font-bold ${overThreshold ? 'text-orange-400' : 'text-emerald-400'}`}>
                      {formatDuration(detentionHours)}
                    </p>
                  </div>
                  {overThreshold && (
                    <div className="text-right">
                      <AlertTriangle className="w-10 h-10 text-orange-400 mb-1" />
                      <p className="text-xs font-bold text-orange-400 uppercase">Billable</p>
                    </div>
                  )}
                </div>
                {overThreshold && (
                  <div className="mt-4 pt-4 border-t border-orange-500/20">
                    <p className="text-sm font-semibold text-orange-400 mb-2">
                      PAYABLE DETENTION: {formatDuration(current_billable_hours)}
                    </p>
                    <p className="text-xs text-slate-400">
                      Billable time beyond 2-hour threshold
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Estimated cost: <span className="font-semibold text-orange-400">{formatted_detention_amount}</span>
                    </p>
                  </div>
                )}
                {!overThreshold && (
                  <p className="text-xs text-emerald-400/70 mt-2">
                    Within standard 2-hour window
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          {!hasArrived && (
            <button
              onClick={handleConfirmArrival}
              disabled={actionLoading === 'arrival'}
              className="w-full py-5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 touch-manipulation active:scale-[0.98]"
            >
              {actionLoading === 'arrival' ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Confirming Arrival...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6" />
                  <span>Confirm Arrival</span>
                </>
              )}
            </button>
          )}

          {hasArrived && !hasDeparted && (
            <button
              onClick={handleConfirmDeparture}
              disabled={actionLoading === 'departure'}
              className="w-full py-5 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 touch-manipulation active:scale-[0.98]"
            >
              {actionLoading === 'departure' ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Confirming Departure...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6" />
                  <span>Confirm Departure</span>
                </>
              )}
            </button>
          )}

          {hasDeparted && !detentionEvent?.bol_url && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleBOLUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={actionLoading === 'bol'}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 touch-manipulation active:scale-[0.98]"
              >
                {actionLoading === 'bol' ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Uploading BOL...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6" />
                    <span>Upload Signed BOL</span>
                  </>
                )}
              </button>
            </>
          )}

          {detentionEvent?.bol_url && (
            <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <FileCheck className="w-6 h-6 text-blue-400" />
                <div>
                  <p className="text-sm font-semibold text-blue-400">BOL Uploaded</p>
                  <p className="text-xs text-slate-400 mt-0.5">Ready for Billing</p>
                </div>
              </div>
              <a
                href={detentionEvent.bol_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                View Document
              </a>
            </div>
          )}

          {hasDeparted && detentionEvent?.arrival_time && detentionEvent?.departure_time && (
            <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
              <p className="text-sm font-semibold text-white">Generate Detention Invoice</p>
              <button
                onClick={() => void handleDownloadPDF()}
                disabled={invoiceLoading !== null}
                className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 hover:from-orange-500 hover:to-orange-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 touch-manipulation active:scale-[0.98]"
              >
                {invoiceLoading === 'download' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                <span>Download PDF</span>
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={invoiceEmail}
                  onChange={(event) => setInvoiceEmail(event.target.value)}
                  placeholder="Enter recipient email"
                  className="h-11 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
                />
                <button
                  onClick={() => void handleEmailInvoice()}
                  disabled={invoiceLoading !== null}
                  className="h-11 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {invoiceLoading === 'email' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Send
                </button>
              </div>

              {invoiceMessage && (
                <p className={`text-sm ${invoiceMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {invoiceMessage.text}
                </p>
              )}
            </div>
          )}

          {hasDeparted && (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500">Load verification complete</p>
            </div>
          )}
        </div>

        {!hasArrived && (
          <p className="text-xs text-center text-slate-500 mt-4">
            Tap "Confirm Arrival" when you reach the facility to start tracking detention time
          </p>
        )}

        {hasArrived && !hasDeparted && (
          <p className="text-xs text-center text-slate-500 mt-4">
            Tap "Confirm Departure" when leaving the facility to complete detention tracking
          </p>
        )}
      </div>
    </div>
  );
}
