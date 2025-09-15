import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { commentRepository } from '@/lib/database/repository';
import { withErrorHandling, requireAuth, requireOwnership } from '@/lib/api';
import { Errors } from '@/lib/utils';

// GET /api/comments/[id] - Get a specific comment
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const comment = await commentRepository.findById(id);

    if (!comment) {
      throw Errors.NOT_FOUND('Comment');
    }

    return NextResponse.json(comment);
  }
);

// PUT /api/comments/[id] - Update a comment
export const PUT = withErrorHandling(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    const { id } = await params;
    requireAuth(session);

    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      throw Errors.MISSING_REQUIRED_FIELD('Comment content');
    }

    if (content.length > 1000) {
      throw Errors.INVALID_INPUT('Comment is too long (max 1000 characters)');
    }

    // Check if comment exists and user is the author
    const existingComment = await commentRepository.findById(id);

    if (!existingComment) {
      throw Errors.NOT_FOUND('Comment');
    }

    requireOwnership(session, existingComment.authorId);

    const _updatedComment = await commentRepository.update(id, content.trim());

    // Fetch the updated comment with relations
    const comment = await commentRepository.findById(id);

    return NextResponse.json(comment);
  }
);

// DELETE /api/comments/[id] - Delete a comment
export const DELETE = withErrorHandling(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    const { id } = await params;
    requireAuth(session);

    // Check if comment exists and user is the author or admin
    const existingComment = await commentRepository.findById(id);

    if (!existingComment) {
      throw Errors.NOT_FOUND('Comment');
    }

    const isAuthor = existingComment.authorId === session.user!.id;
    const isAdmin = session.user!.role === 'admin';

    if (!isAuthor && !isAdmin) {
      throw Errors.FORBIDDEN('You can only delete your own comments');
    }

    await commentRepository.delete(id);

    return NextResponse.json({ success: true });
  }
);
