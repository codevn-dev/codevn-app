// import { User } from './auth';

export interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
  };
  receiver: {
    id: string;
  };
  conversationId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  seen: boolean;
  seenAt?: string | null;
}

export interface Conversation {
  id: string;
  peer: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  lastMessage?: {
    id: string;
    content: string;
    sender: {
      id: string;
    };
    createdAt: Date | string;
    seen: boolean;
  };
  unreadCount: number;
}

export interface UiMessage {
  id: string;
  type: 'message' | 'system';
  from: string;
  text: string;
  timestamp: number;
  seen: boolean;
  seenAt?: string | null;
}

export interface ChatQueryRequest {
  peerId: string;
  action?: string;
  since?: string;
  limit?: string;
  before?: string;
}

// Response types
export interface MessageListResponse {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ConversationListResponse {
  conversations: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SendMessageResponse {
  message: string;
  data: Message;
}

export interface MarkAsReadResponse {
  message: string;
}

// Lightweight API response types for REST endpoints
export interface ChatQueryResponse {
  messages: Message[];
  hasMore?: boolean;
}

export interface ChatConversationsResponse {
  conversations: Conversation[];
}

// Repository types for messages
export interface MessageRow {
  id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  iv: string;
  tag: string;
  type: 'message' | 'system';
  seen: boolean;
  seenAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface ConversationSummary {
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserEmail: string;
  otherUserAvatar: string | null;
  lastMessage: string;
  lastMessageTime: Date;
  lastMessageFromUserId: string;
  lastMessageSeen: boolean;
  unreadCount: number;
}
