import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { userRepository } from '@/lib/database/repository';
import { withErrorHandling, requireAuth } from '@/lib/api';
import { maskUserEmail, isAdmin } from '@/lib/utils';

export const GET = withErrorHandling(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const session = await auth();
  requireAuth(session);

  const userId = params.id;
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const user = await userRepository.findById(userId);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Return user data without sensitive information
  const userProfile = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    createdAt: user.createdAt,
  };

  // Mask email for privacy unless user is admin or viewing own profile
  const isOwnProfile = session.user.id === userId;
  const finalUserProfile = (isAdmin(session.user.role) || isOwnProfile) ? userProfile : maskUserEmail(userProfile);

  return NextResponse.json({ user: finalUserProfile });
});
