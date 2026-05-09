import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { userUpdateSchema } from '@/lib/validations/schemas';

function getUserId() {
  const id = process.env.DEFAULT_USER_ID;
  if (!id) throw new Error('DEFAULT_USER_ID is not set');
  return id;
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', getUserId())
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .update(parsed.data)
      .eq('id', getUserId())
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
