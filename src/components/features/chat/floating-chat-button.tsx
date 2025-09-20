'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useChat } from './chat-context';
import { ChatSidebar, ChatWindow } from './index';

export function FloatingChatButton() {
  const { user } = useAuth();
  const { handleStartChat, chatWindowOpen, setChatWindowOpen, peerId, peerName, peerAvatar } = useChat();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [wasChatWindowOpen, setWasChatWindowOpen] = useState(false);
  const [closingViaFloatingButton, setClosingViaFloatingButton] = useState(false);

  // Simple handleStartChat - just start chat, don't touch sidebar
  const handleStartChatSimple = (userId: string, userName: string, userAvatar?: string) => {
    handleStartChat(userId, userName, userAvatar);
  };

  // Keep sidebar open when chat window is open
  useEffect(() => {
    if (chatWindowOpen && !isSidebarOpen) {
      setIsSidebarOpen(true);
    }
  }, [chatWindowOpen, isSidebarOpen]);

  // Track when chat window was open and auto-close sidebar when it closes via X button
  useEffect(() => {
    if (chatWindowOpen) {
      setWasChatWindowOpen(true);
      setClosingViaFloatingButton(false);
    } else if (wasChatWindowOpen && !chatWindowOpen && !closingViaFloatingButton) {
      // Chat window was closed via X button, auto-close sidebar
      setIsSidebarOpen(false);
      setWasChatWindowOpen(false);
    } else if (wasChatWindowOpen && !chatWindowOpen && closingViaFloatingButton) {
      // Chat window was closed via floating button, don't auto-close sidebar
      setWasChatWindowOpen(false);
      setClosingViaFloatingButton(false);
    }
  }, [chatWindowOpen, wasChatWindowOpen, closingViaFloatingButton]);

  if (!user) return null;

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => {
            if (chatWindowOpen) {
              // If chat window is open, close it but keep sidebar open
              setClosingViaFloatingButton(true);
              setChatWindowOpen(false);
            } else if (isSidebarOpen) {
              // If sidebar is open, close it
              setIsSidebarOpen(false);
            } else {
              // If both are closed, open sidebar
              setIsSidebarOpen(true);
            }
          }}
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 p-0"
          size="lg"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
      </div>

      {/* Chat Sidebar */}
      <ChatSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onStartChat={handleStartChatSimple}
        chatWindowOpen={chatWindowOpen}
      />

      {/* Chat Window */}
      <ChatWindow
        peerId={peerId}
        peerName={peerName}
        peerAvatar={peerAvatar}
        isOpen={chatWindowOpen}
        onClose={() => setChatWindowOpen(false)}
        onMinimize={() => setChatWindowOpen(false)}
      />
    </>
  );
}
