'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthState } from './use-auth-state';
import { useUIStore } from '@/stores/ui-store';
import { useChat } from '@/components/features/chat/chat-context';

interface Conversation {
  userId: string;
  userName: string;
  userAvatar?: string;
  lastMessage: {
    text: string;
    createdAt: string;
    fromUserId: string;
    seen?: boolean;
  };
}

export function useChatPolling() {
  const { user } = useAuthState();
  const { addNotification } = useUIStore();
  const { handleStartChat, chatWindowOpen, chatPopupOpen } = useChat();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [lastCheckTime, setLastCheckTime] = useState<number>(() => {
    // Load from localStorage on initialization, but only use it if it's recent (within last 5 minutes)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chat-last-check-time');
      if (saved) {
        const savedTime = parseInt(saved, 10);
        const now = Date.now();
        // Only use saved time if it's within last 5 minutes, otherwise start fresh
        if (now - savedTime < 5 * 60 * 1000) {
          return savedTime;
        }
      }
    }
    return 0;
  });
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const lastCheckTimeRef = useRef(lastCheckTime);

  const checkForNewMessages = useCallback(async () => {
    if (!user?.id || isPollingRef.current) return;

    isPollingRef.current = true;

    try {
      // Get all conversations
      const conversationsResponse = await fetch('/api/chat/conversations');
      if (!conversationsResponse.ok) return;

      const conversationsData = await conversationsResponse.json();
      const newConversations = conversationsData.conversations || [];
      setConversations(newConversations);

      // Only check for notifications if neither chat window nor popup is open
      if (!chatWindowOpen && !chatPopupOpen) {
        // Check for new messages in each conversation
        for (const conversation of newConversations) {
          // Check if the last message is from others and not seen
          if (
            conversation.lastMessage &&
            conversation.lastMessage.fromUserId !== user.id &&
            !conversation.lastMessage.seen
          ) {
            const messageTime = new Date(conversation.lastMessage.createdAt).getTime();

            // Only show notification if message is newer than last check time
            if (messageTime > lastCheckTimeRef.current) {
              addNotification({
                type: 'info',
                title: `New message from ${conversation.userName || 'User'}`,
                message:
                  conversation.lastMessage.text.length > 50
                    ? `${conversation.lastMessage.text.substring(0, 50)}...`
                    : conversation.lastMessage.text,
                duration: 6000,
                action: {
                  onClick: () => {
                    handleStartChat(
                      conversation.userId,
                      conversation.userName,
                      conversation.userAvatar
                    );
                  },
                },
              });
            }
          }
        }
      }

      const newCheckTime = Date.now();
      setLastCheckTime(newCheckTime);
      lastCheckTimeRef.current = newCheckTime;

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('chat-last-check-time', newCheckTime.toString());
      }
    } catch (error) {
      console.error('Error checking for new messages:', error);
    } finally {
      isPollingRef.current = false;
    }
  }, [user?.id, addNotification, chatWindowOpen, chatPopupOpen, handleStartChat]);

  useEffect(() => {
    if (!user?.id) return;

    // Check immediately
    checkForNewMessages();

    // Poll every 5 seconds for notifications
    pollingRef.current = setInterval(checkForNewMessages, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [user?.id, checkForNewMessages]);

  // Update lastCheckTime when chat window or popup opens to avoid notifications for old messages
  useEffect(() => {
    if (chatWindowOpen || chatPopupOpen) {
      const newCheckTime = Date.now();
      setLastCheckTime(newCheckTime);
      lastCheckTimeRef.current = newCheckTime;

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('chat-last-check-time', newCheckTime.toString());
      }
    }
  }, [chatWindowOpen, chatPopupOpen]);

  return {
    conversations,
    checkForNewMessages,
    isPolling: isPollingRef.current,
  };
}
