import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { messageRepository } from '@/lib/database/repository';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import { logger } from '@/lib/utils/logger';
import {
  ChatQueryRequest,
  ChatPostRequest,
  ChatSeenRequest,
  ConversationListResponse,
  MessageListResponse,
  SendMessageResponse,
} from '@/types/shared/chat';
import { SuccessResponse } from '@/types/shared/common';
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

        const response: ConversationListResponse = {
          conversations: conversations.map((conv) => ({
            id: conv.chatId,
            participant1Id: authRequest.user!.id,
            participant2Id: conv.otherUserId,
            createdAt: conv.lastMessageTime,
            updatedAt: conv.lastMessageTime,
            participant1: {
              id: authRequest.user!.id,
              name: '',
              email: '',
              role: 'user',
              createdAt: new Date().toISOString(),
              avatar: undefined,
            },
            participant2: {
              id: conv.otherUserId,
              name: conv.otherUserName,
              email: '',
              role: 'user',
              createdAt: new Date().toISOString(),
              avatar: conv.otherUserAvatar || undefined,
            },
            lastMessage: {
              id: `${conv.chatId}:${new Date(conv.lastMessageTime).getTime()}`,
              content: conv.lastMessage,
              senderId: conv.lastMessageFromUserId,
              receiverId:
                conv.lastMessageFromUserId === authRequest.user!.id
                  ? conv.otherUserId
                  : authRequest.user!.id,
              conversationId: conv.chatId,
              createdAt: conv.lastMessageTime,
              updatedAt: conv.lastMessageTime,
              sender: { id: conv.lastMessageFromUserId, name: '', email: '' },
              receiver: {
                id:
                  conv.lastMessageFromUserId === authRequest.user!.id
                    ? conv.otherUserId
                    : authRequest.user!.id,
                name: '',
                email: '',
              },
              seen: conv.lastMessageSeen,
              seenAt: null,
            },
            unreadCount: conv.unreadCount,
          })),
          pagination: {
            page: 1,
            limit: conversations.length,
            total: conversations.length,
            totalPages: 1,
          },
        };
        return reply.send(response);
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
          const limitedMessages = filteredMessages.slice(0, limitNum);

          // Sort by timestamp ascending (oldest first) for display
          limitedMessages.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

          const response: MessageListResponse = {
            messages: limitedMessages.map((msg) => ({
              id: msg.id,
              content: msg.text,
              senderId: msg.fromUserId,
              receiverId: msg.toUserId,
              conversationId: msg.chatId,
              createdAt: msg.createdAt,
              updatedAt: msg.updatedAt ?? msg.createdAt,
              sender: { id: msg.fromUserId, name: '', email: '' },
              receiver: { id: msg.toUserId, name: '', email: '' },
              seen: msg.seen,
              seenAt: msg.seenAt as any,
            })),
            pagination: {
              page: 1,
              limit: limitNum,
              total: filteredMessages.length,
              totalPages: Math.max(1, Math.ceil(filteredMessages.length / limitNum)),
            },
          };
          return reply.send(response);
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

        const response: SuccessResponse = { success: true };
        return reply.send(response);
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

        const response: SendMessageResponse = {
          message: 'Message sent',
          data: {
            id: message.id,
            content: message.text,
            senderId: message.fromUserId,
            receiverId: message.toUserId,
            conversationId: message.chatId,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt ?? message.createdAt,
            sender: { id: message.fromUserId, name: '', email: '' },
            receiver: { id: message.toUserId, name: '', email: '' },
            seen: message.seen,
            seenAt: message.seenAt as any,
          },
        };
        return reply.send(response);
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
