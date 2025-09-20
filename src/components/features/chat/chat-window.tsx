'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useAbortController } from '@/hooks/use-abort-controller';
import { formatChatTime, isNewDay, formatChatDate } from '@/lib/utils';
import { chatConfig } from '@/config';

interface UiMessage {
  id: string;
  type: 'message' | 'system';
  from: string;
  text: string;
  timestamp: number;
}

interface ChatWindowProps {
  peerId: string;
  peerName: string;
  peerAvatar?: string;
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
}

export function ChatWindow({ 
  peerId, 
  peerName, 
  peerAvatar, 
  isOpen, 
  onClose,
  onMinimize
}: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const [isTyping, setIsTyping] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestMessageTime, setOldestMessageTime] = useState<number>(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);
  const { createAbortController } = useAbortController();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const userId = user?.id || '';
  const canChat = Boolean(userId && peerId && userId !== peerId);

  // Helper function to transform API messages to UI messages
  const transformMessages = (apiMessages: any[]): UiMessage[] => {
    return apiMessages
      .map((msg: any) => {
        const timestamp = new Date(msg.createdAt || msg.timestamp).getTime();
        return {
          id: `${msg.id || msg.timestamp}-${timestamp}`,
          type: msg.type || 'message',
          from: msg.fromUserId || msg.from,
          text: msg.text,
          timestamp,
        };
      })
      .sort((a: UiMessage, b: UiMessage) => a.timestamp - b.timestamp);
  };

  // Helper function to check if user is near bottom of chat
  const isNearBottom = (): boolean => {
    if (!listRef.current) return false;
    const { scrollHeight, scrollTop, clientHeight } = listRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  // Helper function to scroll to bottom
  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  // Helper function to restore scroll position after load more
  const restoreScrollPosition = (currentScrollHeight: number) => {
    setTimeout(() => {
      if (listRef.current) {
        const newScrollHeight = listRef.current.scrollHeight;
        const scrollDiff = newScrollHeight - currentScrollHeight;
        listRef.current.scrollTop = scrollDiff;
      }
      setIsLoadingMore(false);
    }, 0);
  };

  // Helper function to get adaptive polling interval
  const getPollingInterval = (hasNewMessages: boolean, pollCount: number): number => {
    if (hasNewMessages) return 1000;
    return Math.min(5000, 2000 + pollCount * 500);
  };

  // Helper function to get error polling interval
  const getErrorPollingInterval = (pollCount: number): number => {
    return Math.min(10000, 2000 * Math.pow(1.5, pollCount));
  };

  // Fetch messages when window opens
  useEffect(() => {
    if (!isOpen || !canChat) return;
    
    let isActive = true;
    setIsInitialLoad(true);
    
    // Reset state when peerId changes
    setMessages([]);
    setLastMessageTime(0);
    setOldestMessageTime(0);
    setHasMoreMessages(false);
    
    const fetchMessages = async () => {
      try {
        if (!isActive) return;
        setLoading(true);
        
        const response = await fetch(`/api/chat?peerId=${encodeURIComponent(peerId)}&action=get&limit=${chatConfig.maxMessagesPerPage}`);
        if (!isActive || !response.ok) return;
        
        const data = await response.json();
        if (!isActive) return;
        
        const uiMessages = transformMessages(data.messages);
        
        if (isActive) {
          setMessages(uiMessages);
          setHasMoreMessages(data.hasMore || false);
          
          if (uiMessages.length > 0) {
            setLastMessageTime(uiMessages[uiMessages.length - 1].timestamp);
            setOldestMessageTime(uiMessages[0].timestamp);
          }
        }
      } catch (error) {
        if (isActive) {
          console.error('Error fetching messages:', error);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchMessages();
    
    return () => {
      isActive = false;
    };
  }, [isOpen, canChat, peerId]);

  
  // Polling for new messages
  useEffect(() => {
    if (!isOpen || !canChat || lastMessageTime === 0) return;
    
    let pollInterval: NodeJS.Timeout;
    let pollCount = 0;
    let hasNewMessages = false;
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/chat?peerId=${encodeURIComponent(peerId)}&action=get&since=${lastMessageTime}`);
        if (response.ok) {
          const data = await response.json();
          if (data.messages?.length > 0) {
            const newMessages = transformMessages(data.messages)
              .filter((msg: UiMessage) => msg.timestamp > lastMessageTime);
            
            if (newMessages.length > 0) {
              hasNewMessages = true;
              setMessages(prev => {
                const allMessages = [...prev, ...newMessages];
                const uniqueMessages = allMessages.filter((msg, index, self) => 
                  index === self.findIndex(m => m.id === msg.id)
                );
                return uniqueMessages.sort((a, b) => a.timestamp - b.timestamp);
              });
              
              setLastMessageTime(newMessages[newMessages.length - 1].timestamp);
            }
          }
        }
        
        pollCount++;
        const nextInterval = getPollingInterval(hasNewMessages, pollCount);
        pollInterval = setTimeout(poll, nextInterval);
        hasNewMessages = false;
        
      } catch (error) {
        console.error('Polling error:', error);
        const errorInterval = getErrorPollingInterval(pollCount);
        pollInterval = setTimeout(poll, errorInterval);
      }
    };
    
    pollInterval = setTimeout(poll, chatConfig.pollingInterval);
    
    return () => {
      if (pollInterval) {
        clearTimeout(pollInterval);
      }
    };
  }, [isOpen, canChat, peerId, lastMessageTime]);

  // Load more messages
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMoreMessages) return;
    
    setLoadingMore(true);
    setIsLoadingMore(true);
    
    const currentScrollHeight = listRef.current?.scrollHeight || 0;
    
    try {
      const response = await fetch(`/api/chat?peerId=${encodeURIComponent(peerId)}&action=get&limit=${chatConfig.maxMessagesPerPage}&before=${oldestMessageTime}`);
      if (response.ok) {
        const data = await response.json();
        const olderMessages = transformMessages(data.messages);
        
        if (olderMessages.length > 0) {
          setMessages(prev => [...olderMessages, ...prev]);
          setOldestMessageTime(olderMessages[0].timestamp);
          setHasMoreMessages(data.hasMore || false);
          restoreScrollPosition(currentScrollHeight);
        } else {
          setIsLoadingMore(false);
        }
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
      setIsLoadingMore(false);
    } finally {
      setLoadingMore(false);
    }
  };


  // Handle typing indicators
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, chatConfig.typingTimeout);
  };

  // Auto-scroll to bottom when new messages arrive (but not when loading more)
  useEffect(() => {
    if (!listRef.current || isLoadingMore) return;
    
    if (isNearBottom()) {
      scrollToBottom();
    }
  }, [messages.length, isLoadingMore]);

  // Force scroll to bottom on initial load only
  useLayoutEffect(() => {
    if (!listRef.current || messages.length === 0) return;
    
    if (isInitialLoad && !loading && messages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
        setIsInitialLoad(false);
      }, 0);
    }
  }, [messages.length, isInitialLoad, loading]);

  // Send message
  const send = async () => {
    const msg = text.trim();
    if (!msg || !canChat) return;

    try {
      setLoading(true);
      
      const controller = createAbortController();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          peerId,
          text: msg,
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        const newMessage: UiMessage = {
          id: `${data.message.timestamp}-${Date.now()}`,
          type: data.message.type,
          from: data.message.fromUserId || data.message.from,
          text: data.message.text,
          timestamp: new Date(data.message.timestamp).getTime(),
        };
        
        setLastMessageTime(newMessage.timestamp);
        setMessages(prev => [...prev, newMessage]);
        setText('');
      } else {
        console.error('Failed to send message');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error sending message:', error);
      }
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-80 w-80 h-96 bg-white shadow-lg border border-gray-200 rounded-lg flex flex-col z-[60] pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={peerAvatar || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800 text-white text-xs">
              {peerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-sm">{peerName}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 text-white hover:bg-gray-700"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
        {loading && messages.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-4">
            Loading messages...
          </div>
        ) : (
          <>
            {/* Load More Button */}
            {hasMoreMessages && (
              <div className="text-center py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMoreMessages}
                  disabled={loadingMore}
                  className="text-xs"
                >
                  {loadingMore ? 'Loading...' : 'Load More Messages'}
                </Button>
              </div>
            )}
            
            {messages.map((m, index) => {
              const previousMessage = index > 0 ? messages[index - 1] : null;
              const showDateSeparator = isNewDay(m.timestamp, previousMessage?.timestamp);
              
              return (
                <div key={m.id}>
                  {/* Date separator */}
                  {showDateSeparator && (
                    <div className="flex justify-center my-4">
                      <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                        {formatChatDate(m.timestamp)}
                      </div>
                    </div>
                  )}
                  
                  {/* Message */}
                  <div className={`flex ${m.from === userId ? 'justify-end' : 'justify-start'}`}>
                    {m.type === 'system' ? (
                      <div className="text-center text-xs text-gray-500 w-full">
                        {m.text}
                      </div>
                    ) : (
                      <div className={`max-w-[70%] px-4 py-3 rounded-lg ${
                        m.from === userId 
                          ? 'bg-gray-900 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="text-sm">{m.text}</div>
                        <div className={`text-xs mt-1 ${
                          m.from === userId ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          {formatChatTime(m.timestamp)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message..."
            disabled={!canChat || loading}
            className="flex-1"
          />
          <Button 
            onClick={send} 
            disabled={!canChat || !text.trim() || loading}
            size="sm"
          >
            {loading ? '...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
