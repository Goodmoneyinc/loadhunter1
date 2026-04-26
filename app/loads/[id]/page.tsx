import LoadEventTimeline from '@/components/load/LoadEventTimeline';

export default async function LoadDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold">Load Details</h1>
      {/* other load info */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Event Timeline</h2>
        <LoadEventTimeline loadId={id} />
      </section>
    </div>
  );
}
