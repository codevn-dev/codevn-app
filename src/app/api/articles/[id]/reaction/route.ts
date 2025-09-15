import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { likeRepository, articleRepository } from '@/lib/database/repository';
import { withErrorHandling, requireAuth } from '@/lib/api';
import { Errors } from '@/lib/utils';

export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    requireAuth(session);

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    // Validate action
    if (!action || !['like', 'unlike'].includes(action)) {
      throw Errors.VALIDATION_ERROR('Action must be either "like" or "unlike"');
    }

    // Check if article exists
    const article = await articleRepository.findById(id);
    if (!article) {
      throw Errors.NOT_FOUND('Article');
    }

    const userId = session.user!.id;

    if (action === 'like') {
      // Check if user already liked this article
      const existingLike = await likeRepository.findByUserAndArticle(userId, id, 'like');
      if (existingLike) {
        throw Errors.CONFLICT('You have already liked this article');
      }

      // Remove any existing unlike first
      const existingUnlike = await likeRepository.findByUserAndArticle(userId, id, 'unlike');
      if (existingUnlike) {
        await likeRepository.deleteArticleReaction(userId, id, 'unlike');
      }

      // Add like
      await likeRepository.createArticleReaction(userId, id, 'like');
    } else if (action === 'unlike') {
      // Check if user already unliked this article
      const existingUnlike = await likeRepository.findByUserAndArticle(userId, id, 'unlike');
      if (existingUnlike) {
        throw Errors.CONFLICT('You have already unliked this article');
      }

      // Remove any existing like first
      const existingLike = await likeRepository.findByUserAndArticle(userId, id, 'like');
      if (existingLike) {
        await likeRepository.deleteArticleReaction(userId, id, 'like');
      }

      // Add unlike
      await likeRepository.createArticleReaction(userId, id, 'unlike');
    }

    return NextResponse.json({ success: true });
  }
);

export const DELETE = withErrorHandling(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    requireAuth(session);

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    // Validate action
    if (!action || !['like', 'unlike'].includes(action)) {
      throw Errors.VALIDATION_ERROR('Action must be either "like" or "unlike"');
    }

    // Check if article exists
    const article = await articleRepository.findById(id);
    if (!article) {
      throw Errors.NOT_FOUND('Article');
    }

    const userId = session.user!.id;

    if (action === 'like') {
      // Check if user has liked this article
      const existingLike = await likeRepository.findByUserAndArticle(userId, id, 'like');
      if (!existingLike) {
        throw Errors.NOT_FOUND('Like');
      }

      // Remove like
      await likeRepository.deleteArticleReaction(userId, id, 'like');
    } else if (action === 'unlike') {
      // Check if user has unliked this article
      const existingUnlike = await likeRepository.findByUserAndArticle(userId, id, 'unlike');
      if (!existingUnlike) {
        throw Errors.NOT_FOUND('Unlike');
      }

      // Remove unlike
      await likeRepository.deleteArticleReaction(userId, id, 'unlike');
    }

    return NextResponse.json({ success: true });
  }
);
