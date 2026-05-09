import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { goalCreateSchema } from '@/lib/validations/schemas';

function getUserId() {
  const id = process.env.DEFAULT_USER_ID;
  if (!id) throw new Error('DEFAULT_USER_ID is not set');
  return id;
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', getUserId())
      .order('priority', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = goalCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('goals')
      .insert({ ...parsed.data, user_id: getUserId() })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
