export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  mode: 'subscription' | 'payment';
}

export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: 'prod_UJ3vc5fW8Skxh9',
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_SOLO || 'price_1TKRnqAaZYsJOOQJBIXw4bgo',
    name: 'SOLO',
    description: 'Perfect for individual dispatchers managing a small fleet',
    price: 49.00,
    currency: 'usd',
    mode: 'subscription'
  },
  {
    id: 'prod_UJ3vpMqV83ZbJu',
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_GROWTH || 'price_1TKRnvAaZYsJOOQJFaMxj85F',
    name: 'Growth',
    description: 'Ideal for growing dispatch operations with multiple drivers',
    price: 129.00,
    currency: 'usd',
    mode: 'subscription'
  },
  {
    id: 'prod_UJ3vZ4kCJtkZ4L',
    priceId: 'price_1TKRnvAaZYsJOOQJuzogwnTO',
    name: 'Fleet',
    description: 'Enterprise solution for large fleet management operations',
    price: 299.00,
    currency: 'usd',
    mode: 'subscription'
  }
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return STRIPE_PRODUCTS.find(product => product.priceId === priceId);
};

export const getProductByName = (name: string): StripeProduct | undefined => {
  return STRIPE_PRODUCTS.find(product => product.name.toLowerCase() === name.toLowerCase());
};