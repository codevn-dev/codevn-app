import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { userRepository } from '@/lib/database/repository';
import {
  withErrorHandling,
  requireAdmin,
  getPaginationParams,
  getSortParams,
  getSearchParam,
} from '@/lib/api';
import { Errors } from '@/lib/utils/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await auth();
  requireAdmin(session);

  // Extract query parameters
  const { searchParams } = new URL(request.url);
  const search = getSearchParam(request);
  const { sortBy: rawSortBy, sortOrder } = getSortParams(request, [
    'createdAt',
    'name',
    'email',
    'joined',
  ]);
  const { page, limit } = getPaginationParams(request);
  const role = searchParams.get('role') || '';

  // Map 'joined' to 'createdAt' for database compatibility
  const sortBy = rawSortBy === 'joined' ? 'createdAt' : rawSortBy;

  const result = await userRepository.findManyWithPagination({
    search,
    sortBy,
    sortOrder: sortOrder as 'asc' | 'desc',
    page,
    limit,
    role: role as 'user' | 'admin' | undefined,
  });

  return NextResponse.json(result);
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const session = await auth();
  requireAdmin(session);

  const { userId, role } = await request.json();

  if (!userId || !role) {
    throw Errors.MISSING_REQUIRED_FIELD('User ID and role');
  }

  if (!['user', 'admin'].includes(role)) {
    throw Errors.INVALID_INPUT('Invalid role. Must be "user" or "admin"');
  }

  // Get the target user to check their current role
  const targetUser = await userRepository.findById(userId);

  if (!targetUser) {
    throw Errors.NOT_FOUND('User');
  }

  // Prevent admin from updating another admin's role
  if (targetUser.role === 'admin' && targetUser.id !== session.user.id) {
    throw Errors.FORBIDDEN('You cannot change the role of another admin');
  }

  const updatedUser = await userRepository.updateRole(userId, role as 'user' | 'admin');

  return NextResponse.json(updatedUser[0]);
});
