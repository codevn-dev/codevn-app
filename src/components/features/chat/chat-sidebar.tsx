'use client';

import { useEffect, useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Search, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

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
  unreadCount?: number;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (userId: string, userName: string, userAvatar?: string) => void;
  chatWindowOpen?: boolean;
}

export function ChatSidebar({ isOpen, onClose, onStartChat, chatWindowOpen = false }: ChatSidebarProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchConversations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/chat/conversations');
      if (response.ok) {
        const data = await response.json();
        const conversationsWithUnread = (data.conversations || []).map((conv: any) => ({
          ...conv,
          unreadCount: 0, // Will be calculated based on seen status
        }));
        setConversations(conversationsWithUnread);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch conversations when sidebar opens
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, user]);

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
    const timeA = new Date(a.lastMessage.createdAt).getTime();
    const timeB = new Date(b.lastMessage.createdAt).getTime();
    return timeB - timeA; // Descending order (newest first)
  });

  const filteredConversations = sortedConversations.filter(conv =>
    conv.userName.toLowerCase().includes(searchTerm.toLowerCase())
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
          minute: '2-digit' 
        });
      } else if (diffInHours < 168) { // 7 days
        return date.toLocaleDateString('vi-VN', { weekday: 'short' });
      } else {
        return date.toLocaleDateString('vi-VN', { 
          day: '2-digit', 
          month: '2-digit' 
        });
      }
    } catch {
      return 'Just now';
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 ${chatWindowOpen ? 'pointer-events-none' : 'bg-black/50'}`}
      onClick={chatWindowOpen ? undefined : onClose}
    >
      <div 
        className={`fixed right-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${chatWindowOpen ? 'pointer-events-auto' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Chat</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
              <MessageCircle className="h-12 w-12 text-gray-300 mb-2" />
              <div className="text-sm text-gray-500">
                {searchTerm ? 'No conversation found' : 'No conversation found'}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.userId}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => {
                    onStartChat(conversation.userId, conversation.userName, conversation.userAvatar);
                    onClose();
                  }}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.userAvatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white">
                        {conversation.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Unread indicator */}
                    {conversation.lastMessage && 
                     conversation.lastMessage.fromUserId !== user?.id && 
                     !conversation.lastMessage.seen && (
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm truncate">
                        {conversation.userName}
                      </div>
                      <div className="text-xs text-gray-500 ml-2">
                        {formatTime(conversation.lastMessage.createdAt)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
