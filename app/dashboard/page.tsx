import { DashboardDetentionSummary } from '../../src/components/DashboardDetentionSummary';

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <h1 className="text-2xl font-bold">Dispatch Dashboard</h1>
      <DashboardDetentionSummary />
      {/* rest of dashboard (loads, etc.) */}
    </div>
  );
}
