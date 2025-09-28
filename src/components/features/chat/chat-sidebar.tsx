'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Search, X, Bot } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { useI18n } from '@/components/providers';
import { useWebSocket } from './websocket-context';
import { useHideConversation } from '@/hooks/use-hide-conversation';
import { formatRelativeTime, formatDate, formatTime } from '@/lib/utils/time-format';
import { apiGet } from '@/lib/utils/api-client';
import { SystemUserResponse } from '@/types/shared/auth';

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
  const { user } = useAuthState();
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredConversation, setHoveredConversation] = useState<string | null>(null);
  const [systemUsers, setSystemUsers] = useState<SystemUserResponse[]>([]);
  const [hiddenSystemUsers, setHiddenSystemUsers] = useState<Set<string>>(new Set());
  const [unreadSystemUsers, setUnreadSystemUsers] = useState<Set<string>>(new Set());
  const { t } = useI18n();

  // Use WebSocket hook
  const {
    isConnected,
    conversations: wsConversations,
    onlineUsers,
    fetchConversations,
    addOnNewMessageCallback,
  } = useWebSocket();

  // Use hide conversation hook
  const { hideConversation, isHiding } = useHideConversation();

  // Persist hidden system users to localStorage (per user)
  useEffect(() => {
    try {
      const storageKey = `chat:hiddenSystemUsers:${user?.id || 'guest'}`;
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        setHiddenSystemUsers(new Set(ids));
      }
    } catch {
      // ignore storage errors
    }
  }, [user?.id]);

  useEffect(() => {
    try {
      const storageKey = `chat:hiddenSystemUsers:${user?.id || 'guest'}`;
      const ids = Array.from(hiddenSystemUsers);
      window.localStorage.setItem(storageKey, JSON.stringify(ids));
    } catch {
      // ignore storage errors
    }
  }, [hiddenSystemUsers, user?.id]);

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

  // Fetch conversations and system users when sidebar opens
  useEffect(() => {
    if (isOpen && isConnected) {
      fetchConversations();
      fetchSystemUsers();
    }
  }, [isOpen, isConnected, fetchConversations]);

  // Fetch system users for chat (all users can view notifications)
  const fetchSystemUsers = async () => {
    try {
      const response = await apiGet<SystemUserResponse[]>('/api/system-users/chat');
      setSystemUsers(response);
    } catch (error) {
      console.error('Failed to fetch system users:', error);
    }
  };

  // Subscribe to new message events to flag unread for system users
  useEffect(() => {
    const unsubscribe = addOnNewMessageCallback((msg) => {
      // If message is from a system user and not currently hidden, mark unread
      const isFromSystemUser = systemUsers.some((su) => su.id === msg.from);

      if (!isFromSystemUser) {
        // Not in current list; attempt to refresh system users then proceed
        fetchSystemUsers();
      }

      // Auto-unhide if hidden and mark unread
      setHiddenSystemUsers((prevHidden) => {
        if (prevHidden.has(msg.from)) {
          const nextHidden = new Set(prevHidden);
          nextHidden.delete(msg.from);
          try {
            const storageKey = `chat:hiddenSystemUsers:${user?.id || 'guest'}`;
            const ids = Array.from(nextHidden);
            window.localStorage.setItem(storageKey, JSON.stringify(ids));
          } catch {}
          return nextHidden;
        }
        return prevHidden;
      });

      setUnreadSystemUsers((prev) => {
        const next = new Set(prev);
        next.add(msg.from);
        return next;
      });
    });

    return () => {
      unsubscribe?.();
    };
  }, [addOnNewMessageCallback, systemUsers, hiddenSystemUsers, user?.id]);

  // Toggle hide/show individual system user
  const toggleSystemUserVisibility = (userId: string) => {
    setHiddenSystemUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

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

  const handleHideConversation = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the conversation click

    if (isHiding) return;

    await hideConversation(conversationId);
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
          {/* System Users Section */}
          {systemUsers.filter((user) => !hiddenSystemUsers.has(user.id)).length > 0 && (
            <div className="border-b border-gray-100 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Bot className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-medium text-gray-700">{t('chat.systemUsers')}</h3>
              </div>
              <div className="space-y-1">
                {systemUsers
                  .filter(
                    (user) =>
                      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
                      !hiddenSystemUsers.has(user.id)
                  )
                  .map((systemUser) => (
                    <div
                      key={systemUser.id}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
                    >
                      <button
                        onClick={() => {
                          onStartChat(
                            systemUser.id,
                            systemUser.name,
                            systemUser.avatar || undefined
                          );
                          // Clear unread badge when opening chat with this system user
                          setUnreadSystemUsers((prev) => {
                            const next = new Set(prev);
                            next.delete(systemUser.id);
                            return next;
                          });
                        }}
                        className="flex flex-1 items-center gap-3 text-left"
                        title="View notifications from system user"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={systemUser.avatar || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-xs text-white">
                            {systemUser.name?.charAt(0).toUpperCase() || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900">
                            {systemUser.name}
                          </div>
                          <div className="text-xs text-blue-600">{t('common.role.system')}</div>
                        </div>
                        {/* Unread badge for system user notifications */}
                        {unreadSystemUsers.has(systemUser.id) && (
                          <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#B8956A] px-1.5 text-xs font-bold text-white">
                            1
                          </div>
                        )}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSystemUserVisibility(systemUser.id);
                        }}
                        title={t('chat.hideFromSidebar')}
                      >
                        <X className="h-4 w-4 text-red-500 hover:text-red-600" />
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Regular Conversations Section */}
          {filteredConversations.length === 0 &&
          systemUsers.filter((user) => !hiddenSystemUsers.has(user.id)).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageCircle className="mb-2 h-12 w-12 text-gray-300" />
              <div className="text-sm text-gray-500">{t('chat.noConversation')}</div>
            </div>
          ) : filteredConversations.length > 0 ? (
            <div className="space-y-1">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.peer.id}
                  className="hover:bg-brand/10 group flex cursor-pointer items-center gap-3 p-3 transition-colors"
                  onMouseEnter={() => setHoveredConversation(conversation.id)}
                  onMouseLeave={() => setHoveredConversation(null)}
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
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">
                          {formatDisplayTime(
                            conversation.lastMessage?.createdAt || new Date().toISOString()
                          )}
                        </div>
                        {/* Hide conversation button - only show on hover */}
                        {hoveredConversation === conversation.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50"
                            onClick={(e) => handleHideConversation(conversation.id, e)}
                            disabled={isHiding}
                            title="Hide conversation"
                          >
                            <X className="h-4 w-4 text-red-500 hover:text-red-600" />
                          </Button>
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
          ) : null}
        </div>
      </div>
    </>
  );
}
