'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { useChat } from './chat-context';
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
    peerId,
    peerName,
    peerAvatar,
  } = useChat();
  const [wasChatWindowOpen, setWasChatWindowOpen] = useState(false);
  const [closingViaFloatingButton, setClosingViaFloatingButton] = useState(false);

  // Simple handleStartChat - just start chat, don't touch sidebar
  const handleStartChatSimple = (userId: string, userName: string, userAvatar?: string) => {
    handleStartChat(userId, userName, userAvatar);
  };

  // Keep sidebar open when chat window is open
  useEffect(() => {
    if (chatWindowOpen && !chatSidebarOpen) {
      setChatSidebarOpen(true);
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
          className="h-14 w-14 rounded-full bg-blue-600 p-0 shadow-lg transition-all duration-200 hover:bg-blue-700 hover:shadow-xl"
          size="lg"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
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
      <ChatWindow
        peerId={peerId}
        peerName={peerName}
        peerAvatar={peerAvatar}
        isOpen={chatWindowOpen}
        onClose={handleCloseChat}
      />
    </>
  );
}
