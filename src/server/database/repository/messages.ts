import { getDb } from '../index';
import { messages, users } from '../schema';
import { eq, and, desc, or, inArray } from 'drizzle-orm';
import { MessageRow, ConversationSummary } from '@/types/shared/chat';
import { encryptionService } from '../../services/encryption';
import { logger } from '@/lib/utils/logger';

export const messageRepository = {
  async create(data: {
    chatId: string;
    fromUserId: string;
    toUserId: string;
    text: string;
    type?: 'message' | 'system';
  }): Promise<MessageRow> {
    const db = getDb();

    // Encrypt the message text
    const encrypted = encryptionService.encrypt(data.text);

    const [message] = await db
      .insert(messages)
      .values({
        chatId: data.chatId,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        text: encrypted.encryptedText,
        iv: encrypted.iv,
        tag: encrypted.tag,
        type: data.type || 'message',
      })
      .returning();

    // Return decrypted message for immediate use
    return this.decryptMessage(message as unknown as MessageRow);
  },

  /**
   * Decrypt a message row
   */
  decryptMessage(message: MessageRow): MessageRow {
    try {
      // Decrypt the message
      const decryptedText = encryptionService.decrypt({
        encryptedText: message.text,
        iv: message.iv,
        tag: message.tag,
      });

      return {
        ...message,
        text: decryptedText,
      };
    } catch (error) {
      logger.error('Failed to decrypt message:', { error });
      // Return the message with encrypted text if decryption fails
      return message;
    }
  },

  async findByChatId(chatId: string, limit = 50): Promise<MessageRow[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    // Decrypt all messages
    return (rows as unknown as MessageRow[]).map((message) => this.decryptMessage(message));
  },

  async findByUserPair(userId1: string, userId2: string, limit = 50): Promise<MessageRow[]> {
    const db = getDb();
    const chatId = [userId1, userId2].sort().join('|');

    const rows = await db
      .select()
      .from(messages)
      .where(and(eq(messages.chatId, chatId)))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    // Decrypt all messages
    return (rows as unknown as MessageRow[]).map((message) => this.decryptMessage(message));
  },

  async getRecentChats(userId: string, limit = 20): Promise<MessageRow[]> {
    const db = getDb();
    // This is a simplified version - in production you'd want a more sophisticated query
    // to get the most recent chat for each user pair
    const rows = await db
      .select()
      .from(messages)
      .where(and(eq(messages.fromUserId, userId)))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    // Decrypt all messages
    return (rows as unknown as MessageRow[]).map((message) => this.decryptMessage(message));
  },

  async getConversations(userId: string, maxConversations = 20): Promise<ConversationSummary[]> {
    const db = getDb();

    // Use window function to get max 10 messages per chat, up to maxConversations chats
    const userMessages = await db.execute(`
      WITH ranked_messages AS (
        SELECT 
          chat_id,
          from_user_id,
          to_user_id,
          text,
          iv,
          tag,
          created_at,
          seen,
          ROW_NUMBER() OVER (PARTITION BY chat_id ORDER BY created_at DESC) as rn,
          MAX(created_at) OVER (PARTITION BY chat_id) as max_created_at
        FROM messages 
        WHERE from_user_id = '${userId}' OR to_user_id = '${userId}'
      ),
      latest_chats AS (
        SELECT DISTINCT chat_id, max_created_at
        FROM ranked_messages
        ORDER BY max_created_at DESC
        LIMIT ${maxConversations}
      )
      SELECT 
        rm.chat_id,
        rm.from_user_id,
        rm.to_user_id,
        rm.text,
        rm.iv,
        rm.tag,
        rm.created_at,
        rm.seen
      FROM ranked_messages rm
      INNER JOIN latest_chats lc ON rm.chat_id = lc.chat_id
      WHERE rm.rn <= 10
      ORDER BY rm.created_at DESC
    `);

    // Group by chatId and get the latest message for each chat
    const chatMap = new Map();
    const unreadCountMap = new Map<string, number>();

    for (const message of userMessages) {
      const chatId = String(message.chat_id);
      const fromUserId = String(message.from_user_id);
      const toUserId = String(message.to_user_id);
      const createdAt = new Date(String(message.created_at));
      const seen = Boolean(message.seen);

      if (!chatMap.has(chatId)) {
        const otherUserId = fromUserId === userId ? toUserId : fromUserId;

        // Only decrypt the latest message for display
        const decryptedMessage = this.decryptMessage({
          id: '',
          chatId,
          fromUserId,
          toUserId,
          text: String(message.text),
          iv: String(message.iv),
          tag: String(message.tag),
          type: 'message',
          seen,
          createdAt,
          updatedAt: createdAt,
          seenAt: null,
        } as MessageRow);

        chatMap.set(chatId, {
          chatId,
          otherUserId,
          lastMessage: decryptedMessage.text,
          lastMessageTime: createdAt,
          lastMessageFromUserId: fromUserId,
          lastMessageSeen: seen,
          unreadCount: 0, // Will calculate this from messages
        });
      }

      if (toUserId === userId && !seen) {
        const currentCount = unreadCountMap.get(chatId) || 0;
        unreadCountMap.set(chatId, currentCount + 1);
      }
    }

    // Get user details for all other users
    const conversations: ConversationSummary[] = [];
    for (const [, chat] of chatMap as any) {
      const userDetails = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
        })
        .from(users)
        .where(eq(users.id, chat.otherUserId))
        .limit(1);

      if (userDetails.length > 0) {
        conversations.push({
          chatId: chat.chatId,
          otherUserId: chat.otherUserId,
          lastMessage: chat.lastMessage,
          lastMessageTime: chat.lastMessageTime,
          lastMessageFromUserId: chat.lastMessageFromUserId,
          lastMessageSeen: chat.lastMessageSeen,
          unreadCount: unreadCountMap.get(chat.chatId) || 0,
          otherUserName: userDetails[0].name,
          otherUserEmail: userDetails[0].email,
          otherUserAvatar: userDetails[0].avatar,
        });
      }
    }

    return conversations;
  },

 

  // Mark messages as seen
  async markAsSeen(chatId: string, userId: string): Promise<MessageRow[]> {
    const db = getDb();
    const rows = await db
      .update(messages)
      .set({
        seen: true,
        seenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(messages.chatId, chatId), eq(messages.toUserId, userId), eq(messages.seen, false))
      )
      .returning();

    // Decrypt all messages
    return (rows as unknown as MessageRow[]).map((message) => this.decryptMessage(message));
  },

  // Get unread message count for a user
  async getUnreadCount(userId: string): Promise<number> {
    const db = getDb();
    const result = await db
      .select({ count: messages.id })
      .from(messages)
      .where(and(eq(messages.toUserId, userId), eq(messages.seen, false)));
    return result.length;
  },

  // Get unread count for specific chat
  async getUnreadCountForChat(chatId: string, userId: string): Promise<number> {
    const db = getDb();
    const result = await db
      .select({ count: messages.id })
      .from(messages)
      .where(
        and(eq(messages.chatId, chatId), eq(messages.toUserId, userId), eq(messages.seen, false))
      );
    return result.length;
  },

  // Get last seen message for a chat
  async getLastSeenMessage(chatId: string, userId: string): Promise<MessageRow | null> {
    const db = getDb();
    const result = await db
      .select()
      .from(messages)
      .where(
        and(eq(messages.chatId, chatId), eq(messages.toUserId, userId), eq(messages.seen, true))
      )
      .orderBy(desc(messages.seenAt))
      .limit(1);

    if (result[0]) {
      return this.decryptMessage(result[0] as unknown as MessageRow);
    }
    return null;
  },
};
