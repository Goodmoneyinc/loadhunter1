import React from 'react';
import { Crown, AlertCircle } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

export function SubscriptionStatus() {
  const { subscription, hasActiveSubscription, getPlanName, isSubscriptionExpired } = useSubscription();
  const navigate = useNavigate();

  if (!subscription) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
          <div className="flex-1">
            <p className="text-yellow-800 font-medium">No active subscription</p>
            <p className="text-yellow-700 text-sm">Subscribe to unlock all features</p>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            View Plans
          </button>
        </div>
      </div>
    );
  }

  if (isSubscriptionExpired()) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">Subscription expired</p>
            <p className="text-red-700 text-sm">Renew your subscription to continue using all features</p>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Renew
          </button>
        </div>
      </div>
    );
  }

  if (hasActiveSubscription) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <Crown className="w-5 h-5 text-green-600 mr-3" />
          <div className="flex-1">
            <p className="text-green-800 font-medium">{getPlanName()} Plan Active</p>
            <p className="text-green-700 text-sm">
              {subscription.current_period_end && 
                `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}