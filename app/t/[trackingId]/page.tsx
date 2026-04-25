import DriverHub from '@/components/DriverHub';

export default async function DriverTrackingPage({ params }: { params: { trackingId: string } }) {
  const { trackingId } = await params;
  return <DriverHub trackingId={trackingId} />;
}
