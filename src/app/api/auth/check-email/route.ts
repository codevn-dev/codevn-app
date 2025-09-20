import { NextRequest, NextResponse } from 'next/server';
import { userRepository } from '@/lib/database/repository';
import { withErrorHandling } from '@/lib/api';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ available: false, message: 'Email is required' }, { status: 400 });
  }

  // Check if email format is valid
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { available: false, message: 'Invalid email format' },
      { status: 400 }
    );
  }

  // Check if email already exists
  const existingUser = await userRepository.findByEmail(email);

  return NextResponse.json({
    available: !existingUser,
    message: existingUser ? 'Email already exists' : 'Email is available',
  });
});
