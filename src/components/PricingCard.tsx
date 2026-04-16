import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { StripeProduct } from '../stripe-config';

interface PricingCardProps {
  product: StripeProduct;
  onSubscribe: (priceId: string) => Promise<void>;
  isPopular?: boolean;
}

export function PricingCard({ product, onSubscribe, isPopular = false }: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      await onSubscribe(product.priceId);
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const features = getFeaturesByPlan(product.name);

  return (
    <div className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
      isPopular ? 'border-blue-500 scale-105' : 'border-gray-200'
    }`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="p-8">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h3>
          <p className="text-gray-600 mb-4">{product.description}</p>
          <div className="flex items-baseline justify-center">
            <span className="text-5xl font-bold text-gray-900">${product.price}</span>
            <span className="text-gray-600 ml-2">/month</span>
          </div>
        </div>

        <ul className="space-y-4 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
            isPopular
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-900 hover:bg-gray-800 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? 'Processing...' : 'Get Started'}
        </button>
      </div>
    </div>
  );
}

function getFeaturesByPlan(planName: string): string[] {
  const features = {
    'SOLO': [
      'Up to 5 drivers',
      'Basic load tracking',
      'GPS monitoring',
      'Email support',
      'Mobile app access'
    ],
    'Growth': [
      'Up to 25 drivers',
      'Advanced load tracking',
      'Real-time GPS monitoring',
      'Detention tracking',
      'Priority support',
      'Custom reports',
      'API access'
    ],
    'Fleet': [
      'Unlimited drivers',
      'Enterprise load tracking',
      'Advanced GPS & geofencing',
      'Full detention management',
      'Dedicated support',
      'Custom integrations',
      'White-label options',
      'Advanced analytics'
    ]
  };

  return features[planName as keyof typeof features] || [];
}