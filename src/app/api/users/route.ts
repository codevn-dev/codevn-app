import { NextResponse } from 'next/server';
import { userRepository } from '@/lib/database/repository/user-repository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(Number(limitParam) || 5, 1), 20);

    const result = await userRepository.findManyWithPagination({
      search,
      sortBy: 'name',
      sortOrder: 'asc',
      page: 1,
      limit,
    });

    // Return only fields needed for mentions
    const users = (result.users || []).map((u) => ({
      id: u.id,
      name: u.name,
      avatar: (u as any).avatar || null,
    }));

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
