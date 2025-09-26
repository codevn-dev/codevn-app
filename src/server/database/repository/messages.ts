import { getDb } from '../index';
import { messages, users } from '../schema';
import { eq, and, desc, or } from 'drizzle-orm';
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

  async getConversations(userId: string): Promise<ConversationSummary[]> {
    const db = getDb();

    // Get all messages for the current user
    const userMessages = await db
      .select()
      .from(messages)
      .where(or(eq(messages.fromUserId, userId), eq(messages.toUserId, userId)))
      .orderBy(desc(messages.createdAt));

    // Group by chatId and get the latest message for each chat
    const chatMap = new Map();

    for (const message of userMessages) {
      if (!chatMap.has(message.chatId)) {
        const otherUserId = message.fromUserId === userId ? message.toUserId : message.fromUserId;

        // Decrypt the last message for display
        const decryptedMessage = this.decryptMessage(message as unknown as MessageRow);

        chatMap.set(message.chatId, {
          chatId: message.chatId,
          otherUserId,
          lastMessage: decryptedMessage.text,
          lastMessageTime: message.createdAt,
          lastMessageFromUserId: message.fromUserId,
          lastMessageSeen: message.seen,
          unreadCount: 0, // We'll calculate this separately if needed
        });
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
          unreadCount: chat.unreadCount,
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
