import { NextResponse } from 'next/server';
import { categoryRepository } from '@/lib/database/repository';
import { withErrorHandling } from '@/lib/api';

export const GET = withErrorHandling(async () => {
  const rootCategories = await categoryRepository.findAllWithCounts();
  return NextResponse.json(rootCategories);
});
