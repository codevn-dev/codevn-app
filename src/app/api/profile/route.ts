import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { userRepository } from '@/lib/database/repository';
import { withErrorHandling, validateRequiredFields, requireAuth } from '@/lib/api';
import { Errors } from '@/lib/utils/errors';

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const session = await auth();
  requireAuth(session);

  const { name, email } = await request.json();

  validateRequiredFields({ name, email }, ['name', 'email']);

  // Check if email is already taken by another user
  const existingUser = await userRepository.findByEmail(email);

  if (existingUser && existingUser.id !== session.user!.id) {
    throw Errors.ALREADY_EXISTS('Email is already taken');
  }

  const updatedUser = await userRepository.update(session.user!.id, {
    name,
    email,
  });

  return NextResponse.json(updatedUser[0]);
});
