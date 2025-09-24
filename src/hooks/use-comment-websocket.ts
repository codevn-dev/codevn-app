'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthState } from './use-auth-state';
import { Comment } from '@/types/shared';
import { config } from '@/config/config';

interface CommentWebSocketMessage {
  type: 'connected' | 'new_comment' | 'new_reply' | 'error';
  data?: any;
}

interface UseCommentWebSocketProps {
  onNewComment?: (comment: Comment) => void;
  onNewReply?: (reply: Comment) => void;
}

export function useCommentWebSocket({ onNewComment, onNewReply }: UseCommentWebSocketProps = {}) {
  const { user } = useAuthState();
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const isConnectingRef = useRef(false);
  const maxReconnectAttempts = 5;

  // Use refs to store current values
  const userRef = useRef(user);

  // Update refs when values change
  userRef.current = user;

  const handleWebSocketMessage = useCallback(
    (message: CommentWebSocketMessage) => {
      switch (message.type) {
        case 'connected':
          break;

        case 'new_comment':
          if (message.data && onNewComment) {
            const comment: Comment = {
              id: message.data.id,
              content: message.data.content,
              articleId: message.data.articleId,
              author: message.data.author || {
                id: message.data.authorId,
                name: message.data.authorName,
              },
              parentId: message.data.parentId,
              createdAt: message.data.createdAt,
              updatedAt: message.data.updatedAt,
              replyCount: message.data.replyCount || 0,
              likeCount: message.data.likeCount || 0,
              unlikeCount: message.data.unlikeCount || 0,
              userHasLiked: message.data.userHasLiked || false,
              userHasUnliked: message.data.userHasUnliked || false,
              _count: {
                replies: message.data.replyCount || 0,
                likes: message.data.likeCount || 0,
              },
            };
            onNewComment(comment);
          }
          break;

        case 'new_reply':
          if (message.data && onNewReply) {
            const reply: Comment = {
              id: message.data.id,
              content: message.data.content,
              articleId: message.data.articleId,
              author: message.data.author || {
                id: message.data.authorId,
                name: message.data.authorName,
              },
              parentId: message.data.parentId,
              createdAt: message.data.createdAt,
              updatedAt: message.data.updatedAt,
              replyCount: message.data.replyCount || 0,
              likeCount: message.data.likeCount || 0,
              unlikeCount: message.data.unlikeCount || 0,
              userHasLiked: message.data.userHasLiked || false,
              userHasUnliked: message.data.userHasUnliked || false,
              _count: {
                replies: message.data.replyCount || 0,
                likes: message.data.likeCount || 0,
              },
            };
            onNewReply(reply);
          }
          break;

        case 'error':
          console.error('Comment WebSocket error:', message.data);
          break;
      }
    },
    [onNewComment, onNewReply]
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnectingRef.current) return;

    isConnectingRef.current = true;

    // Clean up any existing connection before creating a new one
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      // Get auth token from cookies
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('auth-token='))
        ?.split('=')[1];

      // Include token in WebSocket URL as query parameter
      const baseUrl = config.comment.wsUrl;
      const wsUrl = token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        isConnectingRef.current = false;

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: CommentWebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing Comment WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.error('Comment WebSocket closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        setIsConnected(false);
        isConnectingRef.current = false;

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;

          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('Comment WebSocket error:', {
          error,
          url: wsUrl,
          readyState: ws.readyState,
          userId: user?.id,
          errorType: (error as any)?.type,
        });

        // Don't attempt to reconnect on error - let the close handler handle it
        setIsConnected(false);
        isConnectingRef.current = false;
      };
    } catch (error) {
      console.error('Error creating Comment WebSocket connection:', error);
      isConnectingRef.current = false;
    }
  }, [handleWebSocketMessage, user?.id]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setIsConnected(false);
    isConnectingRef.current = false;
  }, []);

  const sendComment = useCallback((articleId: string, content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'comment',
          articleId,
          content,
        })
      );
    }
  }, []);

  const sendReply = useCallback((articleId: string, content: string, parentId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'reply',
          articleId,
          content,
          parentId,
        })
      );
    }
  }, []);

  // Connect once on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isConnected,
    sendComment,
    sendReply,
  };
}
