import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { calculateDetention } from '@/lib/detention';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: loads, error } = await supabase
    .from('loads')
    .select('id, load_number')
    .eq('dispatcher_id', user.id); // adjust to your RLS

  if (error || !loads) {
    return NextResponse.json({ error: 'Failed to fetch loads' }, { status: 500 });
  }

  const results = await Promise.all(
    loads.map(async (load) => {
      const detention = await calculateDetention(load.id);
      return {
        loadId: load.id,
        loadNumber: load.load_number,
        revenue: detention.revenue,
        isActive: detention.isActive,
        billableHours: detention.billableHours,
      };
    })
  );

  const totalToday = results.reduce((sum, row) => sum + row.revenue, 0);

  return NextResponse.json({
    totalToday,
    perLoad: results,
  });
}
