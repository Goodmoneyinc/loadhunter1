import React from 'react';
import { Crown, AlertCircle } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

export function SubscriptionBanner() {
  const { subscription, hasActiveSubscription, getPlanName } = useSubscription();
  const navigate = useNavigate();

  if (!subscription) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-yellow-400 mr-3" />
          <div className="flex-1">
            <p className="text-sm text-yellow-700">
              You don't have an active subscription. 
              <button
                onClick={() => navigate('/pricing')}
                className="ml-1 font-medium text-yellow-800 hover:text-yellow-900 underline"
              >
                Choose a plan to get started
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasActiveSubscription) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
          <div className="flex-1">
            <p className="text-sm text-red-700">
              Your subscription is {subscription.status}. 
              <button
                onClick={() => navigate('/pricing')}
                className="ml-1 font-medium text-red-800 hover:text-red-900 underline"
              >
                Update your subscription
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const planName = getPlanName();
  
  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
      <div className="flex items-center">
        <Crown className="h-5 w-5 text-blue-400 mr-3" />
        <div className="flex-1">
          <p className="text-sm text-blue-700">
            <span className="font-medium">Active Plan: {planName}</span>
            {subscription.current_period_end && (
              <span className="ml-2">
                • Renews {new Date(subscription.current_period_end).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}