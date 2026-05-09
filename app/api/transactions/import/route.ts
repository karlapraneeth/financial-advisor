import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { parseCSV } from '@/lib/csv';

function getUserId() {
  const id = process.env.DEFAULT_USER_ID;
  if (!id) throw new Error('DEFAULT_USER_ID is not set');
  return id;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const accountId = formData.get('account_id') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const text = await file.text();
    const { rows, errors } = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json({ imported: 0, skipped: 0, errors });
    }

    const supabase = createServerSupabaseClient();
    const userId = getUserId();

    const records = rows.map((r) => ({
      user_id: userId,
      account_id: accountId ?? null,
      date: r.date,
      amount: r.amount,
      description: r.description,
      category: r.category ?? null,
      imported: true,
    }));

    const { data, error } = await supabase
      .from('transactions')
      .insert(records)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      imported: data.length,
      skipped: errors.length,
      errors,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
