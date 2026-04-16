import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ActiveLoads from './pages/ActiveLoads';
import LoadDetail from './pages/LoadDetail';
import Drivers from './pages/Drivers';
import Detention from './pages/Detention';
import Billing from './pages/Billing';
import Login from './pages/Login';
import { Pricing } from './pages/Pricing';
import { Success } from './pages/Success';
import { PricingPage } from './pages/PricingPage';
import { SuccessPage } from './pages/SuccessPage';
import StripeDebug from './pages/StripeDebug';
import { LandingPage } from './pages/LandingPage';
import RootRedirect from './components/RootRedirect';
import DriverTracking from './pages/DriverTracking';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/stripe-debug" element={<StripeDebug />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/t/:trackingId" element={<DriverTracking />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/loads" element={<ActiveLoads />} />
            <Route path="/loads/:id" element={<LoadDetail />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/detention" element={<Detention />} />
            <Route path="/billing" element={<Billing />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}