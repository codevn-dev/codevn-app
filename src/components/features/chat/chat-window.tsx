'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Smile, Send } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { useWebSocket } from './websocket-context';
import { formatChatTime, isNewDay, formatDate } from '@/lib/utils';
import { chatConfig } from '@/config';

import { UiMessage } from '@/types/shared';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface ChatWindowProps {
  peerId: string;
  peerName: string;
  peerAvatar?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatWindow({ peerId, peerName, peerAvatar, isOpen, onClose }: ChatWindowProps) {
  const { user } = useAuthState();
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestMessageTime, setOldestMessageTime] = useState<number>(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiPopoverRef = useRef<HTMLDivElement | null>(null);

  const userId = user?.id || '';
  const canChat = Boolean(userId && peerId && userId !== peerId);

  // Track last message to detect new messages
  const [lastMessageId, setLastMessageId] = useState<string>('');

  // Use WebSocket for real-time chat
  const {
    isUserOnline,
    sendMessage: sendWebSocketMessage,
    sendTyping,
    markAsSeen: markAsSeenWebSocket,
    loadMessages,
    loadMoreMessages: _loadMoreMessages,
    addOnNewMessageCallback,
    addOnTypingCallback,
    addOnMessagesSeenCallback,
    markConversationAsRead,
  } = useWebSocket();

  // Local state for messages
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const canSend = !!(canChat && !loading && text.trim().length > 0);

  // Load messages when chat window opens
  useEffect(() => {
    if (!isOpen || !canChat || !peerId) return;

    const loadInitialMessages = async () => {
      setLoading(true);
      try {
        const result = await loadMessages(peerId, 20);
        if (result.messages) {
          const transformedMessages = transformMessages(result.messages);
          setMessages(transformedMessages);
          setHasMoreMessages(result.hasMore || false);
          // Mark conversation as read when opening chat
          markConversationAsRead(peerId);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialMessages();
  }, [isOpen, canChat, peerId, loadMessages, markConversationAsRead]);

  // Mark messages as seen when chat window is open
  useEffect(() => {
    if (!isOpen || !canChat || !peerId) return;

    const chatId = [user?.id, peerId].sort().join('|');

    // Mark as seen immediately when chat opens
    markAsSeenWebSocket(chatId);

    // Mark as seen every 5 seconds while chat is open
    const interval = setInterval(() => {
      markAsSeenWebSocket(chatId);
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, canChat, peerId, user?.id, markAsSeenWebSocket]);

  // Register WebSocket callbacks
  useEffect(() => {
    const removeOnNewMessage = addOnNewMessageCallback((message: UiMessage) => {
      // Only handle messages for current peer
      if (message.from === peerId || message.from === user?.id) {
        setMessages((prev) => {
          // Check if message already exists
          const exists = prev.some((msg) => msg.id === message.id);
          if (exists) return prev;

          // Add new message
          const newMessages = [...prev, message].sort((a, b) => a.timestamp - b.timestamp);
          return newMessages;
        });
      }
    });

    const removeOnTyping = addOnTypingCallback((fromUserId: string, isTyping: boolean) => {
      if (fromUserId === peerId) {
        setIsTyping(isTyping);
      }
    });

    const removeOnMessagesSeen = addOnMessagesSeenCallback((chatId: string, seenBy: string) => {
      if (seenBy === peerId) {
        // Mark messages as seen by peer
        setMessages((prev) =>
          prev.map((msg) => (msg.from === user?.id ? { ...msg, seen: true } : msg))
        );
      }
    });

    return () => {
      removeOnNewMessage();
      removeOnTyping();
      removeOnMessagesSeen();
    };
  }, [peerId, user?.id, addOnNewMessageCallback, addOnTypingCallback, addOnMessagesSeenCallback]);

  // Helper function to transform API messages to UI messages
  const transformMessages = (apiMessages: any[]): UiMessage[] => {
    return apiMessages
      .map((msg: any) => {
        const createdAt = msg.createdAt || msg.timestamp || msg.updatedAt;
        const timestamp = createdAt ? new Date(createdAt).getTime() : Date.now();
        return {
          id: `${msg.id || msg.timestamp || `${msg.senderId || msg.fromUserId}-${timestamp}`}-${timestamp}`,
          type: msg.type || 'message',
          from: msg.fromUser?.id || msg.fromUserId || msg.senderId || msg.from,
          text: msg.text || msg.content || '',
          timestamp,
          seen: msg.seen || false,
          seenAt: msg.seenAt,
        } as UiMessage;
      })
      .sort((a: UiMessage, b: UiMessage) => a.timestamp - b.timestamp);
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

  // Load more messages
  const handleLoadMoreMessages = async () => {
    if (loadingMore || !hasMoreMessages) return;

    setLoadingMore(true);
    setIsLoadingMore(true);

    const currentScrollHeight = listRef.current?.scrollHeight || 0;

    try {
      const response = await fetch(
        `/api/chat?peerId=${encodeURIComponent(peerId)}&action=get&limit=${chatConfig.maxMessagesPerPage}&before=${oldestMessageTime}`
      );
      if (response.ok) {
        const data = await response.json();
        const olderMessages = transformMessages(data.messages);

        if (olderMessages.length > 0) {
          setMessages((prev) => [...olderMessages, ...prev]);
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
      // Send typing indicator via WebSocket
      sendTyping(peerId, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      // Send stop typing indicator via WebSocket
      sendTyping(peerId, false);
    }, chatConfig.typingTimeout);
  };

  // Auto-scroll to bottom when new messages arrive (but not when loading more)
  useEffect(() => {
    if (!listRef.current || isLoadingMore || messages.length === 0) return;

    // Check if there's a new message (different last message ID)
    const currentLastMessage = messages[messages.length - 1];
    if (currentLastMessage && currentLastMessage.id !== lastMessageId) {
      // New message detected, scroll to bottom
      scrollToBottom();
      setLastMessageId(currentLastMessage.id);
    }
  }, [messages, isLoadingMore, lastMessageId]);

  // Force scroll to bottom on initial load only
  useLayoutEffect(() => {
    if (!listRef.current || messages.length === 0) return;

    if (isInitialLoad && !loading && messages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
        setIsInitialLoad(false);
        // Set the last message ID for tracking
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
          setLastMessageId(lastMessage.id);
        }
      }, 0);
    }
  }, [messages, isInitialLoad, loading]);

  // Auto focus input when chat window opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 500);
    }
  }, [isOpen]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!showEmoji) return;
      const target = e.target as Node;
      if (
        emojiPopoverRef.current &&
        !emojiPopoverRef.current.contains(target) &&
        target !== inputRef.current
      ) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [showEmoji]);

  const insertAtCursor = (emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const newValue = input.value.slice(0, start) + emoji + input.value.slice(end);
    setText(newValue);
    const caret = start + emoji.length;
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(caret, caret);
    });
  };

  // Send message
  const send = async () => {
    const msg = text.trim();
    if (!msg || !canChat) return;

    try {
      // Send via WebSocket
      sendWebSocketMessage(peerId, msg);
      setText('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="pointer-events-auto fixed right-4 bottom-4 z-[110] flex h-[28.8rem] w-[calc(100vw-2rem)] max-w-[24rem] flex-col rounded-lg bg-white shadow-lg lg:right-80 lg:bottom-0 lg:w-[24rem]"
      data-chat-window="true"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between rounded-t-lg bg-gray-600 p-4 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={peerAvatar || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-[#B8956A] to-[#A6825A] text-xs text-white">
              {peerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium">{peerName}</div>
            <div className="flex items-center gap-1">
              <div
                className={`h-2 w-2 rounded-full ${isUserOnline(peerId) ? 'bg-green-400' : 'bg-gray-400'}`}
              />
              <span className="text-xs text-gray-300">
                {isUserOnline(peerId) ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="h-6 w-6 p-0 text-white hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && messages.length === 0 ? (
          <div className="py-4 text-center text-sm text-gray-500">Loading messages...</div>
        ) : (
          <>
            {/* Load More Button */}
            {hasMoreMessages && (
              <div className="py-2 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadMoreMessages();
                  }}
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
                    <div className="my-4 flex justify-center">
                      <div className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                        {formatDate(m.timestamp)}
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  <div className={`flex ${m.from === userId ? 'justify-end' : 'justify-start'}`}>
                    {m.type === 'system' ? (
                      <div className="w-full text-center text-xs text-gray-500">{m.text}</div>
                    ) : (
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-3 ${
                          m.from === userId ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="text-sm">{m.text}</div>
                        <div
                          className={`mt-1 flex items-center gap-1 text-xs ${
                            m.from === userId ? 'text-gray-300' : 'text-gray-500'
                          }`}
                        >
                          <span>{formatChatTime(m.timestamp)}</span>
                          {m.from === userId && (
                            <div className="flex items-center">
                              {m.seen ? (
                                <div className="flex items-center text-gray-400">
                                  <span className="text-xs">✓</span>
                                  <span className="-ml-1 text-xs">✓</span>
                                </div>
                              ) : (
                                <div className="flex items-center text-gray-400">
                                  <span className="text-xs">✓</span>
                                </div>
                              )}
                            </div>
                          )}
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
      <div
        className="border-t border-gray-200 bg-gray-50 p-4"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }}
      >
        <div className="relative flex items-center gap-3">
          <button
            type="button"
            aria-label="Emoji"
            className={`flex h-10 w-10 items-center justify-center text-gray-500 transition-colors hover:text-gray-700 ${
              showEmoji ? 'text-gray-700' : ''
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setShowEmoji((v) => !v);
            }}
          >
            <Smile className="h-6 w-6" />
          </button>
          <Input
            ref={inputRef}
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
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.focus();
              setShowEmoji(false);
            }}
            placeholder="Type a message..."
            disabled={!canChat || loading}
            className="flex-1"
          />
          {showEmoji && (
            <div
              ref={emojiPopoverRef}
              className="absolute bottom-12 left-0 z-[120] rounded-lg border border-gray-200 bg-white shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <Picker
                data={data}
                onEmojiSelect={(emoji: any) => {
                  insertAtCursor(emoji.native || emoji.shortcodes || '');
                }}
                theme="light"
                previewPosition="none"
              />
            </div>
          )}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              send();
            }}
            disabled={!canSend}
            size="sm"
            variant="ghost"
            className={`flex h-11 w-11 items-center justify-center p-0 transition-colors ${
              canSend ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-800' : 'text-gray-300'
            }`}
            aria-label="Send message"
            title="Send"
          >
            <Send className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
