import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { aggregateDetentionRevenue } from '@/lib/aggregateDetention';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const aggregation = await aggregateDetentionRevenue({
      supabaseClient: supabase,
      dispatcherId: user.id,
    });

    return NextResponse.json(aggregation);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to aggregate detention revenue' }, { status: 500 });
  }
}
