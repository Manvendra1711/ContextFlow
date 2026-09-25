import { threads } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const allThreads = Array.from(threads.values());
  // Let's also include the 'main' thread if it's not present in the DB yet,
  // since main is always the root but might not be saved until first message.
  if (!allThreads.find(t => t.id === 'main')) {
    allThreads.push({
      id: 'main',
      parentThreadId: null,
      createdAt: 0,
    });
  }
  
  return NextResponse.json(allThreads);
}

export async function POST(req) {
  const data = await req.json();
  if (data.id && !threads.has(data.id)) {
    threads.set(data.id, {
      id: data.id,
      parentThreadId: data.parentThreadId || null,
      branchMessageId: data.branchMessageId || null,
      branchedText: data.branchedText || null,
      createdAt: Date.now()
    });
  }
  return NextResponse.json({ success: true });
}
