import { DetentionFinancialDashboard } from '@/components/dashboard/DetentionFinancialDashboard';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Financial Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time detention revenue overview</p>
        </div>
        <DetentionFinancialDashboard />
        {/* Other dashboard sections (e.g., recent loads, charts) can go here */}
      </div>
    </div>
  );
}
