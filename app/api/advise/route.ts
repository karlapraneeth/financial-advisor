import { NextResponse } from 'next/server';
import { buildSnapshot } from '@/lib/snapshot';
import { getLLM } from '@/lib/llm';
import { ADVISOR_SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompts/advisor';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { Advice } from '@/types/finance';

export async function POST() {
  try {
    const userId = process.env.DEFAULT_USER_ID;
    if (!userId) return NextResponse.json({ error: 'DEFAULT_USER_ID is not set' }, { status: 500 });

    const snapshot = await buildSnapshot(userId);
    const llm = getLLM();

    const raw = await llm.generate(
      ADVISOR_SYSTEM_PROMPT,
      buildUserPrompt(JSON.stringify(snapshot, null, 2))
    );

    let advice: Advice;
    try {
      advice = JSON.parse(raw);
      advice.generated_at = new Date().toISOString();
    } catch {
      return NextResponse.json({ error: 'LLM returned invalid JSON', raw }, { status: 500 });
    }

    // Persist to advice_history
    const supabase = createServerSupabaseClient();
    await supabase.from('advice_history').insert({
      user_id: userId,
      snapshot,
      advice,
      model: process.env.LLM_PROVIDER === 'claude' ? 'claude' : 'llama-3.3-70b-versatile',
    });

    return NextResponse.json(advice);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const userId = process.env.DEFAULT_USER_ID;
    if (!userId) return NextResponse.json({ error: 'DEFAULT_USER_ID is not set' }, { status: 500 });

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('advice_history')
      .select('id, advice, model, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
