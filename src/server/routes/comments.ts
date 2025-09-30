import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import { commentsService } from '../services';
import { UpdateCommentRequest } from '@/types/shared/comment';
import { ReactionRequest } from '@/types/shared/reaction';
import { commentWebSocketService } from '../websocket/comment';
import { CommonError } from '@/types/shared/errors';
import { ok, fail } from '../utils/response';

// Use shared types directly

export async function commentRoutes(fastify: FastifyInstance) {
  // WebSocket endpoint for real-time comments
  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true } as any, (connection: any, request: any) => {
      // In @fastify/websocket, the connection object IS the WebSocket
      // Pass the connection directly instead of connection.socket
      commentWebSocketService.addConnection(connection, request);
    });
  });

  // GET /api/comments/:id - Get a specific comment
  fastify.get(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const response = await commentsService.getComment(id);
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
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
        const body = request.body;
        const response = await commentsService.updateComment(id, body, authRequest.user!.id);
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
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
        const response = await commentsService.deleteComment(id, authRequest.user!.id);
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
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
        const response = await commentsService.handleCommentReaction(
          id,
          authRequest.user!.id,
          action
        );
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
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
        const response = await commentsService.getUserCommentReaction(id, authRequest.user!.id);
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
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
        const response = await commentsService.removeUserCommentReaction(id, authRequest.user!.id);
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
      }
    }
  );
}
