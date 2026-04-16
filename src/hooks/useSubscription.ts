import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  plan_type: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    fetchSubscription();
  }, [user]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setSubscription(data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
    } finally {
      setLoading(false);
    }
  };

  const hasActiveSubscription = subscription?.status === 'active';

  const getPlanName = () => {
    return subscription?.plan_type || 'Free';
  };

  const isSubscriptionExpired = () => {
    if (!subscription?.current_period_end) return false;
    return new Date(subscription.current_period_end) < new Date();
  };

  const canAddTruck = async (): Promise<{ allowed: boolean; reason?: string; plan?: string; limit?: number; currentCount?: number }> => {
    if (!hasActiveSubscription) return { allowed: false, reason: 'no_subscription' };

    const planType = subscription?.plan_type?.toLowerCase() || '';
    let limit = Infinity;
    if (planType === 'solo') limit = 1;
    else if (planType === 'growth') limit = 5;

    if (limit === Infinity) return { allowed: true };

    const { count } = await supabase
      .from('drivers')
      .select('id', { count: 'exact', head: true });

    const currentCount = count || 0;
    if (currentCount >= limit) {
      return { allowed: false, reason: 'limit_reached', plan: subscription?.plan_type || '', limit, currentCount };
    }
    return { allowed: true, plan: subscription?.plan_type || '', limit, currentCount };
  };

  return {
    subscription,
    loading,
    error,
    hasActiveSubscription,
    getPlanName,
    isSubscriptionExpired,
    canAddTruck,
    refetch: fetchSubscription
  };
}