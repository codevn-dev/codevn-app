import { getDb } from '../index';
import { messages, users } from '../schema';
import { eq, and, desc, or } from 'drizzle-orm';

export const messageRepository = {
  async create(data: {
    chatId: string;
    fromUserId: string;
    toUserId: string;
    text: string;
    type?: 'message' | 'system';
  }) {
    const db = getDb();
    const [message] = await db
      .insert(messages)
      .values({
        chatId: data.chatId,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        text: data.text,
        type: data.type || 'message',
      })
      .returning();
    return message;
  },

  async findByChatId(chatId: string, limit = 50) {
    const db = getDb();
    return await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  },

  async findByUserPair(userId1: string, userId2: string, limit = 50) {
    const db = getDb();
    const chatId1 = [userId1, userId2].sort().join('|');
    const chatId2 = [userId2, userId1].sort().join('|');
    
    return await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.chatId, chatId1)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  },

  async getRecentChats(userId: string, limit = 20) {
    const db = getDb();
    // This is a simplified version - in production you'd want a more sophisticated query
    // to get the most recent chat for each user pair
    return await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.fromUserId, userId)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  },

  async getConversations(userId: string) {
    const db = getDb();
    
    // Get all messages for the current user
    const userMessages = await db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.fromUserId, userId),
          eq(messages.toUserId, userId)
        )
      )
      .orderBy(desc(messages.createdAt));

    // Group by chatId and get the latest message for each chat
    const chatMap = new Map();
    
    for (const message of userMessages) {
      if (!chatMap.has(message.chatId)) {
        const otherUserId = message.fromUserId === userId 
          ? message.toUserId 
          : message.fromUserId;
        
        chatMap.set(message.chatId, {
          chatId: message.chatId,
          otherUserId,
          lastMessage: message.text,
          lastMessageTime: message.createdAt,
          unreadCount: 0, // We'll calculate this separately if needed
        });
      }
    }

    // Get user details for all other users
    const conversations = [];
    for (const [chatId, chat] of chatMap) {
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
          ...chat,
          otherUserName: userDetails[0].name,
          otherUserEmail: userDetails[0].email,
          otherUserAvatar: userDetails[0].avatar,
        });
      }
    }

    return conversations;
  },
};
