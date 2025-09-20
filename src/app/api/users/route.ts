import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { userRepository } from '@/lib/database/repository';
import { withErrorHandling, requireAuth } from '@/lib/api';
import { maskUserEmail, isAdmin } from '@/lib/utils';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await auth();
  requireAuth(session);

  const allUsers = await userRepository.findAllExcept(session.user!.id, 50);

  // Mask emails for privacy unless user is admin
  const userIsAdmin = isAdmin(session.user.role);
  const finalUsers = userIsAdmin ? allUsers : allUsers.map(user => maskUserEmail(user));

  return NextResponse.json({ users: finalUsers });
});