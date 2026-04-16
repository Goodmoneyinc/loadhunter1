import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

export function SuccessPage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600">
            Thank you for subscribing. Your account has been activated and you now have access to all features.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 font-medium">
            Welcome to your new plan!
          </p>
          <p className="text-green-700 text-sm mt-1">
            You can start managing your loads and drivers right away.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
          
          <p className="text-sm text-gray-500">
            Redirecting automatically in {countdown} seconds...
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Need help getting started? Check out our{' '}
            <button
              onClick={() => navigate('/help')}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              help center
            </button>
            {' '}or contact support.
          </p>
        </div>
      </div>
    </div>
  );
}