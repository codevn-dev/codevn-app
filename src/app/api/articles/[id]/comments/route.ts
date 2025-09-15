import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { commentRepository } from '@/lib/database/repository';
import {
  withErrorHandling,
  validateRequiredFields,
  getPaginationParams,
  getSortParams,
  requireAuth,
} from '@/lib/api';
import { Errors } from '@/lib/utils';

// GET /api/articles/[id]/comments - Get comments for an article
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const { page, limit } = getPaginationParams(request);
    const { sortOrder } = getSortParams(request, ['createdAt', 'updatedAt']);
    const parentId = searchParams.get('parentId');

    // Get user session for like/unlike status
    const session = await auth();
    const userId = session?.user?.id;

    const result = await commentRepository.findByArticle(id, {
      parentId: parentId === 'null' ? null : parentId || null,
      page,
      limit,
      sortOrder,
      userId,
    });

    return NextResponse.json(result);
  }
);

// POST /api/articles/[id]/comments - Create a new comment
export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    requireAuth(session);

    const { id } = await params;
    const body = await request.json();
    const { content, parentId } = body;

    validateRequiredFields(body, ['content']);

    if (content.trim().length === 0) {
      throw Errors.VALIDATION_ERROR('Comment content cannot be empty');
    }

    if (content.length > 1000) {
      throw Errors.VALIDATION_ERROR('Comment is too long (max 1000 characters)');
    }

    const comment = await commentRepository.create({
      content: content.trim(),
      articleId: id,
      authorId: session.user.id,
      parentId: parentId || null,
    });

    // Fetch the created comment with relations
    const createdComment = await commentRepository.findById(comment[0].id);

    return NextResponse.json(createdComment, { status: 201 });
  }
);
