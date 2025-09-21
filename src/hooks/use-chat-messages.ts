'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface UiMessage {
  id: string;
  type: 'message' | 'system';
  from: string;
  text: string;
  timestamp: number;
  seen: boolean;
  seenAt?: string | null;
}

interface UseChatMessagesProps {
  peerId: string;
  isActive: boolean;
  onNewMessage?: (message: UiMessage) => void;
}

export function useChatMessages({ peerId, isActive, onNewMessage }: UseChatMessagesProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  const userId = user?.id || '';
  const canChat = Boolean(userId && peerId && userId !== peerId);

  // Helper function to transform API messages to UI messages
  const transformMessages = (apiMessages: any[]): UiMessage[] => {
    return apiMessages
      .map((msg: any) => {
        const timestamp = new Date(msg.createdAt || msg.timestamp).getTime();
        return {
          id: msg.id || `${msg.fromUserId || msg.from}-${timestamp}`, // Use actual message ID if available
          type: msg.type || 'message',
          from: msg.fromUserId || msg.from,
          text: msg.text,
          timestamp,
          seen: msg.seen || false,
          seenAt: msg.seenAt,
        };
      })
      .sort((a: UiMessage, b: UiMessage) => a.timestamp - b.timestamp);
  };

  // Fetch messages when component becomes active
  useEffect(() => {
    if (!isActive || !canChat) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/chat?peerId=${encodeURIComponent(peerId)}&action=get`);
        if (response.ok) {
          const data = await response.json();
          const uiMessages = transformMessages(data.messages || []);
          setMessages(uiMessages);

          // Update last message time for polling
          if (uiMessages.length > 0) {
            setLastMessageTime(uiMessages[uiMessages.length - 1].timestamp);
          }
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [isActive, canChat, peerId]);

  // Poll for new messages and seen status updates when active
  useEffect(() => {
    if (!isActive || !canChat) return;

    const pollForUpdates = async () => {
      if (isPollingRef.current) return; // Prevent concurrent polling

      isPollingRef.current = true;
      try {
        // Always fetch all messages to get updated seen status
        const response = await fetch(`/api/chat?peerId=${encodeURIComponent(peerId)}&action=get`);
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            const allMessages = transformMessages(data.messages);

            setMessages((prev) => {
              // Create a map of existing messages for faster lookup
              const existingMessages = new Map(prev.map((msg) => [msg.id, msg]));

              // Check if there are any new messages or seen status changes
              const newMessages: UiMessage[] = [];
              const hasSeenUpdates = allMessages.some((newMsg) => {
                const prevMsg = existingMessages.get(newMsg.id);
                return prevMsg && prevMsg.seen !== newMsg.seen;
              });

              // Find truly new messages
              allMessages.forEach((newMsg) => {
                if (!existingMessages.has(newMsg.id)) {
                  newMessages.push(newMsg);
                }
              });

              if (newMessages.length > 0 || hasSeenUpdates) {
                // Update last message time for new messages
                if (newMessages.length > 0) {
                  const latestMessage = allMessages[allMessages.length - 1];
                  setLastMessageTime(latestMessage.timestamp);

                  // Callback for new messages
                  if (onNewMessage) {
                    newMessages.forEach((msg) => onNewMessage(msg));
                  }
                }

                return allMessages;
              }

              return prev;
            });
          }
        }
      } catch (error) {
        console.error('Error polling for updates:', error);
      } finally {
        isPollingRef.current = false;
      }
    };

    // Start polling every 2 seconds for both new messages and seen status updates
    pollingRef.current = setInterval(pollForUpdates, 2000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      isPollingRef.current = false;
    };
  }, [isActive, canChat, peerId, onNewMessage]);

  return {
    messages,
    loading,
    setMessages,
    lastMessageTime,
    setLastMessageTime,
  };
}
