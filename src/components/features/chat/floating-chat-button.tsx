'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { useChat } from './chat-context';
import { useWebSocket } from './websocket-context';
import { ChatSidebar, ChatWindow } from './index';

export function FloatingChatButton() {
  const { user } = useAuthState();
  const {
    handleStartChat,
    handleCloseChat,
    chatWindowOpen,
    setChatWindowOpen,
    chatSidebarOpen,
    setChatSidebarOpen,
    peer,
  } = useChat();
  const { conversations } = useWebSocket();
  const [wasChatWindowOpen, setWasChatWindowOpen] = useState(false);
  const [closingViaFloatingButton, setClosingViaFloatingButton] = useState(false);

  // Check if there are any unread messages
  const hasUnreadMessages = conversations.some((conv) => (conv.unreadCount || 0) > 0);

  // Simple handleStartChat - just start chat, don't touch sidebar
  const handleStartChatSimple = (userId: string, userName: string, userAvatar?: string) => {
    handleStartChat(userId, userName, userAvatar);
  };

  // On mobile, close sidebar when opening chat window to avoid overlap
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (chatWindowOpen) {
      const isMobile = window.innerWidth < 768; // treat <md as mobile only
      if (isMobile && chatSidebarOpen) {
        setChatSidebarOpen(false);
      }
    }
  }, [chatWindowOpen, chatSidebarOpen, setChatSidebarOpen]);

  // Track when chat window was open - don't auto-close sidebar
  useEffect(() => {
    if (chatWindowOpen) {
      setWasChatWindowOpen(true);
      setClosingViaFloatingButton(false);
    } else if (wasChatWindowOpen && !chatWindowOpen) {
      // Chat window was closed, but keep sidebar open
      setWasChatWindowOpen(false);
      setClosingViaFloatingButton(false);
    }
  }, [chatWindowOpen, wasChatWindowOpen, closingViaFloatingButton]);

  if (!user) return null;

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed right-6 bottom-6 z-50">
        <div className="relative">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (chatWindowOpen) {
                // If chat window is open, close it but keep sidebar open
                setClosingViaFloatingButton(true);
                setChatWindowOpen(false);
              } else if (chatSidebarOpen) {
                // If sidebar is open, close it
                setChatSidebarOpen(false);
              } else {
                // If both are closed, open sidebar
                setChatSidebarOpen(true);
              }
            }}
            className="bg-brand hover:bg-brand-600 h-14 w-14 rounded-full p-0 shadow-lg transition-all duration-200 hover:shadow-xl"
            size="lg"
          >
            <MessageCircle className="h-6 w-6 text-white" />
          </Button>

          {/* Unread indicator */}
          {hasUnreadMessages && (
            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full border-2 border-white bg-[#B8956A]" />
          )}
        </div>
      </div>

      {/* Chat Sidebar */}
      <ChatSidebar
        isOpen={chatSidebarOpen}
        onClose={() => setChatSidebarOpen(false)}
        onCloseAll={() => {
          setChatSidebarOpen(false);
          handleCloseChat();
        }}
        onStartChat={handleStartChatSimple}
        chatWindowOpen={chatWindowOpen}
      />

      {/* Chat Window */}
      <ChatWindow peer={peer} isOpen={chatWindowOpen} onClose={handleCloseChat} />
    </>
  );
}
