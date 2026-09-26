import { messages as dbMessages } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get('threadId');

  if (!threadId) {
    return NextResponse.json({ error: 'threadId is required' }, { status: 400 });
  }

  const threadMessages = Array.from(dbMessages.values())
    .filter(m => m.threadId === threadId)
    .sort((a, b) => a.createdAt - b.createdAt);

  return NextResponse.json(threadMessages);
}
