import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { fileUpload } from '@/lib/server';
import { withErrorHandling, requireAuth } from '@/lib/api';
import { Errors } from '@/lib/utils/errors';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await auth();
  requireAuth(session);

  const data = await request.formData();
  const file: File | null = data.get('file') as unknown as File;

  if (!file) {
    throw Errors.MISSING_REQUIRED_FIELD('file');
  }

  // Upload image using utils
  const uploadResult = await fileUpload.uploadImage(file, 'images');

  return NextResponse.json({
    success: true,
    imageUrl: uploadResult.publicPath,
    fileName: uploadResult.originalName,
    size: uploadResult.size,
    type: uploadResult.type,
  });
});
