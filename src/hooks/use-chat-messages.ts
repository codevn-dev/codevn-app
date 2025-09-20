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

  const userId = user?.id || '';
  const canChat = Boolean(userId && peerId && userId !== peerId);

  // Helper function to transform API messages to UI messages
  const transformMessages = (apiMessages: any[]): UiMessage[] => {
    return apiMessages
      .map((msg: any) => {
        const timestamp = new Date(msg.createdAt || msg.timestamp).getTime();
        return {
          id: `${msg.id || msg.timestamp}-${timestamp}`,
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
      try {
        // Always fetch all messages to get updated seen status
        const response = await fetch(`/api/chat?peerId=${encodeURIComponent(peerId)}&action=get`);
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            const allMessages = transformMessages(data.messages);
            
            setMessages(prev => {
              // Check if there are any new messages or seen status changes
              const hasNewMessages = allMessages.some(newMsg => 
                !prev.find(prevMsg => prevMsg.id === newMsg.id)
              );
              
              const hasSeenUpdates = allMessages.some(newMsg => {
                const prevMsg = prev.find(prevMsg => prevMsg.id === newMsg.id);
                return prevMsg && prevMsg.seen !== newMsg.seen;
              });
              
              if (hasNewMessages || hasSeenUpdates) {
                // Update last message time for new messages
                if (hasNewMessages) {
                  const latestMessage = allMessages[allMessages.length - 1];
                  setLastMessageTime(latestMessage.timestamp);
                  
                  // Callback for new messages
                  if (onNewMessage) {
                    const newMessages = allMessages.filter(newMsg => 
                      !prev.find(prevMsg => prevMsg.id === newMsg.id)
                    );
                    newMessages.forEach(msg => onNewMessage(msg));
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
      }
    };

    // Start polling every 3 seconds for both new messages and seen status updates
    pollingRef.current = setInterval(pollForUpdates, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isActive, canChat, peerId, onNewMessage]);

  return {
    messages,
    loading,
    setMessages,
    lastMessageTime,
    setLastMessageTime
  };
}
