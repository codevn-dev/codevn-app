'use client';

import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { useCommentWebSocket } from '../../../hooks/use-comment-websocket';
import { Comment } from '@/types/shared';

interface CommentWebSocketContextType {
  isConnected: boolean;
  sendComment: (articleId: string, content: string) => void;
  sendReply: (articleId: string, content: string, parentId: string) => void;
  // Callback management
  onNewCommentCallbacks: Set<(comment: Comment) => void>;
  onNewReplyCallbacks: Set<(reply: Comment) => void>;
  addOnNewCommentCallback: (callback: (comment: Comment) => void) => () => void;
  addOnNewReplyCallback: (callback: (reply: Comment) => void) => () => void;
}

const CommentWebSocketContext = createContext<CommentWebSocketContextType | undefined>(undefined);

export function CommentWebSocketProvider({ children }: { children: ReactNode }) {
  const [onNewCommentCallbacks] = useState<Set<(comment: Comment) => void>>(new Set());
  const [onNewReplyCallbacks] = useState<Set<(reply: Comment) => void>>(new Set());

  const addOnNewCommentCallback = useCallback(
    (callback: (comment: Comment) => void) => {
      onNewCommentCallbacks.add(callback);
      return () => onNewCommentCallbacks.delete(callback);
    },
    [onNewCommentCallbacks]
  );

  const addOnNewReplyCallback = useCallback(
    (callback: (reply: Comment) => void) => {
      onNewReplyCallbacks.add(callback);
      return () => onNewReplyCallbacks.delete(callback);
    },
    [onNewReplyCallbacks]
  );

  const websocketData = useCommentWebSocket({
    onNewComment: (comment: Comment) => {
      onNewCommentCallbacks.forEach((callback) => callback(comment));
    },
    onNewReply: (reply: Comment) => {
      onNewReplyCallbacks.forEach((callback) => callback(reply));
    },
  });

  const contextValue: CommentWebSocketContextType = {
    ...websocketData,
    onNewCommentCallbacks,
    onNewReplyCallbacks,
    addOnNewCommentCallback,
    addOnNewReplyCallback,
  };

  return (
    <CommentWebSocketContext.Provider value={contextValue}>
      {children}
    </CommentWebSocketContext.Provider>
  );
}

export function useCommentWebSocketContext() {
  const context = useContext(CommentWebSocketContext);
  if (context === undefined) {
    throw new Error('useCommentWebSocketContext must be used within a CommentWebSocketProvider');
  }
  return context;
}
