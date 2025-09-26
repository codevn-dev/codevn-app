import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import { chatService } from '../services';
import { ChatQueryRequest } from '@/types/shared/chat';
import { chatWebSocketService } from '../websocket/chat';
import { CommonError } from '@/types/shared/errors';

export async function chatRoutes(fastify: FastifyInstance) {
  // WebSocket endpoint for real-time chat
  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true } as any, (connection: any, request: any) => {
      // In @fastify/websocket, the connection object IS the WebSocket
      // Pass the connection directly instead of connection.socket
      chatWebSocketService.addConnection(connection, request);
    });
  });

  // GET /api/chat/conversations - Get all conversations
  fastify.get<{ Querystring: { limit?: string } }>(
    '/conversations',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { limit = '20' } = request.query;
        const maxConversations = Math.min(100, Math.max(1, parseInt(limit) || 20));

        const response = await chatService.getConversations(authRequest.user!.id, maxConversations);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: CommonError.INTERNAL_ERROR });
      }
    }
  );

  // GET /api/chat - Get chat messages
  fastify.get<{ Querystring: ChatQueryRequest }>(
    '/',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Querystring: ChatQueryRequest }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const query = request.query as ChatQueryRequest;
        const response = await chatService.getChatMessages(authRequest.user!.id, query);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: CommonError.INTERNAL_ERROR });
      }
    }
  );

  // POST /api/chat/hide - Hide conversation
  fastify.post<{ Body: { conversationId: string } }>(
    '/hide',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Body: { conversationId: string } }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { conversationId } = request.body;

        if (!conversationId) {
          return reply.status(400).send({ error: CommonError.BAD_REQUEST });
        }

        const response = await chatService.hideConversation(authRequest.user!.id, conversationId);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: CommonError.INTERNAL_ERROR });
      }
    }
  );
}
