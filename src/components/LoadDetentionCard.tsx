import { useDetentionEngine } from '../hooks/useDetentionEngine';

export function LoadDetentionCard({ loadId }: { loadId: string }) {
  const { detention, loading, error } = useDetentionEngine(loadId, {
    config: { freeTimeHours: 2, ratePerHour: 75 },
    refreshInterval: 30000, // refresh every 30 seconds while active
  });

  if (loading) return <div>Calculating detention...</div>;
  if (error) return <div>Error loading detention</div>;
  if (!detention.arrivalTime) return <div>No arrival recorded - no detention applicable</div>;

  return (
    <div className="space-y-2 rounded border p-4">
      <h3 className="font-bold">Detention Status</h3>
      <p>Arrival: {detention.arrivalTime.toLocaleTimeString()}</p>
      {detention.checkInTime && <p>Check-in: {detention.checkInTime.toLocaleTimeString()}</p>}
      <p>Detention started: {detention.detentionStart?.toLocaleTimeString() || 'Not started'}</p>
      <p className="text-lg font-semibold">Billable hours: {detention.billableHours.toFixed(2)}h</p>
      <p className="text-xl text-green-700">Revenue: ${detention.revenue.toFixed(2)}</p>
      {detention.isActive && <p className="text-sm text-amber-600">(Clock is running)</p>}
    </div>
  );
}
