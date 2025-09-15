import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { likeRepository, commentRepository } from '@/lib/database/repository';
import { withErrorHandling, requireAuth } from '@/lib/api';
import { Errors } from '@/lib/utils';

export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    requireAuth(session);

    const { id: commentId } = await params;
    const userId = session.user!.id;
    const body = await request.json();
    const { action } = body;

    // Validate action
    if (!action || !['like', 'unlike'].includes(action)) {
      throw Errors.VALIDATION_ERROR('Action must be either "like" or "unlike"');
    }

    // Check if comment exists
    const comment = await commentRepository.findById(commentId);
    if (!comment) {
      throw Errors.NOT_FOUND('Comment');
    }

    if (action === 'like') {
      // Check if user already liked this comment
      const existingLike = await likeRepository.findByUserAndComment(userId, commentId, 'like');
      if (existingLike) {
        throw Errors.CONFLICT('Already liked');
      }

      // Remove any existing unlike first
      const existingUnlike = await likeRepository.findByUserAndComment(userId, commentId, 'unlike');
      if (existingUnlike) {
        await likeRepository.deleteCommentReaction(userId, commentId, 'unlike');
      }

      // Add like
      await likeRepository.createCommentReaction(userId, commentId, 'like');
    } else if (action === 'unlike') {
      // Check if user already unliked this comment
      const existingUnlike = await likeRepository.findByUserAndComment(userId, commentId, 'unlike');
      if (existingUnlike) {
        throw Errors.CONFLICT('Already unliked');
      }

      // Remove any existing like first
      const existingLike = await likeRepository.findByUserAndComment(userId, commentId, 'like');
      if (existingLike) {
        await likeRepository.deleteCommentReaction(userId, commentId, 'like');
      }

      // Add unlike
      await likeRepository.createCommentReaction(userId, commentId, 'unlike');
    }

    return NextResponse.json({ success: true });
  }
);

export const DELETE = withErrorHandling(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    requireAuth(session);

    const { id: commentId } = await params;
    const userId = session.user!.id;
    const body = await request.json();
    const { action } = body;

    // Validate action
    if (!action || !['like', 'unlike'].includes(action)) {
      throw Errors.VALIDATION_ERROR('Action must be either "like" or "unlike"');
    }

    // Check if comment exists
    const comment = await commentRepository.findById(commentId);
    if (!comment) {
      throw Errors.NOT_FOUND('Comment');
    }

    if (action === 'like') {
      // Check if user has liked this comment
      const existingLike = await likeRepository.findByUserAndComment(userId, commentId, 'like');
      if (!existingLike) {
        throw Errors.NOT_FOUND('Like');
      }

      // Remove like
      await likeRepository.deleteCommentReaction(userId, commentId, 'like');
    } else if (action === 'unlike') {
      // Check if user has unliked this comment
      const existingUnlike = await likeRepository.findByUserAndComment(userId, commentId, 'unlike');
      if (!existingUnlike) {
        throw Errors.NOT_FOUND('Unlike');
      }

      // Remove unlike
      await likeRepository.deleteCommentReaction(userId, commentId, 'unlike');
    }

    return NextResponse.json({ success: true });
  }
);
