import { getDb } from '../index';
import { conversations, conversationsMessages, hiddenConversations, users } from '../schema';
import { eq, and, desc, or } from 'drizzle-orm';
import {
  MessageRow,
  ConversationSummary,
  ConversationType,
  ConversationTypes,
} from '@/types/shared';
import { encryptionService } from '../../services/encryption';
import { logger } from '@/lib/utils/logger';

export const messageRepository = {
  async getConversationId(userA: string, userB: string): Promise<string> {
    const db = getDb();

    // Try to find existing conversation
    const existingConversation = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        or(
          and(eq(conversations.fromUserId, userA), eq(conversations.toUserId, userB)),
          and(eq(conversations.fromUserId, userB), eq(conversations.toUserId, userA))
        )
      )
      .limit(1);

    if (existingConversation.length > 0) {
      const conversationId = existingConversation[0].id;

      // Auto-unhide conversation if it was hidden by the sender
      await this.unhideConversation(conversationId, userA);

      return conversationId;
    }

    // If no existing conversation, create a new ID (fallback to old method)
    return [userA, userB].sort().join('|');
  },

  // Ensure conversation exists - only create if not exists
  async ensureConversationExists(
    conversationId: string,
    fromUserId: string,
    toUserId: string,
    type: ConversationTypes = ConversationType.message
  ): Promise<void> {
    const db = getDb();

    await db
      .insert(conversations)
      .values({
        id: conversationId,
        fromUserId,
        toUserId,
        type,
      })
      .onConflictDoNothing(); // Only insert if not exists
  },

  // Optimized method to create message without redundant conversation check
  async createMessageOnly(data: {
    conversationId: string;
    fromUserId: string;
    toUserId: string;
    text: string;
    type?: ConversationTypes;
  }): Promise<MessageRow> {
    const db = getDb();

    // Encrypt the message text
    const encrypted = encryptionService.encrypt(data.text);

    // Directly create the message (conversation should already exist)
    const [message] = await db
      .insert(conversationsMessages)
      .values({
        conversationId: data.conversationId,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        text: encrypted.encryptedText,
        iv: encrypted.iv,
        tag: encrypted.tag,
      })
      .returning();

    // Return decrypted message for immediate use
    return this.decryptMessage(message as unknown as MessageRow);
  },

  async create(data: {
    conversationId: string;
    fromUserId: string;
    toUserId: string;
    text: string;
    type?: ConversationTypes;
  }): Promise<MessageRow> {
    const db = getDb();

    // Encrypt the message text
    const encrypted = encryptionService.encrypt(data.text);

    // Use a single transaction to ensure conversation exists and create message
    const result = await db.transaction(async (tx) => {
      // First, ensure conversation exists (only insert if not exists)
      await tx
        .insert(conversations)
        .values({
          id: data.conversationId,
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          type: data.type || 'message',
        })
        .onConflictDoNothing();

      // Then create the message
      const [message] = await tx
        .insert(conversationsMessages)
        .values({
          conversationId: data.conversationId,
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          text: encrypted.encryptedText,
          iv: encrypted.iv,
          tag: encrypted.tag,
        })
        .returning();

      return message;
    });

    // Return decrypted message for immediate use
    return this.decryptMessage(result as unknown as MessageRow);
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

  async findByConversationId(conversationId: string, limit = 50): Promise<MessageRow[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(conversationsMessages)
      .where(eq(conversationsMessages.conversationId, conversationId))
      .orderBy(desc(conversationsMessages.createdAt))
      .limit(limit);

    // Decrypt all messages
    return (rows as unknown as MessageRow[]).map((message) => this.decryptMessage(message));
  },

  async findByUserPair(userId1: string, userId2: string, limit = 50): Promise<MessageRow[]> {
    const db = getDb();
    const conversationId = [userId1, userId2].sort().join('|');

    const rows = await db
      .select()
      .from(conversationsMessages)
      .where(and(eq(conversationsMessages.conversationId, conversationId)))
      .orderBy(desc(conversationsMessages.createdAt))
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
      .from(conversationsMessages)
      .where(and(eq(conversationsMessages.fromUserId, userId)))
      .orderBy(desc(conversationsMessages.createdAt))
      .limit(limit);

    // Decrypt all messages
    return (rows as unknown as MessageRow[]).map((message) => this.decryptMessage(message));
  },

  async getConversations(userId: string, maxConversations = 20): Promise<ConversationSummary[]> {
    const db = getDb();
    const conversationList: ConversationSummary[] = [];

    // Use raw SQL query that works
    const userMessages = await db.execute(`
      WITH ranked_messages AS (
        SELECT 
          cm.conversation_id,
          cm.from_user_id,
          cm.to_user_id,
          cm.text,
          cm.iv,
          cm.tag,
          cm.created_at,
          cm.seen,
          hc.hidden,
          ROW_NUMBER() OVER (PARTITION BY cm.conversation_id ORDER BY cm.created_at DESC) as rn,
          MAX(cm.created_at) OVER (PARTITION BY cm.conversation_id) as max_created_at
        FROM conversations_messages cm
        LEFT JOIN hidden_conversations hc ON cm.conversation_id = hc.conversation_id AND hc.user_id = '${userId}'
        WHERE cm.from_user_id = '${userId}' OR cm.to_user_id = '${userId}'
      ),
      latest_conversations AS (
        SELECT DISTINCT conversation_id, max_created_at
        FROM ranked_messages
        WHERE rn = 1 AND (hidden IS NULL OR hidden = false)
        ORDER BY max_created_at DESC
        LIMIT ${maxConversations}
      )
      SELECT 
        rm.conversation_id,
        rm.from_user_id,
        rm.to_user_id,
        rm.text,
        rm.iv,
        rm.tag,
        rm.created_at,
        rm.seen,
        rm.hidden
      FROM ranked_messages rm
      INNER JOIN latest_conversations lc ON rm.conversation_id = lc.conversation_id
      WHERE rm.rn <= 10
      ORDER BY rm.created_at DESC
    `);

    // Group by conversationId and get the latest message for each conversation
    const conversationMap = new Map();
    const unreadCountMap = new Map<string, number>();

    for (const message of userMessages) {
      const conversationId = String(message.conversation_id);
      const fromUserId = String(message.from_user_id);
      const toUserId = String(message.to_user_id);
      const createdAt = new Date(String(message.created_at));
      const seen = Boolean(message.seen);

      if (!conversationMap.has(conversationId)) {
        // Get the other user from the conversation
        const conversationRecord = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, conversationId))
          .limit(1);

        if (conversationRecord.length === 0) continue;

        const otherUserId = fromUserId === userId ? toUserId : fromUserId;

        // Only decrypt the latest message for display
        const decryptedMessage = this.decryptMessage({
          id: '',
          conversationId,
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

        conversationMap.set(conversationId, {
          conversationId,
          otherUserId,
          lastMessage: decryptedMessage.text,
          lastMessageTime: createdAt,
          lastMessageFromUserId: fromUserId,
          lastMessageSeen: seen,
          unreadCount: 0, // Will calculate this from messages
        });
      }

      // Count unread messages (messages not from current user and not seen)
      if (toUserId === userId && !seen) {
        const currentCount = unreadCountMap.get(conversationId) || 0;
        unreadCountMap.set(conversationId, currentCount + 1);
      }
    }

    // Get user details for all other users
    for (const [, conversation] of conversationMap as any) {
      const userDetails = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, conversation.otherUserId))
        .limit(1);

      if (userDetails.length > 0) {
        conversationList.push({
          conversationId: conversation.conversationId,
          otherUserId: conversation.otherUserId,
          lastMessage: conversation.lastMessage,
          lastMessageTime: conversation.lastMessageTime,
          lastMessageFromUserId: conversation.lastMessageFromUserId,
          lastMessageSeen: conversation.lastMessageSeen,
          unreadCount: unreadCountMap.get(conversation.conversationId) || 0,
          otherUserName: userDetails[0].name,
          otherUserEmail: userDetails[0].email,
          otherUserAvatar: userDetails[0].avatar,
          otherUserRole: userDetails[0].role,
        });
      }
    }

    return conversationList;
  },

  // Mark messages as seen
  async markAsSeen(conversationId: string, userId: string): Promise<MessageRow[]> {
    const db = getDb();
    const rows = await db
      .update(conversationsMessages)
      .set({
        seen: true,
        seenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(conversationsMessages.conversationId, conversationId),
          eq(conversationsMessages.toUserId, userId),
          eq(conversationsMessages.seen, false)
        )
      )
      .returning();

    // Decrypt all messages
    return (rows as unknown as MessageRow[]).map((message) => this.decryptMessage(message));
  },

  // Get unread message count for a user
  async getUnreadCount(userId: string): Promise<number> {
    const db = getDb();
    const result = await db
      .select({ count: conversationsMessages.id })
      .from(conversationsMessages)
      .where(
        and(eq(conversationsMessages.toUserId, userId), eq(conversationsMessages.seen, false))
      );
    return result.length;
  },

  // Get unread count for specific conversation
  async getUnreadCountForConversation(conversationId: string, userId: string): Promise<number> {
    const db = getDb();
    const result = await db
      .select({ count: conversationsMessages.id })
      .from(conversationsMessages)
      .where(
        and(
          eq(conversationsMessages.conversationId, conversationId),
          eq(conversationsMessages.toUserId, userId),
          eq(conversationsMessages.seen, false)
        )
      );
    return result.length;
  },

  // Get last seen message for a conversation
  async getLastSeenMessage(conversationId: string, userId: string): Promise<MessageRow | null> {
    const db = getDb();
    const result = await db
      .select()
      .from(conversationsMessages)
      .where(
        and(
          eq(conversationsMessages.conversationId, conversationId),
          eq(conversationsMessages.toUserId, userId),
          eq(conversationsMessages.seen, true)
        )
      )
      .orderBy(desc(conversationsMessages.seenAt))
      .limit(1);

    if (result[0]) {
      return this.decryptMessage(result[0] as unknown as MessageRow);
    }
    return null;
  },

  // Set conversation visibility (hide/unhide)
  async setConversationVisibility(
    conversationId: string,
    userId: string,
    hidden: boolean
  ): Promise<void> {
    const db = getDb();

    // Insert or update hidden conversation record
    await db
      .insert(hiddenConversations)
      .values({
        userId,
        conversationId,
        hidden,
      })
      .onConflictDoUpdate({
        target: [hiddenConversations.userId, hiddenConversations.conversationId],
        set: {
          hidden,
          hiddenAt: new Date(),
        },
      });
  },

  // Hide conversation (convenience method)
  async hideConversation(conversationId: string, userId: string): Promise<void> {
    return this.setConversationVisibility(conversationId, userId, true);
  },

  // Unhide conversation (convenience method)
  async unhideConversation(conversationId: string, userId: string): Promise<void> {
    return this.setConversationVisibility(conversationId, userId, false);
  },
};
