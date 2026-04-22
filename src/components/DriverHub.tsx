import { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from '../lib/supabase';

type EventType = 'arrived' | 'checked_in' | 'moved' | 'loading_started' | 'departed';

const EVENT_BUTTONS: { label: string; type: EventType }[] = [
  { label: 'Arrived at Facility', type: 'arrived' },
  { label: 'Checked In', type: 'checked_in' },
  { label: 'Moved Location', type: 'moved' },
  { label: 'Loading Started', type: 'loading_started' },
  { label: 'Departed', type: 'departed' },
];

interface DriverHubProps {
  trackingId: string;
  loadNumber?: string;
}

export default function DriverHub({ trackingId, loadNumber }: DriverHubProps) {
  const supabase = createBrowserSupabaseClient();
  const [loading, setLoading] = useState<EventType | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      return;
    }

    if (!navigator.permissions) {
      setLocationStatus('unknown');
      return;
    }

    let mounted = true;
    let permissionStatus: PermissionStatus | null = null;

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (!mounted) return;

        permissionStatus = result;
        setLocationStatus(result.state);

        if (result.state === 'prompt') {
          navigator.geolocation.getCurrentPosition(
            () => {
              if (mounted) setLocationStatus('granted');
            },
            () => {
              if (mounted) setLocationStatus('denied');
            },
            { timeout: 5000, enableHighAccuracy: false }
          );
        }

        result.onchange = () => {
          if (mounted) setLocationStatus(result.state);
        };
      })
      .catch(() => {
        if (mounted) setLocationStatus('unknown');
      });

    return () => {
      mounted = false;
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, []);

  const getGeolocation = (): Promise<{ lat: number | null; lng: number | null }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation || locationStatus === 'denied') {
        resolve({ lat: null, lng: null });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          resolve({ lat: null, lng: null });
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  };

  const handleEvent = async (eventType: EventType) => {
    setLoading(eventType);
    setFeedback(null);

    const { lat, lng } = await getGeolocation();

    const { error } = await supabase.rpc('insert_load_event_via_tracking', {
      p_tracking_id: trackingId,
      p_event_type: eventType,
      p_timestamp: new Date().toISOString(),
      p_gps_lat: lat,
      p_gps_long: lng,
      p_note: null,
    });

    if (error) {
      console.error(error);
      setFeedback({ message: 'Failed to record event. Please try again.', type: 'error' });
    } else {
      setFeedback({ message: `${eventType.replace('_', ' ')} recorded!`, type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    }

    setLoading(null);
  };

  const locationText = () => {
    switch (locationStatus) {
      case 'granted':
        return 'Location enabled.';
      case 'denied':
        return 'Location blocked - coordinates will not be captured.';
      case 'prompt':
        return 'Requesting location permission...';
      default:
        return 'Location is captured when available.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        {loadNumber && (
          <div className="text-center">
            <p className="text-sm text-gray-500">Load</p>
            <p className="text-2xl font-bold">#{loadNumber}</p>
          </div>
        )}

        {feedback && (
          <div
            className={`p-3 rounded-lg text-center font-medium ${
              feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="space-y-3">
          {EVENT_BUTTONS.map((btn) => (
            <button
              key={btn.type}
              onClick={() => handleEvent(btn.type)}
              disabled={loading !== null}
              className="w-full py-6 text-xl font-semibold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
              }}
            >
              {loading === btn.type ? 'Recording...' : btn.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-center text-gray-400 mt-8">{locationText()}</p>
      </div>
    </div>
  );
}
