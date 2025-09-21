import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { messageRepository } from '@/lib/database/repository';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import { logger } from '@/lib/utils/logger';
import { ChatQueryRequest, ChatPostRequest, ChatSeenRequest } from '@/types/shared/chat';
import { chatWebSocketService } from '../websocket/chat-websocket';

function getChatId(userA: string, userB: string): string {
  return [userA, userB].sort().join('|');
}

export async function chatRoutes(fastify: FastifyInstance) {
  // WebSocket endpoint for real-time chat
  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true } as any, (connection: any, request: any) => {
      logger.info('WebSocket connection received', {
        url: request.url,
        headers: request.headers,
        query: request.query,
        connectionKeys: Object.keys(connection),
      });

      // In @fastify/websocket, the connection object IS the WebSocket
      // Pass the connection directly instead of connection.socket
      chatWebSocketService.addConnection(connection, request);
    });
  });

  // GET /api/chat/conversations - Get all conversations
  fastify.get(
    '/conversations',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        // Get all conversations for this user
        const conversations = await messageRepository.getConversations(authRequest.user!.id);

        return reply.send({
          conversations: conversations.map((conv) => ({
            id: conv.chatId,
            peer: {
              id: conv.otherUserId,
              name: conv.otherUserName,
              avatar: conv.otherUserAvatar,
            },
            lastMessage: conv.lastMessage,
            lastMessageAt: conv.lastMessageTime,
            unreadCount: conv.unreadCount,
          })),
        });
      } catch (error) {
        logger.error('Error in conversations GET', undefined, error as Error);
        return reply.status(500).send({ error: 'Internal server error' });
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
        const { peerId, action = 'get', since = '0', limit = '20', before = '' } = request.query;

        if (!peerId) {
          return reply.status(400).send({ error: 'Missing peerId' });
        }

        const chatId = getChatId(authRequest.user!.id, peerId);

        if (action === 'get') {
          // Get messages for this chat from database
          const chatMessages = await messageRepository.findByChatId(chatId);

          let filteredMessages = chatMessages;

          // Filter messages since the given timestamp (for polling)
          const sinceTimestamp = parseInt(since);
          if (sinceTimestamp > 0) {
            filteredMessages = chatMessages.filter(
              (msg) => new Date(msg.createdAt).getTime() > sinceTimestamp
            );
          }

          // Filter messages before the given timestamp (for load more)
          const beforeTimestamp = parseInt(before);
          if (beforeTimestamp > 0) {
            filteredMessages = chatMessages.filter(
              (msg) => new Date(msg.createdAt).getTime() < beforeTimestamp
            );
          }

          // Sort by timestamp descending (newest first)
          filteredMessages.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          // Apply limit
          const limitNum = parseInt(limit);
          const hasMore = filteredMessages.length > limitNum;
          const limitedMessages = filteredMessages.slice(0, limitNum);

          // Sort by timestamp ascending (oldest first) for display
          limitedMessages.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

          return reply.send({
            messages: limitedMessages.map((msg) => ({
              id: msg.id,
              chat: { id: msg.chatId },
              fromUser: { id: msg.fromUserId },
              toUser: { id: msg.toUserId },
              text: msg.text,
              type: msg.type,
              seen: msg.seen,
              seenAt: msg.seenAt,
              createdAt: msg.createdAt,
              updatedAt: msg.updatedAt,
            })),
            hasMore: hasMore,
          });
        }

        return reply.status(400).send({ error: 'Invalid action' });
      } catch (error) {
        logger.error('Error in chat GET', undefined, error as Error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // POST /api/chat/seen - Mark messages as seen
  fastify.post<{ Body: ChatSeenRequest }>(
    '/seen',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Body: ChatSeenRequest }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { chatId } = request.body;

        if (!chatId) {
          return reply.status(400).send({ error: 'Missing chatId' });
        }

        // Mark messages as seen
        await messageRepository.markAsSeen(chatId, authRequest.user!.id);

        return reply.send({ success: true });
      } catch (error) {
        logger.error('Error in chat seen POST', undefined, error as Error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // POST /api/chat - Send chat message
  fastify.post<{ Body: ChatPostRequest }>(
    '/',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Body: ChatPostRequest }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { peerId, text } = request.body;

        if (!peerId || !text) {
          return reply.status(400).send({ error: 'Missing peerId or text' });
        }

        const chatId = getChatId(authRequest.user!.id, peerId);
        // Save message to database
        const message = await messageRepository.create({
          chatId,
          fromUserId: authRequest.user!.id,
          toUserId: peerId,
          text: String(text).slice(0, 4000),
          type: 'message',
        });

        return reply.send({
          success: true,
          message: {
            id: message.id,
            type: message.type,
            chat: { id: message.chatId },
            fromUser: { id: message.fromUserId },
            toUser: { id: message.toUserId },
            text: message.text,
            seen: message.seen,
            seenAt: message.seenAt,
            timestamp: message.createdAt.getTime(),
          },
        });
      } catch (error) {
        logger.error('Error in chat POST', undefined, error as Error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // GET /api/chat/online-users - Get online users
  fastify.get(
    '/online-users',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const onlineUsers = chatWebSocketService.getOnlineUsers();
        return reply.send({ onlineUsers });
      } catch (error) {
        logger.error('Error in online-users GET', undefined, error as Error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
