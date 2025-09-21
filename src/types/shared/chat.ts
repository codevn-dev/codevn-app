import { User } from './auth';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  sender: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
  receiver: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
  seen: boolean;
  seenAt?: string | null;
}

export interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  participant1: User;
  participant2: User;
  lastMessage?: Message;
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

// Request types
export interface SendMessageRequest {
  receiverId: string;
  content: string;
}

export interface GetMessagesRequest {
  conversationId: string;
  page?: string;
  limit?: string;
}

export interface MarkAsReadRequest {
  messageId: string;
}

export interface ChatQueryRequest {
  peerId: string;
  action?: string;
  since?: string;
  limit?: string;
  before?: string;
}

export interface ChatPostRequest {
  peerId: string;
  text: string;
}

export interface ChatSeenRequest {
  chatId: string;
}

// Response types
export interface MessageResponse {
  message: Message;
}

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
