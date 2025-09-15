import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { userRepository } from '@/lib/database/repository';
import { fileUpload } from '@/lib/server';
import { withErrorHandling, requireAuth } from '@/lib/api';
import { Errors } from '@/lib/utils/errors';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await auth();
  requireAuth(session);

  const formData = await request.formData();
  const file = formData.get('avatar') as File;

  if (!file) {
    throw Errors.MISSING_REQUIRED_FIELD('avatar file');
  }

  // Validate file
  const validation = fileUpload.validateImageFile(file, {
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  if (!validation.valid) {
    throw Errors.INVALID_FILE_TYPE([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ]);
  }

  // Get current user to check existing avatar
  const currentUser = await userRepository.findById(session.user!.id);

  // Delete old avatar if exists
  if (currentUser?.avatar) {
    await fileUpload.deleteAvatar(currentUser.avatar);
  }

  // Upload new avatar
  const uploadResult = await fileUpload.uploadImage(file, 'avatars');

  // Update user avatar path in database
  await userRepository.update(session.user!.id, {
    avatar: uploadResult.publicPath,
  });

  return NextResponse.json({
    success: true,
    avatar: uploadResult.publicPath,
  });
});

export const DELETE = withErrorHandling(async (_request: NextRequest) => {
  const session = await auth();
  requireAuth(session);

  // Get current user to get avatar path
  const currentUser = await userRepository.findById(session.user!.id);

  // Delete avatar file from disk if exists
  if (currentUser?.avatar) {
    await fileUpload.deleteAvatar(currentUser.avatar);
  }

  // Remove avatar path from database
  await userRepository.update(session.user!.id, {
    avatar: null,
  });

  return NextResponse.json({ success: true });
});
