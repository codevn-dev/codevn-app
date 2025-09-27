import { messageRepository } from '../database/repository';
import { BaseService } from './base';
import {
  ChatQueryRequest,
  ConversationListResponse,
  MessageListResponse,
} from '@/types/shared/chat';
import { SuccessResponse } from '@/types/shared/common';
import { CommonError, RoleLevel } from '@/types/shared';

export class ChatService extends BaseService {
  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string, maxConversations = 20): Promise<ConversationListResponse> {
    try {
      const conversations = await messageRepository.getConversations(userId, maxConversations);

      const response: ConversationListResponse = {
        conversations: conversations
          .filter((conv) => conv.otherUserRole !== RoleLevel.system) // Filter out system users
          .map((conv) => {
            const { otherUserId, otherUserName, otherUserAvatar, lastMessageFromUserId } = conv;
            return {
              id: conv.conversationId,
              peer: {
                id: otherUserId,
                name: otherUserName,
                avatar: otherUserAvatar || undefined,
              },
              lastMessage: {
                id: `${conv.conversationId}:${new Date(conv.lastMessageTime).getTime()}`,
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

      const conversationId = await messageRepository.getConversationId(userId, peerId);

      if (action === 'get') {
        // Get messages for this conversation from database
        const conversationMessages = await messageRepository.findByConversationId(conversationId);

        let filteredMessages = conversationMessages;

        // Filter messages since the given timestamp (for polling)
        const sinceTimestamp = parseInt(since);
        if (sinceTimestamp > 0) {
          filteredMessages = conversationMessages.filter(
            (msg: any) => new Date(msg.createdAt).getTime() > sinceTimestamp
          );
        }

        // Filter messages before the given timestamp (for load more)
        const beforeTimestamp = parseInt(before);
        if (beforeTimestamp > 0) {
          filteredMessages = conversationMessages.filter(
            (msg: any) => new Date(msg.createdAt).getTime() < beforeTimestamp
          );
        }

        // Sort by timestamp descending (newest first)
        filteredMessages.sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Apply limit
        const limitNum = parseInt(limit);
        const limitedMessages = filteredMessages.slice(0, limitNum);

        // Sort by timestamp ascending (oldest first) for display
        limitedMessages.sort(
          (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        const response: MessageListResponse = {
          messages: limitedMessages.map((msg: any) => {
            return {
              id: msg.id,
              content: msg.text,
              sender: {
                id: msg.fromUserId,
              },
              receiver: {
                id: peerId,
              },
              conversationId: msg.conversationId,
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
   * Hide conversation
   */
  async hideConversation(
    userId: string,
    conversationId: string,
    hide: boolean
  ): Promise<SuccessResponse> {
    try {
      if (hide) {
        await messageRepository.hideConversation(conversationId, userId);
      } else {
        await messageRepository.unhideConversation(conversationId, userId);
      }
      return { success: true };
    } catch (error) {
      this.handleError(error, 'Hide conversation');
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();
