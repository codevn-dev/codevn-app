import { NextResponse } from 'next/server';
import { siteConfig } from '@/config';

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: siteConfig.version,
  });
}
