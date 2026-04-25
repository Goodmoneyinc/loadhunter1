import DriverHubActions from '@/components/DriverHubActions';

export default async function DriverTrackingPage({ params }: { params: { trackingId: string } }) {
  const { trackingId } = await params;
  return <DriverHubActions trackingId={trackingId} />;
}
