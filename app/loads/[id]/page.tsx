import { DetentionCard } from '../../../src/components/DetentionCard';

interface LoadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LoadDetailPage({ params }: LoadDetailPageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* existing load header */}
      <DetentionCard loadId={id} />
      {/* other sections like timeline, etc. */}
    </div>
  );
}
