import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createBrowserSupabaseClient } from '../lib/supabase';
import DriverHub from '../components/DriverHub';
import { AlertCircle, Loader2 } from 'lucide-react';

interface TrackedLoad {
  id: string;
  load_number: string;
}

export default function DriverTracking() {
  const supabase = createBrowserSupabaseClient();
  const { trackingId } = useParams<{ trackingId: string }>();
  const [load, setLoad] = useState<TrackedLoad | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!trackingId) {
      setNotFound(true);
      setPageLoading(false);
      return;
    }
    fetchLoad();
  }, [trackingId]);

  async function fetchLoad() {
    setPageLoading(true);
    const { data, error } = await supabase
      .from('loads')
      .select('id, load_number')
      .eq('tracking_id', trackingId)
      .maybeSingle();

    if (error || !data) {
      setNotFound(true);
      setPageLoading(false);
      return;
    }

    setLoad(data as TrackedLoad);

    setPageLoading(false);
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

  return <DriverHub trackingId={trackingId as string} loadNumber={load.load_number} />;
}
