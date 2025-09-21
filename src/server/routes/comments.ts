import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { commentRepository, likeRepository, userRepository } from '@/lib/database/repository';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import { logger } from '@/lib/utils/logger';
import { UpdateCommentRequest } from '@/types/shared/comment';
import { ReactionRequest } from '@/types/shared/article';

// Use shared types directly

function requireOwnership(user: any, resourceUserId: string): void {
  if (user.id !== resourceUserId && user.role !== 'admin') {
    throw new Error('You can only access your own resources');
  }
}

export async function commentRoutes(fastify: FastifyInstance) {
  // GET /api/comments/:id - Get a specific comment
  fastify.get(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;

        const comment = await commentRepository.findById(id);

        if (!comment) {
          return reply.status(404).send({ error: 'Comment not found' });
        }

        return reply.send(comment);
      } catch (error) {
        logger.error('Get comment error', undefined, error as Error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // PUT /api/comments/:id - Update a comment
  fastify.put<{
    Params: { id: string };
    Body: UpdateCommentRequest;
  }>(
    '/:id',
    {
      preHandler: authMiddleware,
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateCommentRequest;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { id } = request.params;
        const { content } = request.body;

        if (!content || content.trim().length === 0) {
          return reply.status(400).send({ error: 'Comment content is required' });
        }

        if (content.length > 1000) {
          return reply.status(400).send({ error: 'Comment is too long (max 1000 characters)' });
        }

        // Check if comment exists and user is the author
        const existingComment = await commentRepository.findById(id);

        if (!existingComment) {
          return reply.status(404).send({ error: 'Comment not found' });
        }

        requireOwnership(authRequest.user!, existingComment.authorId);

        const _updatedComment = await commentRepository.update(id, content.trim());

        // Fetch the updated comment with relations
        const comment = await commentRepository.findById(id);

        return reply.send(comment);
      } catch (error) {
        logger.error('Update comment error', undefined, error as Error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // DELETE /api/comments/:id - Delete a comment
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { id } = request.params;

        // Check if comment exists and user is the author or admin
        const existingComment = await commentRepository.findById(id);

        if (!existingComment) {
          return reply.status(404).send({ error: 'Comment not found' });
        }

        const isAuthor = existingComment.authorId === authRequest.user!.id;

        if (!isAuthor) {
          const user = await userRepository.findById(authRequest.user!.id);
          const isAdmin = user?.role === 'admin';
          if (!isAdmin) {
            return reply.status(403).send({ error: 'You can only delete your own comments' });
          }
        }

        await commentRepository.delete(id);

        return reply.send({ success: true });
      } catch (error) {
        logger.error('Delete comment error', undefined, error as Error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // POST /api/comments/:id/reaction - Like/dislike comment
  fastify.post<{
    Params: { id: string };
    Body: ReactionRequest;
  }>(
    '/:id/reaction',
    {
      preHandler: authMiddleware,
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: ReactionRequest;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { id } = request.params;
        const { action } = request.body;

        if (!action || !['like', 'unlike', 'dislike'].includes(action)) {
          return reply
            .status(400)
            .send({ error: 'Invalid reaction action. Must be "like", "unlike", or "dislike"' });
        }

        // Normalize 'dislike' to 'unlike' for database compatibility
        const normalizedType = action === 'dislike' ? 'unlike' : action;

        // Check if comment exists
        const comment = await commentRepository.findById(id);
        if (!comment) {
          return reply.status(404).send({ error: 'Comment not found' });
        }

        // Check if user already reacted to this comment with the same type
        const existingReaction = await likeRepository.findByUserAndComment(
          authRequest.user!.id,
          id,
          normalizedType
        );

        if (existingReaction) {
          // User already has this reaction, remove it
          await likeRepository.deleteCommentReaction(authRequest.user!.id, id, normalizedType);
          return reply.send({
            success: true,
            action: 'removed',
            reaction: null,
          });
        } else {
          // Check if user has the opposite reaction
          const oppositeType = normalizedType === 'like' ? 'unlike' : 'like';
          const oppositeReaction = await likeRepository.findByUserAndComment(
            authRequest.user!.id,
            id,
            oppositeType
          );

          if (oppositeReaction) {
            // User has opposite reaction, remove it and create new one
            await likeRepository.deleteCommentReaction(authRequest.user!.id, id, oppositeType);
          }

          // Create new reaction
          await likeRepository.createCommentReaction(authRequest.user!.id, id, normalizedType);

          return reply.send({
            success: true,
            action: 'created',
            reaction: { type: action, comment: { id }, user: { id: authRequest.user!.id } },
          });
        }
      } catch (error) {
        logger.error('Comment reaction error', undefined, error as Error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // GET /api/comments/:id/reaction - Get user's reaction to comment
  fastify.get<{ Params: { id: string } }>(
    '/:id/reaction',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { id } = request.params;

        // Check if comment exists
        const comment = await commentRepository.findById(id);
        if (!comment) {
          return reply.status(404).send({ error: 'Comment not found' });
        }

        // Get user's reaction (check both like and unlike)
        const likeReaction = await likeRepository.findByUserAndComment(
          authRequest.user!.id,
          id,
          'like'
        );
        const unlikeReaction = await likeRepository.findByUserAndComment(
          authRequest.user!.id,
          id,
          'unlike'
        );

        const reaction = likeReaction || unlikeReaction;

        return reply.send({
          reaction: reaction ? { type: reaction.type } : null,
        });
      } catch (error) {
        logger.error('Get comment reaction error', undefined, error as Error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // DELETE /api/comments/:id/reaction - Remove user's reaction to comment
  fastify.delete<{ Params: { id: string } }>(
    '/:id/reaction',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { id } = request.params;

        // Check if comment exists
        const comment = await commentRepository.findById(id);
        if (!comment) {
          return reply.status(404).send({ error: 'Comment not found' });
        }

        // Check if user has any reaction (like or unlike)
        const likeReaction = await likeRepository.findByUserAndComment(
          authRequest.user!.id,
          id,
          'like'
        );
        const unlikeReaction = await likeRepository.findByUserAndComment(
          authRequest.user!.id,
          id,
          'unlike'
        );

        const existingReaction = likeReaction || unlikeReaction;

        if (!existingReaction) {
          return reply.status(404).send({ error: 'No reaction found to remove' });
        }

        // Remove the reaction
        await likeRepository.deleteCommentReaction(authRequest.user!.id, id, existingReaction.type);

        return reply.send({
          success: true,
          action: 'removed',
          reaction: null,
        });
      } catch (error) {
        logger.error('Delete comment reaction error', undefined, error as Error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
