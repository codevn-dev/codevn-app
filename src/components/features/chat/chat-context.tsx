'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatContextType {
  chatWindowOpen: boolean;
  setChatWindowOpen: (open: boolean) => void;
  chatPopupOpen: boolean;
  setChatPopupOpen: (open: boolean) => void;
  chatSidebarOpen: boolean;
  setChatSidebarOpen: (open: boolean) => void;
  peerId: string;
  setPeerId: (id: string) => void;
  peerName: string;
  setPeerName: (name: string) => void;
  peerAvatar: string;
  setPeerAvatar: (avatar: string) => void;
  handleStartChat: (userId: string, userName: string, userAvatar?: string) => void;
  handleCloseChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatWindowOpen, setChatWindowOpen] = useState(false);
  const [chatPopupOpen, setChatPopupOpen] = useState(false);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [peerId, setPeerId] = useState('');
  const [peerName, setPeerName] = useState('');
  const [peerAvatar, setPeerAvatar] = useState('');

  const handleStartChat = (userId: string, userName: string, userAvatar?: string) => {
    setPeerId(userId);
    setPeerName(userName);
    setPeerAvatar(userAvatar || '');
    setChatWindowOpen(true);
  };

  const handleCloseChat = () => {
    setChatWindowOpen(false);
    setPeerId('');
    setPeerName('');
    setPeerAvatar('');
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
        peerId,
        setPeerId,
        peerName,
        setPeerName,
        peerAvatar,
        setPeerAvatar,
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
