'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useUIStore } from '@/stores/ui-store';
import { useChatMessages } from '@/hooks/use-chat-messages';
import { useChat } from './chat-context';

interface ChatPopupProps {
  peerId: string;
  peerName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UiMessage {
  id: string;
  type: 'message' | 'system';
  from: string;
  text: string;
  timestamp: number;
  seen: boolean;
  seenAt?: string | null;
}

export function ChatPopup({ peerId, peerName, open, onOpenChange }: ChatPopupProps) {
  const { user } = useAuth();
  const { addNotification } = useUIStore();
  const { setChatPopupOpen } = useChat();
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  const userId = user?.id || '';
  const canChat = Boolean(userId && peerId && userId !== peerId);

  // Track last message to detect new messages
  const [lastMessageId, setLastMessageId] = useState<string>('');

  // Sync popup state with context
  useEffect(() => {
    setChatPopupOpen(open);
  }, [open, setChatPopupOpen]);

  // Use the centralized chat messages hook
  const { messages, loading, setMessages, lastMessageTime, setLastMessageTime } = useChatMessages({
    peerId,
    isActive: open,
    onNewMessage: () => {
      // No notification here - handled by useChatPolling
    }
  });

  // Mark messages as seen when popup is open
  useEffect(() => {
    if (!open || !canChat || !peerId) return;

    const markAsSeen = async () => {
      try {
        const chatId = [user?.id, peerId].sort().join('|');
        await fetch('/api/chat/seen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ chatId }),
        });
      } catch (error) {
        console.error('Error marking messages as seen:', error);
      }
    };

    // Mark as seen immediately when popup opens
    markAsSeen();

    // Mark as seen every 5 seconds while popup is open
    const interval = setInterval(markAsSeen, 5000);

    return () => clearInterval(interval);
  }, [open, canChat, peerId, user?.id]);



  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!listRef.current || messages.length === 0) return;
    
    // Check if there's a new message (different last message ID)
    const currentLastMessage = messages[messages.length - 1];
    if (currentLastMessage && currentLastMessage.id !== lastMessageId) {
      // New message detected, scroll to bottom
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      }, 0);
      setLastMessageId(currentLastMessage.id);
    }
  }, [messages, lastMessageId]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || !canChat) return;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          peerId,
          text: msg,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newMessage: UiMessage = {
          id: data.message.id || `${data.message.timestamp}-${Date.now()}`,
          type: data.message.type,
          from: data.message.fromUserId || data.message.from,
          text: data.message.text,
          timestamp: new Date(data.message.timestamp).getTime(),
          seen: data.message.seen || false,
          seenAt: data.message.seenAt,
        };
        
        setLastMessageTime(newMessage.timestamp);
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
        setText('');
      } else {
        console.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 w-[360px] max-w-[90vw]">
        <DialogTitle className="sr-only">Chat with {peerName || 'User'}</DialogTitle>
        <div className="flex flex-col h-[420px]">
          <div className="border-b px-4 py-3 text-sm font-semibold">
            {peerName || 'Chat'}
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto space-y-2 px-4 py-3">
            {loading && messages.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-4">
                Đang tải tin nhắn...
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`text-sm ${m.type === 'system' ? 'text-muted-foreground text-center' : ''}`}>
                  {m.type === 'system' ? (
                    <span>{m.text}</span>
                  ) : (
                    <div className={`max-w-[80%] px-3 py-2 rounded-md ${m.from === userId ? 'bg-primary text-primary-foreground ml-auto' : 'bg-accent text-accent-foreground mr-auto'}`}>
                      <div>{m.text}</div>
                      {m.from === userId && (
                        <div className="flex items-center justify-end mt-1">
                          <div className="flex items-center">
                            {m.seen ? (
                              <div className="flex items-center text-gray-400">
                                <span className="text-xs">✓</span>
                                <span className="text-xs -ml-1">✓</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-gray-400">
                                <span className="text-xs">✓</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="border-t p-3 flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={canChat ? 'Nhập tin nhắn…' : 'Không thể chat'}
              disabled={!canChat || loading}
            />
            <Button onClick={send} disabled={!canChat || !text.trim() || loading}>
              {loading ? '...' : 'Gửi'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}