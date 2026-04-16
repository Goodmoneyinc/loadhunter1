import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function StripeDebug() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkConfig();
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }

  async function checkConfig() {
    try {
      setLoading(true);
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-config-check`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      setConfig(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function testCheckout() {
    try {
      setError('');
      console.log('Testing checkout...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not logged in');
        return;
      }

      console.log('User:', user.id);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
      console.log('Calling:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin,
        },
        body: JSON.stringify({ planId: 'solo' }),
      });

      console.log('Response status:', response.status);

      const responseText = await response.text();
      console.log('Response body:', responseText);

      if (!response.ok) {
        setError(`Checkout failed: ${responseText}`);
      } else {
        const data = JSON.parse(responseText);
        console.log('Success! URL:', data.url);
        setError(`Success! Would redirect to: ${data.url}`);
      }
    } catch (err: any) {
      console.error('Test error:', err);
      setError(`Error: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-electric-cyan animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Stripe Configuration Debug</h1>
        <p className="text-slate-400">Check your Stripe integration status</p>
      </div>

      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Authentication Status</h2>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-white">Logged in as: {user.email}</p>
                <p className="text-slate-400 text-sm">User ID: {user.id}</p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-red-400" />
              <p className="text-white">Not logged in</p>
            </>
          )}
        </div>
      </div>

      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Stripe Configuration</h2>
        {config && (
          <div className="space-y-3">
            <ConfigItem
              label="Stripe Secret Key"
              status={config.hasStripeSecretKey}
            />
            <ConfigItem
              label="Solo Plan Price ID"
              status={config.hasStripeSoloPrice}
              value={config.stripeSoloPrice}
            />
            <ConfigItem
              label="Growth Plan Price ID"
              status={config.hasStripeGrowthPrice}
              value={config.stripeGrowthPrice}
            />
            <ConfigItem
              label="Fleet Plan Price ID"
              status={config.hasStripeFleetPrice}
              value={config.stripeFleetPrice}
            />
            <ConfigItem
              label="Webhook Secret"
              status={config.hasWebhookSecret}
            />
          </div>
        )}
      </div>

      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Test Checkout</h2>
        <p className="text-slate-400 text-sm">
          Click below to test the checkout flow without redirecting
        </p>
        <button
          onClick={testCheckout}
          disabled={!user}
          className="px-4 py-2 bg-electric-cyan text-slate-900 font-semibold rounded-lg hover:bg-electric-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Test Checkout (Solo Plan)
        </button>
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <pre className="text-sm text-red-400 whitespace-pre-wrap break-all">{error}</pre>
          </div>
        )}
      </div>

      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Environment Variables</h2>
        <div className="space-y-2">
          <ConfigItem
            label="VITE_SUPABASE_URL"
            status={!!import.meta.env.VITE_SUPABASE_URL}
            value={import.meta.env.VITE_SUPABASE_URL}
          />
          <ConfigItem
            label="VITE_SUPABASE_ANON_KEY"
            status={!!import.meta.env.VITE_SUPABASE_ANON_KEY}
            value={import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...'}
          />
        </div>
      </div>
    </div>
  );
}

function ConfigItem({ label, status, value }: { label: string; status: boolean; value?: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
      {status ? (
        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium">{label}</p>
        {value && <p className="text-slate-400 text-sm break-all">{value}</p>}
        {!status && (
          <p className="text-red-400 text-sm">Not configured</p>
        )}
      </div>
    </div>
  );
}
