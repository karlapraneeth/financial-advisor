import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { transactionCreateSchema, transactionQuerySchema } from '@/lib/validations/schemas';

function getUserId() {
  const id = process.env.DEFAULT_USER_ID;
  if (!id) throw new Error('DEFAULT_USER_ID is not set');
  return id;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = transactionQuerySchema.safeParse({
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      account_id: searchParams.get('account_id') ?? undefined,
    });
    if (!query.success) return NextResponse.json({ error: query.error.flatten() }, { status: 400 });

    const supabase = createServerSupabaseClient();
    let q = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', getUserId())
      .order('date', { ascending: false });

    if (query.data.from) q = q.gte('date', query.data.from);
    if (query.data.to) q = q.lte('date', query.data.to);
    if (query.data.account_id) q = q.eq('account_id', query.data.account_id);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = transactionCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...parsed.data, user_id: getUserId(), imported: false })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
