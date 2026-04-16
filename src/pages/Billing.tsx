import { useState, useEffect } from 'react';
import { Check, Loader2, AlertTriangle, CreditCard, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Subscription {
  id: string;
  status: string;
  plan_type: string;
  current_period_end: string;
}

const plans = [
  {
    id: 'solo',
    name: 'Solo',
    price: 49,
    description: 'Perfect for independent operators',
    features: [
      'Up to 50 loads per month',
      '1 driver account',
      'GPS tracking',
      'Basic detention tracking',
      'Email support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 129,
    description: 'For growing fleets',
    features: [
      'Unlimited loads',
      'Up to 10 drivers',
      'Advanced GPS tracking',
      'Full detention management',
      'Priority support',
      'Custom reports',
    ],
    popular: true,
  },
  {
    id: 'fleet',
    name: 'Fleet',
    price: 249,
    description: 'Enterprise-grade solution',
    features: [
      'Unlimited everything',
      'Unlimited drivers',
      'Real-time fleet monitoring',
      'Advanced analytics',
      'Dedicated support',
      'API access',
      'Custom integrations',
    ],
  },
];

export default function Billing() {
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [fetchingSubscription, setFetchingSubscription] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchSubscription();

    // Check if returning from Stripe checkout (success or canceled)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true' || urlParams.get('canceled') === 'true') {
      // Wait 2 seconds for webhook to process, then refetch
      const timer = setTimeout(() => {
        console.log('Auto-refreshing subscription after checkout...');
        fetchSubscription();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  async function fetchSubscription() {
    try {
      setFetchingSubscription(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (err: any) {
      console.error('Error fetching subscription:', err);
    } finally {
      setFetchingSubscription(false);
    }
  }

  async function handleCheckout(planId: string) {
    try {
      setLoading(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        setError('You must be logged in to subscribe');
        return;
      }

      console.log('Creating checkout session for plan:', planId, 'user:', user.id);

      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: { planId },
      });

      if (error) {
        console.error('Checkout error:', error);
        throw new Error(error.message || 'Failed to create checkout session');
      }

      console.log('Checkout session created:', data);

      if (!data?.url) {
        throw new Error('No checkout URL returned from server');
      }

      window.location.assign(data.url);
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  }

  async function handleManageSubscription() {
    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase.functions.invoke('stripe-portal');

      if (error) {
        throw new Error(error.message || 'Failed to open portal');
      }

      if (!data?.url) {
        throw new Error('No portal URL returned');
      }

      window.location.assign(data.url);
    } catch (err: any) {
      setError(err.message || 'Failed to open customer portal');
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncSubscription() {
    try {
      setSyncing(true);
      setError('');
      console.log('Manually syncing subscription status...');
      await fetchSubscription();
    } catch (err: any) {
      setError(err.message || 'Failed to sync subscription');
    } finally {
      setSyncing(false);
    }
  }

  if (fetchingSubscription) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Billing</h2>
          <p className="text-sm text-gray-400 mt-1">Loading subscription details...</p>
        </div>
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-extra-wide uppercase">Billing</h2>
        <p className="text-sm text-gray-400 mt-1">Choose the perfect plan for your business</p>
      </div>

      {error && (
        <div className="rounded-xl p-4 border border-red-500/30 bg-red-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}

      {subscription && subscription.status === 'active' && (
        <div className="rounded-xl p-6 border border-[#FF6B00]/30 bg-[#FF6B00]/5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Active Subscription</h3>
              <p className="text-sm text-gray-400">
                You're currently on the <span className="text-[#FF6B00] font-bold capitalize">{subscription.plan_type}</span> plan
              </p>
              {subscription.current_period_end && (
                <p className="text-xs text-slate-500 mt-2">
                  Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncSubscription}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-semibold rounded-lg hover:bg-white/20 disabled:opacity-50 transition-all"
                title="Refresh subscription status"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleManageSubscription}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-semibold rounded-lg hover:bg-white/20 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
                Manage Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {(!subscription || subscription.status !== 'active') && (
        <div className="rounded-xl p-6 border border-white/10 bg-[#0F0F0F]">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">No Active Subscription</h3>
              <p className="text-sm text-gray-400">
                Choose a plan below to get started
              </p>
            </div>
            <button
              onClick={handleSyncSubscription}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-semibold rounded-lg hover:bg-white/20 disabled:opacity-50 transition-all"
              title="Refresh subscription status"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Sync Status
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-2xl p-8 relative transition-all hover:shadow-xl bg-[#0F0F0F] ${
              plan.popular
                ? 'border border-[#FF6B00]/50 shadow-lg shadow-[#FF6B00]/10'
                : 'border border-white/10 hover:border-[#FF6B00]/20'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1 bg-[#FF6B00] text-white text-xs font-bold rounded-full tracking-wide">
                  MOST POPULAR
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-white">${plan.price}</span>
                <span className="text-gray-400 text-sm">/month</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#FF6B00] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(plan.id)}
              disabled={loading || (subscription?.status === 'active' && subscription?.plan_type === plan.id)}
              className={`w-full py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                subscription?.status === 'active' && subscription?.plan_type === plan.id
                  ? 'bg-[#1A1A1A] border border-white/10 text-gray-500 cursor-default'
                  : 'bg-[#FF6B00] text-white hover:bg-[#FF5500]'
              } disabled:cursor-not-allowed`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : subscription?.status === 'active' && subscription?.plan_type === plan.id ? (
                'Current Plan'
              ) : subscription?.status === 'active' ? (
                'Switch Plan'
              ) : (
                'Get Started'
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-6 text-center border border-white/10 bg-[#0F0F0F]">
        <h3 className="text-lg font-bold text-white mb-2">Need a custom solution?</h3>
        <p className="text-sm text-gray-400 mb-4">
          Contact us for enterprise pricing and custom features tailored to your fleet
        </p>
        <a
          href="mailto:sales@example.com"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-all"
        >
          Contact Sales
        </a>
      </div>
    </div>
  );
}
