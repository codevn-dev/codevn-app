'use client';

import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { useChatMessages } from '@/hooks/use-chat-messages';
import { UiMessage } from '@/types/shared';

interface WebSocketContextType {
  isConnected: boolean;
  conversations: any[];
  onlineUsers: string[];
  sendMessage: (toUserId: string, text: string) => void;
  sendTyping: (toUserId: string, isTyping: boolean) => void;
  isUserOnline: (userId: string) => boolean;
  fetchConversations: () => Promise<void>;
  loadMessages: (
    peerId: string,
    limit?: number,
    before?: number
  ) => Promise<{ messages: any[]; hasMore: boolean }>;
  loadMoreMessages: (
    peerId: string,
    before: number,
    limit?: number
  ) => Promise<{ messages: any[]; hasMore: boolean }>;
  markConversationAsRead: (peerId: string, chatId?: string) => void;
  // Callback management
  onNewMessageCallbacks: Set<(message: UiMessage) => void>;
  onTypingCallbacks: Set<(fromUserId: string, isTyping: boolean) => void>;
  onMessagesSeenCallbacks: Set<(chatId: string, seenBy: string) => void>;
  addOnNewMessageCallback: (callback: (message: UiMessage) => void) => () => void;
  addOnTypingCallback: (callback: (fromUserId: string, isTyping: boolean) => void) => () => void;
  addOnMessagesSeenCallback: (callback: (chatId: string, seenBy: string) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [onNewMessageCallbacks] = useState<Set<(message: UiMessage) => void>>(new Set());
  const [onTypingCallbacks] = useState<Set<(fromUserId: string, isTyping: boolean) => void>>(
    new Set()
  );
  const [onMessagesSeenCallbacks] = useState<Set<(chatId: string, seenBy: string) => void>>(
    new Set()
  );

  const addOnNewMessageCallback = useCallback(
    (callback: (message: UiMessage) => void) => {
      onNewMessageCallbacks.add(callback);
      return () => onNewMessageCallbacks.delete(callback);
    },
    [onNewMessageCallbacks]
  );

  const addOnTypingCallback = useCallback(
    (callback: (fromUserId: string, isTyping: boolean) => void) => {
      onTypingCallbacks.add(callback);
      return () => onTypingCallbacks.delete(callback);
    },
    [onTypingCallbacks]
  );

  const addOnMessagesSeenCallback = useCallback(
    (callback: (chatId: string, seenBy: string) => void) => {
      onMessagesSeenCallbacks.add(callback);
      return () => onMessagesSeenCallbacks.delete(callback);
    },
    [onMessagesSeenCallbacks]
  );

  const websocketData = useChatMessages({
    onNewMessage: (message: UiMessage) => {
      onNewMessageCallbacks.forEach((callback) => callback(message));
    },
    onTyping: (fromUserId: string, isTyping: boolean) => {
      onTypingCallbacks.forEach((callback) => callback(fromUserId, isTyping));
    },
    onMessagesSeen: (chatId: string, seenBy: string) => {
      onMessagesSeenCallbacks.forEach((callback) => callback(chatId, seenBy));
    },
  });

  const contextValue: WebSocketContextType = {
    ...websocketData,
    onNewMessageCallbacks,
    onTypingCallbacks,
    onMessagesSeenCallbacks,
    addOnNewMessageCallback,
    addOnTypingCallback,
    addOnMessagesSeenCallback,
  };

  return <WebSocketContext.Provider value={contextValue}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
