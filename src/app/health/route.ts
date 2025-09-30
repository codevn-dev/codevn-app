import { NextResponse } from 'next/server';
import { siteConfig } from '@/config';
import type { ApiResponse } from '@/types/shared/common';

export async function GET() {
  const body: ApiResponse<{ version: string }> = {
    success: true,
    data: { version: siteConfig.version },
  };
  return NextResponse.json(body);
}
