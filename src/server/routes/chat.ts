import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { messageRepository } from '@/lib/database/repository';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
// import { Errors } from '@/lib/utils/errors';

interface ChatQuery {
  peerId: string;
  action?: string;
  since?: string;
  limit?: string;
  before?: string;
}

interface ChatPostBody {
  peerId: string;
  text: string;
}

interface ChatSeenBody {
  chatId: string;
}

function getChatId(userA: string, userB: string): string {
  return [userA, userB].sort().join('|');
}

export async function chatRoutes(fastify: FastifyInstance) {
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
            peerId: conv.otherUserId,
            peerName: conv.otherUserName,
            lastMessage: conv.lastMessage,
            lastMessageAt: conv.lastMessageTime,
            unreadCount: conv.unreadCount,
          })),
        });
      } catch (error) {
        console.error('Error in conversations GET:', error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // GET /api/chat - Get chat messages
  fastify.get<{ Querystring: ChatQuery }>(
    '/',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Querystring: ChatQuery }>, reply: FastifyReply) => {
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
              ...msg,
              seen: msg.seen,
              seenAt: msg.seenAt,
            })),
            hasMore: hasMore,
          });
        }

        return reply.status(400).send({ error: 'Invalid action' });
      } catch (error) {
        console.error('Error in chat GET:', error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // POST /api/chat/seen - Mark messages as seen
  fastify.post<{ Body: ChatSeenBody }>(
    '/seen',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Body: ChatSeenBody }>, reply: FastifyReply) => {
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
        console.error('Error in chat seen POST:', error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // POST /api/chat - Send chat message
  fastify.post<{ Body: ChatPostBody }>(
    '/',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Body: ChatPostBody }>, reply: FastifyReply) => {
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
            chatId: message.chatId,
            from: message.fromUserId,
            to: message.toUserId,
            text: message.text,
            seen: message.seen,
            seenAt: message.seenAt,
            timestamp: message.createdAt.getTime(),
          },
        });
      } catch (error) {
        console.error('Error in chat POST:', error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
