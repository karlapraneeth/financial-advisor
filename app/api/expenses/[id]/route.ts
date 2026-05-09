import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { expenseUpdateSchema } from '@/lib/validations/schemas';

function getUserId() {
  const id = process.env.DEFAULT_USER_ID;
  if (!id) throw new Error('DEFAULT_USER_ID is not set');
  return id;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = expenseUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('fixed_expenses')
      .update(parsed.data)
      .eq('id', id)
      .eq('user_id', getUserId())
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('fixed_expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', getUserId());

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
