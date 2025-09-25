'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Search, X } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { useI18n } from '@/components/providers';
import { useWebSocket } from './websocket-context';
import { formatRelativeTime, formatDate, formatTime } from '@/lib/utils/time-format';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (userId: string, userName: string, userAvatar?: string) => void;
  onCloseAll?: () => void; // New prop to close both sidebar and chat windows
  chatWindowOpen?: boolean; // Add prop to know if chat window is open
}

export function ChatSidebar({
  isOpen,
  onClose,
  onStartChat,
  onCloseAll,
  chatWindowOpen,
}: ChatSidebarProps) {
  const { user: _user } = useAuthState();
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useI18n();

  // Use WebSocket hook
  const {
    isConnected,
    conversations: wsConversations,
    onlineUsers,
    fetchConversations,
  } = useWebSocket();

  // Transform WebSocket conversations to UI format
  const conversations = wsConversations.map((conv: any) => ({
    id: conv.id,
    peer: conv.peer,
    lastMessage: {
      text: typeof conv.lastMessage === 'string' ? conv.lastMessage : conv.lastMessage?.text || '',
      createdAt: conv.lastMessage?.createdAt || conv.lastMessageAt || new Date().toISOString(),
      fromUserId: conv.lastMessage?.fromUserId || conv.lastMessageFromUserId || conv.peer?.id || '',
      seen: conv.lastMessage?.seen || conv.lastMessageSeen || false,
    },
    unreadCount: conv.unreadCount || 0,
  }));

  // Fetch conversations when sidebar opens
  useEffect(() => {
    if (isOpen && isConnected) {
      fetchConversations();
    }
  }, [isOpen, isConnected, fetchConversations]);

  // Sort conversations by last message time (newest first)
  const sortedConversations = conversations.sort((a, b) => {
    const timeA = new Date(a.lastMessage?.createdAt || 0).getTime();
    const timeB = new Date(b.lastMessage?.createdAt || 0).getTime();
    return timeB - timeA; // Descending order (newest first)
  });

  const filteredConversations = sortedConversations.filter((conv) =>
    conv.peer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDisplayTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return formatRelativeTime(Date.now());
      }

      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 1) return formatDate(timestamp);
      if (diffInHours < 24) return formatTime(timestamp);
      return formatDate(timestamp);
    } catch {
      return formatRelativeTime(Date.now());
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay - click outside to close sidebar, but only if chat window is not open */}
      {!chatWindowOpen && (
        <div
          className="fixed inset-0 z-[100]"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            // Only close sidebar if no chat window is active
            if (onCloseAll) {
              onCloseAll();
            } else {
              onClose();
            }
          }}
        />
      )}
      {/* Sidebar */}
      <div
        className="fixed top-0 right-0 z-[101] h-full w-80 transform bg-white shadow-xl transition-transform duration-300 ease-in-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-transparent p-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#B8956A]" />
            <h2 className="text-lg font-semibold">{t('chat.title')}</h2>
            <div className="flex items-center gap-1">
              <div
                className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`}
              />
              <span className="text-xs text-gray-500">
                {isConnected ? t('chat.online') : t('chat.offline')}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onCloseAll || onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="border-b border-transparent p-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              placeholder={t('chat.findConversation')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageCircle className="mb-2 h-12 w-12 text-gray-300" />
              <div className="text-sm text-gray-500">{t('chat.noConversation')}</div>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.peer.id}
                  className="hover:bg-brand/10 flex cursor-pointer items-center gap-3 p-3 transition-colors"
                  onClick={() => {
                    onStartChat(
                      conversation.peer.id,
                      conversation.peer.name,
                      conversation.peer.avatar
                    );
                    // Don't close sidebar when starting a chat - let the floating chat button handle it
                  }}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.peer?.avatar || undefined} />
                      <AvatarFallback className="from-brand to-brand-600 bg-gradient-to-br text-white">
                        {conversation.peer?.name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online/Offline indicator (always visible) */}
                    <div
                      className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white ${
                        onlineUsers.includes(conversation.peer.id) ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    ></div>
                    {/* New message indicator */}
                    {conversation.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#B8956A] text-xs font-bold text-white">
                        {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="truncate text-sm font-medium">
                        {conversation.peer?.name || 'Unknown User'}
                      </div>
                      <div className="ml-2 text-xs text-gray-500">
                        {formatDisplayTime(
                          conversation.lastMessage?.createdAt || new Date().toISOString()
                        )}
                      </div>
                    </div>
                    <div className="truncate text-sm text-gray-600">
                      {conversation.lastMessage?.text || 'No messages'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
