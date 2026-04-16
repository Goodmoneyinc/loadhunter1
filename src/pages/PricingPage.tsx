import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PricingCard } from '../components/PricingCard';
import { STRIPE_PRODUCTS } from '../stripe-config';

export function PricingPage() {
  const navigate = useNavigate();

  const handleSubscribe = async (priceId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/success`,
          cancelUrl: `${window.location.origin}/pricing`
        })
      });

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
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
            Select the perfect plan for your dispatch operation. All plans include our core features with varying limits and support levels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {STRIPE_PRODUCTS.map((product, index) => (
            <PricingCard
              key={product.id}
              product={product}
              onSubscribe={handleSubscribe}
              isPopular={product.name === 'Growth'}
            />
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="text-gray-600 mb-4">
            Need a custom solution? Contact our sales team for enterprise pricing.
          </p>
          <button
            onClick={() => navigate('/contact')}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Contact Sales →
          </button>
        </div>
      </div>
    </div>
  );
}