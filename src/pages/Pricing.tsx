import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PricingCard } from '../components/PricingCard';
import { STRIPE_PRODUCTS } from '../stripe-config';
import { supabase } from '../lib/supabase';

const PLAN_FEATURES = {
  SOLO: [
    'Up to 5 drivers',
    'Basic load tracking',
    'GPS monitoring',
    'Email support',
    'Mobile app access'
  ],
  Growth: [
    'Up to 25 drivers',
    'Advanced load tracking',
    'Real-time GPS tracking',
    'Detention tracking',
    'Priority support',
    'Custom reports',
    'API access'
  ],
  Fleet: [
    'Unlimited drivers',
    'Enterprise load management',
    'Advanced analytics',
    'Custom integrations',
    'Dedicated support',
    'White-label options',
    'SLA guarantee'
  ]
};

export function Pricing() {
  const navigate = useNavigate();

  const handleSubscribe = async (priceId: string) => {
    try {
      // Map priceId to planId (solo, growth, fleet)
      const product = STRIPE_PRODUCTS.find(p => p.priceId === priceId);
      if (!product) {
        throw new Error('Invalid product');
      }

      const planId = product.name.toLowerCase();

      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: { planId },
      });

      if (error) {
        console.error('Checkout error:', error);
        throw new Error(error.message || 'Failed to create checkout session');
      }

      if (!data?.url) {
        throw new Error('No checkout URL returned');
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start checkout process. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Select the perfect plan for your logistics operation. All plans include core features
            with different limits and advanced capabilities.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {STRIPE_PRODUCTS.map((product, index) => (
            <PricingCard
              key={product.id}
              product={product}
              onSubscribe={handleSubscribe}
              isPopular={product.name === 'Growth'}
              features={PLAN_FEATURES[product.name as keyof typeof PLAN_FEATURES] || []}
            />
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Need a custom solution? Contact our sales team for enterprise pricing.
          </p>
          <button
            onClick={() => navigate('/contact')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Contact Sales →
          </button>
        </div>
      </div>
    </div>
  );
}