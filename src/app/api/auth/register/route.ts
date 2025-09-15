import { NextRequest, NextResponse } from 'next/server';
import { userRepository } from '@/lib/database/repository';
import { withErrorHandling, validateRequiredFields } from '@/lib/api';
import { Errors } from '@/lib/utils/errors';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { email, name, password } = await request.json();

  validateRequiredFields({ email, name, password }, ['email', 'name', 'password']);

  // Check if user already exists
  const existingUser = await userRepository.findByEmail(email);

  if (existingUser) {
    throw Errors.ALREADY_EXISTS('User with this email');
  }

  // Create user
  const newUser = await userRepository.create({
    email,
    name,
    password,
    role: 'user',
  });

  return NextResponse.json(
    {
      message: 'User created successfully',
      user: { id: newUser[0].id, email: newUser[0].email, name: newUser[0].name },
    },
    { status: 201 }
  );
});
