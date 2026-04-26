import { Link, useNavigate } from 'react-router-dom';
import { Truck, LogOut, User, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';

export function Navigation() {
  const { user, signOut } = useAuth();
  const { getPlanName } = useSubscription();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const planName = getPlanName();
  const planLabel = planName && planName !== 'Free' ? `${planName} Plan` : 'Pricing';

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/dashboard" className="flex items-center space-x-2 text-gray-900">
            <Truck className="h-5 w-5 text-orange-600" />
            <span className="font-semibold">LoadHunter</span>
          </Link>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  to="/billing"
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm">{planLabel}</span>
                </Link>

                <div className="flex items-center space-x-2 text-gray-600">
                  <User className="h-4 w-4" />
                  <span className="text-sm">{user.email}</span>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </>
            ) : (
              <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}