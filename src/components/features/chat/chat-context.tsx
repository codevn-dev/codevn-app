'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatContextType {
  chatWindowOpen: boolean;
  setChatWindowOpen: (open: boolean) => void;
  chatPopupOpen: boolean;
  setChatPopupOpen: (open: boolean) => void;
  chatSidebarOpen: boolean;
  setChatSidebarOpen: (open: boolean) => void;
  peer: {
    id: string;
    name: string;
    avatar?: string;
  };
  setPeer: (peer: { id: string; name: string; avatar?: string }) => void;
  handleStartChat: (userId: string, userName: string, userAvatar?: string) => void;
  handleCloseChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatWindowOpen, setChatWindowOpen] = useState(false);
  const [chatPopupOpen, setChatPopupOpen] = useState(false);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [peer, setPeer] = useState({
    id: '',
    name: '',
    avatar: undefined as string | undefined,
  });

  const handleStartChat = (userId: string, userName: string, userAvatar?: string) => {
    setPeer({
      id: userId,
      name: userName,
      avatar: userAvatar,
    });
    setChatWindowOpen(true);
    // On tablet/desktop, ensure sidebar is open when starting a chat
    if (typeof window !== 'undefined') {
      const isNonMobile = window.innerWidth >= 768; // md and up: tablet/desktop
      if (isNonMobile) {
        setChatSidebarOpen(true);
      }
    }
  };

  const handleCloseChat = () => {
    setChatWindowOpen(false);
    setPeer({
      id: '',
      name: '',
      avatar: undefined,
    });
  };

  return (
    <ChatContext.Provider
      value={{
        chatWindowOpen,
        setChatWindowOpen,
        chatPopupOpen,
        setChatPopupOpen,
        chatSidebarOpen,
        setChatSidebarOpen,
        peer,
        setPeer,
        handleStartChat,
        handleCloseChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
