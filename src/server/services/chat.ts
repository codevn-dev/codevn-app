import { messageRepository } from '../database/repository';
import { BaseService } from './base';
import {
  ChatQueryRequest,
  ChatPostRequest,
  ChatSeenRequest,
  ConversationListResponse,
  MessageListResponse,
  SendMessageResponse,
} from '@/types/shared/chat';
import { SuccessResponse } from '@/types/shared/common';
import { CommonError } from '@/types/shared';

export class ChatService extends BaseService {
  /**
   * Generate chat ID from two user IDs
   */
  getChatId(userA: string, userB: string): string {
    return [userA, userB].sort().join('|');
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string): Promise<ConversationListResponse> {
    try {
      const conversations = await messageRepository.getConversations(userId);

      const response: ConversationListResponse = {
        conversations: conversations.map((conv) => {
          const { otherUserId, otherUserName, otherUserAvatar, lastMessageFromUserId } = conv;
          return {
            id: conv.chatId,
            peer: {
              id: otherUserId,
              name: otherUserName,
              avatar: otherUserAvatar || undefined,
            },
            lastMessage: {
              id: `${conv.chatId}:${new Date(conv.lastMessageTime).getTime()}`,
              content: conv.lastMessage,
              sender: {
                id: lastMessageFromUserId,
              },
              createdAt: conv.lastMessageTime,
              seen: conv.lastMessageSeen,
            },
            unreadCount: conv.unreadCount,
          };
        }),
        pagination: {
          page: 1,
          limit: conversations.length,
          total: conversations.length,
          totalPages: 1,
        },
      };
      return response;
    } catch (error) {
      this.handleError(error, 'Get conversations');
    }
  }

  /**
   * Get chat messages
   */
  async getChatMessages(userId: string, query: ChatQueryRequest): Promise<MessageListResponse> {
    try {
      const { peerId, action = 'get', since = '0', limit = '20', before = '' } = query;

      if (!peerId) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      const chatId = this.getChatId(userId, peerId);

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
          messages: limitedMessages.map((msg) => {
            const { fromUserId, toUserId } = msg;
            return {
              id: msg.id,
              content: msg.text,
              sender: {
                id: fromUserId,
              },
              receiver: {
                id: toUserId,
              },
              conversationId: msg.chatId,
              createdAt: msg.createdAt,
              updatedAt: msg.updatedAt ?? msg.createdAt,
              seen: msg.seen,
              seenAt: msg.seenAt as any,
            };
          }),
          pagination: {
            page: 1,
            limit: limitNum,
            total: filteredMessages.length,
            totalPages: Math.max(1, Math.ceil(filteredMessages.length / limitNum)),
          },
        };
        return response;
      }

      throw new Error(CommonError.BAD_REQUEST);
    } catch (error) {
      this.handleError(error, 'Get chat messages');
    }
  }

  /**
   * Mark messages as seen
   */
  async markMessagesAsSeen(userId: string, body: ChatSeenRequest): Promise<SuccessResponse> {
    try {
      const { chatId } = body;

      if (!chatId) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      // Mark messages as seen
      await messageRepository.markAsSeen(chatId, userId);

      return { success: true };
    } catch (error) {
      this.handleError(error, 'Mark messages as seen');
    }
  }

  /**
   * Send chat message
   */
  async sendMessage(userId: string, body: ChatPostRequest): Promise<SendMessageResponse> {
    try {
      const { peerId, text } = body;

      if (!peerId || !text) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      const chatId = this.getChatId(userId, peerId);
      // Save message to database
      const message = await messageRepository.create({
        chatId,
        fromUserId: userId,
        toUserId: peerId,
        text: String(text).slice(0, 4000),
        type: 'message',
      });

      const { fromUserId, toUserId } = message;
      const response: SendMessageResponse = {
        message: 'Message sent',
        data: {
          id: message.id,
          content: message.text,
          sender: {
            id: fromUserId,
          },
          receiver: {
            id: toUserId,
          },
          conversationId: message.chatId,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt ?? message.createdAt,
          seen: message.seen,
          seenAt: message.seenAt as any,
        },
      };
      return response;
    } catch (error) {
      this.handleError(error, 'Send message');
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();
