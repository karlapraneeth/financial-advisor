import { NextResponse } from 'next/server';
import { buildSnapshot } from '@/lib/snapshot';

export async function GET() {
  try {
    const userId = process.env.DEFAULT_USER_ID;
    if (!userId) return NextResponse.json({ error: 'DEFAULT_USER_ID is not set' }, { status: 500 });

    const snapshot = await buildSnapshot(userId);
    return NextResponse.json(snapshot);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
