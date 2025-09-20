'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatContextType {
  chatWindowOpen: boolean;
  setChatWindowOpen: (open: boolean) => void;
  peerId: string;
  setPeerId: (id: string) => void;
  peerName: string;
  setPeerName: (name: string) => void;
  peerAvatar: string;
  setPeerAvatar: (avatar: string) => void;
  handleStartChat: (userId: string, userName: string, userAvatar?: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatWindowOpen, setChatWindowOpen] = useState(false);
  const [peerId, setPeerId] = useState('');
  const [peerName, setPeerName] = useState('');
  const [peerAvatar, setPeerAvatar] = useState('');

  const handleStartChat = (userId: string, userName: string, userAvatar?: string) => {
    setPeerId(userId);
    setPeerName(userName);
    setPeerAvatar(userAvatar || '');
    setChatWindowOpen(true);
  };

  return (
    <ChatContext.Provider
      value={{
        chatWindowOpen,
        setChatWindowOpen,
        peerId,
        setPeerId,
        peerName,
        setPeerName,
        peerAvatar,
        setPeerAvatar,
        handleStartChat,
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

