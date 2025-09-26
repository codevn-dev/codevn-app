'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthState } from './use-auth-state';
import { useUIStore } from '@/stores/ui-store';
import { useChat as useChatContext } from '@/components/features/chat/chat-context';
import { UiMessage, UserResponse } from '@/types/shared';
import { chatConfig } from '@/config/config';
import { apiGet, apiPost } from '@/lib/utils/api-client';
import {
  ChatConversationsResponse,
  ChatQueryResponse,
  HideConversationRequest,
} from '@/types/shared/chat';

interface Conversation {
  id: string;
  peer: {
    id: string;
    name: string;
    avatar?: string;
  };
  lastMessage?: {
    text: string;
    createdAt: string;
    fromUserId: string;
    seen?: boolean;
  };
  lastMessageAt?: string;
  lastMessageFromUserId?: string;
  lastMessageSeen?: boolean;
  unreadCount?: number;
}

interface WebSocketMessage {
  type:
    | 'connected'
    | 'new_message'
    | 'message_sent'
    | 'typing'
    | 'messages_seen'
    | 'error'
    | 'online_users'
    | 'user_online'
    | 'user_offline';
  data?: any;
}

interface UseChatMessagesProps {
  peerId?: string;
  onNewMessage?: (message: UiMessage) => void;
  onTyping?: (fromUserId: string, isTyping: boolean) => void;
  onMessagesSeen?: (chatId: string, seenBy: string) => void;
}

export function useChatMessages({
  peerId: _peerId,
  onNewMessage,
  onTyping,
  onMessagesSeen,
}: UseChatMessagesProps = {}) {
  const { user } = useAuthState();
  const { addNotification } = useUIStore();
  const { handleStartChat, chatWindowOpen, peer } = useChatContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const isConnectingRef = useRef(false);
  const isFetchingConversationsRef = useRef(false);
  const conversationsLoadedRef = useRef(false);
  const maxReconnectAttempts = 5;

  // Use refs to store current values
  const userRef = useRef(user);
  const peerIdRef = useRef(peer.id);
  const chatWindowOpenRef = useRef(chatWindowOpen);
  const conversationsRef = useRef(conversations);

  // Update refs when values change
  userRef.current = user;
  peerIdRef.current = peer.id;
  chatWindowOpenRef.current = chatWindowOpen;
  conversationsRef.current = conversations;

  // Function to fetch user details by ID
  const fetchUserDetails = useCallback(async (userId: string) => {
    try {
      const response = await apiGet<{ user: { id: string; name: string; avatar?: string } }>(
        `/api/users/${userId}`
      );
      return response.user;
    } catch (error) {
      console.error('Error fetching user details:', error);
      return { id: userId, name: 'Unknown User', avatar: undefined };
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    if (isFetchingConversationsRef.current) return;
    isFetchingConversationsRef.current = true;
    try {
      const data = await apiGet<ChatConversationsResponse>('/api/chat/conversations');
      const normalized = (data.conversations || []).map((conv: any) => {
        // Normalize server response to the shape used by UI
        const last = conv.lastMessage || {};
        return {
          id: conv.id,
          peer: {
            id: conv.peer.id,
            name: conv.peer.name || 'Unknown User',
            avatar: conv.peer.avatar,
          },
          lastMessage: {
            text: last.content || '',
            createdAt: last.createdAt,
            fromUserId: last.sender?.id,
            seen: last.seen ?? false,
          },
          lastMessageAt: last.createdAt,
          lastMessageFromUserId: last.sender?.id,
          lastMessageSeen: last.seen,
          unreadCount: conv.unreadCount || 0,
        } as Conversation;
      });
      setConversations(normalized);
      conversationsLoadedRef.current = true;
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      isFetchingConversationsRef.current = false;
    }
  }, []);

  const handleWebSocketMessage = useCallback(
    async (message: WebSocketMessage) => {
      switch (message.type) {
        case 'connected':
          // Fetch initial conversations
          if (!conversationsLoadedRef.current) {
            fetchConversations();
          }
          // Initialize presence from server payload if available
          if (message.data?.onlineUsers && Array.isArray(message.data.onlineUsers)) {
            setOnlineUsers(message.data.onlineUsers as string[]);
          }
          break;

        case 'new_message':
          if (message.data) {
            const uiMessage: UiMessage = {
              id: message.data.id,
              type: message.data.type || 'message',
              from: message.data.fromUser?.id,
              text: message.data.text,
              timestamp: message.data.timestamp || new Date(message.data.createdAt).getTime(),
              seen: message.data.seen || false,
              seenAt: message.data.seenAt,
            };

            // Use refs to get current values
            const currentUser = userRef.current;
            const currentPeerId = peerIdRef.current;

            // Show notification if not from current user AND not currently chatting with sender
            const isFromCurrentUser = uiMessage.from === currentUser?.id;
            const isCurrentlyChattingWithSender = currentPeerId === uiMessage.from;

            const shouldShowNotification = !isFromCurrentUser && !isCurrentlyChattingWithSender;

            if (shouldShowNotification) {
              // Find the conversation to get peer info
              const conversation = conversationsRef.current.find(
                (conv) => conv.peer?.id === uiMessage.from
              );

              // If conversation not found, fetch user info from API
              let senderName = conversation?.peer?.name;
              if (!senderName) {
                try {
                  const userData = await apiGet<UserResponse>(`/api/users/${uiMessage.from}`);
                  senderName = userData?.user?.name;
                  console.log(uiMessage.from);
                  await apiPost<HideConversationRequest>('/api/chat/hide', {
                    conversationId: uiMessage.from,
                    hide: false,
                  });
                } catch (error) {
                  console.error('Error fetching user info for notification:', error);
                }
              }

              // Show notification popup
              const notificationId = addNotification({
                type: 'info',
                title: senderName || 'Someone',
                message:
                  uiMessage.text.length > 50
                    ? `${uiMessage.text.substring(0, 50)}...`
                    : uiMessage.text,
                duration: 6000,
                action: {
                  onClick: () => {
                    // Use conversation if available, otherwise use message sender info
                    const peerId = conversation?.peer?.id || uiMessage.from;
                    const peerName = conversation?.peer?.name || senderName || 'User';
                    const peerAvatar = conversation?.peer?.avatar;

                    handleStartChat(peerId, peerName, peerAvatar);

                    // Auto close notification when clicked
                    setTimeout(() => {
                      const { removeNotification } = useUIStore.getState();
                      removeNotification(notificationId);
                    }, 100);
                  },
                },
              });
            }

            // Update conversations list directly with new message
            setConversations((prevConversations) => {
              const updatedConversations = [...prevConversations];
              // For receiver, peer is the sender; for safety also fallback to to-user match
              const targetPeerId = uiMessage.from;
              const conversationIndex = updatedConversations.findIndex(
                (conv) => conv.peer?.id === targetPeerId
              );

              if (conversationIndex >= 0) {
                // Update existing conversation
                const isFromCurrentUser = uiMessage.from === currentUser?.id;
                const isCurrentlyChattingWithSender = currentPeerId === uiMessage.from;
                const currentUnreadCount = updatedConversations[conversationIndex].unreadCount || 0;

                updatedConversations[conversationIndex] = {
                  ...updatedConversations[conversationIndex],
                  lastMessage: {
                    text: uiMessage.text,
                    createdAt: new Date(uiMessage.timestamp).toISOString(),
                    fromUserId: uiMessage.from,
                    seen: uiMessage.seen || false,
                  },
                  lastMessageAt: new Date(uiMessage.timestamp).toISOString(),
                  unreadCount:
                    isFromCurrentUser || isCurrentlyChattingWithSender ? 0 : currentUnreadCount + 1,
                };
              } else {
                // Create new conversation if not exists - will fetch user details separately
                const isFromCurrentUser = uiMessage.from === currentUser?.id;
                const isCurrentlyChattingWithSender = currentPeerId === uiMessage.from;

                const newConversation = {
                  id: `conv_${uiMessage.from}`,
                  peer: {
                    id: uiMessage.from,
                    name: 'Unknown User', // Will be updated when we fetch user details
                    avatar: undefined,
                  },
                  lastMessage: {
                    text: uiMessage.text,
                    createdAt: new Date(uiMessage.timestamp).toISOString(),
                    fromUserId: uiMessage.from,
                    seen: uiMessage.seen || false,
                  },
                  lastMessageAt: new Date(uiMessage.timestamp).toISOString(),
                  unreadCount: isFromCurrentUser || isCurrentlyChattingWithSender ? 0 : 1,
                };
                updatedConversations.unshift(newConversation);
              }

              return updatedConversations;
            });

            // If we created a new conversation, fetch user details and update it
            const currentConversations = conversationsRef.current;
            const targetPeerId = uiMessage.from;
            const conversationIndex = currentConversations.findIndex(
              (conv) => conv.peer?.id === targetPeerId
            );

            if (conversationIndex === -1) {
              // This was a new conversation, fetch user details
              fetchUserDetails(uiMessage.from).then((userDetails) => {
                setConversations((prevConversations) => {
                  const updatedConversations = [...prevConversations];
                  const convIndex = updatedConversations.findIndex(
                    (conv) => conv.peer?.id === uiMessage.from
                  );

                  if (convIndex >= 0) {
                    updatedConversations[convIndex] = {
                      ...updatedConversations[convIndex],
                      peer: {
                        ...updatedConversations[convIndex].peer,
                        name: userDetails.name,
                        avatar: userDetails.avatar,
                      },
                    };
                  }

                  return updatedConversations;
                });
              });
            }

            if (onNewMessage) {
              onNewMessage(uiMessage);
            }
          }
          break;

        case 'message_sent': {
          // Update sender's conversation preview without increasing unread
          const data = message.data;
          if (data) {
            const otherUserId = data.toUser?.id as string;
            const timestamp = data.timestamp || new Date(data.createdAt).getTime();
            setConversations((prevConversations) => {
              const updated = [...prevConversations];
              const idx = updated.findIndex((c) => c.peer?.id === otherUserId);
              if (idx >= 0) {
                updated[idx] = {
                  ...updated[idx],
                  lastMessage: {
                    text: data.text,
                    createdAt: new Date(timestamp).toISOString(),
                    fromUserId: data.fromUser?.id,
                    seen: data.seen || false,
                  },
                  lastMessageAt: new Date(timestamp).toISOString(),
                  unreadCount: 0,
                } as any;
              } else if (otherUserId) {
                // Create new conversation - will fetch user details separately
                updated.unshift({
                  id: `conv_${otherUserId}`,
                  peer: { id: otherUserId, name: 'Unknown User', avatar: undefined },
                  lastMessage: {
                    text: data.text,
                    createdAt: new Date(timestamp).toISOString(),
                    fromUserId: data.fromUser?.id,
                    seen: data.seen || false,
                  },
                  lastMessageAt: new Date(timestamp).toISOString(),
                  unreadCount: 0,
                } as any);
              }
              return updated;
            });

            // If we created a new conversation, fetch user details and update it
            if (otherUserId) {
              const currentConversations = conversationsRef.current;
              const conversationIndex = currentConversations.findIndex(
                (conv) => conv.peer?.id === otherUserId
              );

              if (conversationIndex === -1) {
                // This was a new conversation, fetch user details
                fetchUserDetails(otherUserId).then((userDetails) => {
                  setConversations((prevConversations) => {
                    const updatedConversations = [...prevConversations];
                    const convIndex = updatedConversations.findIndex(
                      (conv) => conv.peer?.id === otherUserId
                    );

                    if (convIndex >= 0) {
                      updatedConversations[convIndex] = {
                        ...updatedConversations[convIndex],
                        peer: {
                          ...updatedConversations[convIndex].peer,
                          name: userDetails.name,
                          avatar: userDetails.avatar,
                        },
                      };
                    }

                    return updatedConversations;
                  });
                });
              }
            }
          }
          break;
        }

        case 'typing':
          if (message.data && onTyping) {
            onTyping(message.data.fromUserId, message.data.isTyping);
          }
          break;

        case 'messages_seen':
          if (message.data && onMessagesSeen) {
            onMessagesSeen(message.data.chatId, message.data.seenBy);
          }
          break;

        // Presence updates (if server emits)
        case 'online_users': {
          const ids = (message.data?.onlineUsers || []) as string[];
          if (Array.isArray(ids)) {
            setOnlineUsers(ids);
          }
          break;
        }
        case 'user_online': {
          const userId = message.data?.userId as string;
          if (userId) {
            setOnlineUsers((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
          }
          break;
        }
        case 'user_offline': {
          const userId = message.data?.userId as string;
          if (userId) {
            setOnlineUsers((prev) => prev.filter((id) => id !== userId));
          }
          break;
        }

        case 'error':
          console.error('WebSocket error:', message.data);
          break;
      }
    },
    [
      addNotification,
      fetchConversations,
      handleStartChat,
      onMessagesSeen,
      onNewMessage,
      onTyping,
      fetchUserDetails,
    ]
  );

  const connect = useCallback(() => {
    if (!user?.id || wsRef.current?.readyState === WebSocket.OPEN || isConnectingRef.current)
      return;

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
      const wsUrl = token
        ? `${chatConfig.wsUrl}?token=${encodeURIComponent(token)}`
        : chatConfig.wsUrl;
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
          const message: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
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
        console.error('WebSocket error:', {
          error,
          url: chatConfig.wsUrl,
          readyState: ws.readyState,
          userId: user?.id,
          errorType: error.type,
        });

        // Don't attempt to reconnect on error - let the close handler handle it
        setIsConnected(false);
        isConnectingRef.current = false;
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      isConnectingRef.current = false;
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const sendMessage = useCallback(
    (toUserId: string, text: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Create optimistic message for immediate UI update
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        const optimisticMessage: UiMessage = {
          id: tempId,
          type: 'message',
          from: user?.id || '',
          text,
          timestamp: Date.now(),
          seen: false,
        };

        // Send optimistic message to all components
        if (onNewMessage) {
          onNewMessage(optimisticMessage);
        }

        // Store temp ID for replacement later
        (wsRef.current as any).lastTempId = tempId;

        // Send via WebSocket
        wsRef.current.send(
          JSON.stringify({
            type: 'message',
            toUserId,
            text,
          })
        );
      }
    },
    [user?.id, onNewMessage]
  );

  const sendTyping = useCallback((toUserId: string, isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'typing',
          toUserId,
          data: { isTyping },
        })
      );
    }
  }, []);

  const markAsSeen = useCallback((chatId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'seen',
          chatId,
        })
      );
    }
  }, []);

  // Removed HTTP polling for online users; rely on WebSocket presence events

  const isUserOnline = useCallback(
    (userId: string) => {
      return onlineUsers.includes(userId);
    },
    [onlineUsers]
  );

  const loadMessages = useCallback(async (peerId: string, limit: number = 20, before?: number) => {
    try {
      const params = new URLSearchParams({
        peerId,
        action: 'get',
        limit: limit.toString(),
      });

      if (before) {
        params.append('before', before.toString());
      }

      const data = await apiGet<ChatQueryResponse>(`/api/chat?${params.toString()}`);
      return {
        messages: data.messages || [],
        hasMore: data.hasMore || false,
      };
    } catch (error) {
      console.error('Error loading messages:', error);
      return { messages: [], hasMore: false };
    }
  }, []);

  const loadMoreMessages = useCallback(
    async (peerId: string, before: number, limit: number = 20) => {
      return loadMessages(peerId, limit, before);
    },
    [loadMessages]
  );

  // Connect on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      connect();
      // Also fetch conversations immediately
      if (!conversationsLoadedRef.current) {
        fetchConversations();
      }
    }

    return () => {
      disconnect();
    };
  }, [user?.id, connect, disconnect, fetchConversations]);

  // No polling; presence updates come via WebSocket events only

  const markConversationAsRead = useCallback((peerId: string) => {
    setConversations((prevConversations) =>
      prevConversations.map((conv) =>
        conv.peer?.id === peerId ? { ...conv, unreadCount: 0 } : conv
      )
    );
  }, []);

  return {
    isConnected,
    conversations,
    onlineUsers,
    sendMessage,
    sendTyping,
    markAsSeen,
    isUserOnline,
    fetchConversations,
    loadMessages,
    loadMoreMessages,
    markConversationAsRead,
  };
}
