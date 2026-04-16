import { supabase } from './supabase';

export async function getDispatcherId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: dispatcher } = await supabase
    .from('dispatchers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (dispatcher) {
    return dispatcher.id;
  }

  const { data: newDispatcher, error } = await supabase
    .from('dispatchers')
    .insert([{ user_id: user.id, company_name: 'My Fleet' }])
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create dispatcher:', error);
    return null;
  }

  return newDispatcher.id;
}
