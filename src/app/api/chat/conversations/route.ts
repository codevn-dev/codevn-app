import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { messageRepository } from '@/lib/database/repository';
import { withErrorHandling, requireAuth } from '@/lib/api';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await auth();
  requireAuth(session);

  const conversations = await messageRepository.getConversations(session.user!.id);

  return NextResponse.json({ conversations });
});