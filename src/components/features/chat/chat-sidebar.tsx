'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Search, X } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';

interface Conversation {
  id: string;
  peer: {
    id: string;
    name: string;
    avatar?: string;
  };
  lastMessage: {
    text: string;
    createdAt: string;
    fromUserId: string;
    seen?: boolean;
  };
  unreadCount?: number;
}

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/chat/conversations');
      if (response.ok) {
        const data = await response.json();
        const conversationsWithUnread = (data.conversations || []).map((conv: any) => ({
          ...conv,
          unreadCount: 0, // Will be calculated based on seen status
          lastMessage: {
            text: conv.lastMessage || '',
            createdAt: conv.lastMessageAt || new Date().toISOString(),
            fromUserId: conv.lastMessageFromUserId || '',
            seen: conv.lastMessageSeen || false,
          },
        }));
        setConversations(conversationsWithUnread);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch conversations when sidebar opens
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, user, fetchConversations]);

  // Poll for conversation updates when sidebar is open
  useEffect(() => {
    if (!isOpen) return;

    const pollConversations = async () => {
      try {
        const response = await fetch('/api/chat/conversations');
        if (response.ok) {
          const data = await response.json();
          const conversationsWithUnread = (data.conversations || []).map((conv: any) => ({
            ...conv,
            unreadCount: 0, // Will be calculated based on seen status
            lastMessage: {
              text: conv.lastMessage || '',
              createdAt: conv.lastMessageAt || new Date().toISOString(),
              fromUserId: conv.lastMessageFromUserId || '',
              seen: conv.lastMessageSeen || false,
            },
          }));
          setConversations(conversationsWithUnread);
        }
      } catch (error) {
        console.error('Error polling conversations:', error);
      }
    };

    // Poll every 10 seconds when sidebar is open
    pollingRef.current = setInterval(pollConversations, 10000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isOpen]);

  // Sort conversations by last message time (newest first)
  const sortedConversations = conversations.sort((a, b) => {
    const timeA = new Date(a.lastMessage?.createdAt || 0).getTime();
    const timeB = new Date(b.lastMessage?.createdAt || 0).getTime();
    return timeB - timeA; // Descending order (newest first)
  });

  const filteredConversations = sortedConversations.filter((conv) =>
    conv.peer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Just now';
      }

      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 1) {
        return 'Just now';
      } else if (diffInHours < 24) {
        return date.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        });
      } else if (diffInHours < 168) {
        // 7 days
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      } else {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
    } catch {
      return 'Just now';
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
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Chat</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onCloseAll || onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="border-b p-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              placeholder="Find a conversation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">Loading...</div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageCircle className="mb-2 h-12 w-12 text-gray-300" />
              <div className="text-sm text-gray-500">
                {searchTerm ? 'No conversation found' : 'No conversation found'}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.peer.id}
                  className="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-gray-50"
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
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white">
                        {conversation.peer?.name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    {/* Unread indicator */}
                    {conversation.lastMessage &&
                      conversation.lastMessage.fromUserId !== user?.id &&
                      !conversation.lastMessage.seen && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-blue-500"></div>
                      )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="truncate text-sm font-medium">
                        {conversation.peer?.name || 'Unknown User'}
                      </div>
                      <div className="ml-2 text-xs text-gray-500">
                        {formatTime(
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
