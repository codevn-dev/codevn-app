'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';

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
}

export function ChatPopup({ peerId, peerName, open, onOpenChange }: ChatPopupProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const userId = user?.id || '';
  const canChat = Boolean(userId && peerId && userId !== peerId);

  // Fetch messages when popup opens
  useEffect(() => {
    if (!open || !canChat) return;
    
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/chat?peerId=${encodeURIComponent(peerId)}&action=get`);
        if (response.ok) {
          const data = await response.json();
          const uiMessages: UiMessage[] = data.messages
            .map((msg: any) => ({
              id: `${msg.timestamp}-${Math.random().toString(36).slice(2)}`,
              type: msg.type,
              from: msg.fromUserId || msg.from,
              text: msg.text,
              timestamp: new Date(msg.createdAt || msg.timestamp).getTime(),
            }))
            .sort((a: UiMessage, b: UiMessage) => a.timestamp - b.timestamp); // Sort by timestamp ascending (oldest first)
          setMessages(uiMessages);
          
          // Update last message time for polling
          if (uiMessages.length > 0) {
            setLastMessageTime(uiMessages[uiMessages.length - 1].timestamp);
          }
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [open, canChat, peerId]);

  // Poll for new messages every 2 seconds
  useEffect(() => {
    if (!open || !canChat) return;

    const pollForNewMessages = async () => {
      try {
        const response = await fetch(`/api/chat?peerId=${encodeURIComponent(peerId)}&action=get&since=${lastMessageTime}`);
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            const newMessages: UiMessage[] = data.messages
              .filter((msg: any) => new Date(msg.createdAt || msg.timestamp).getTime() > lastMessageTime)
              .map((msg: any) => ({
                id: `${msg.timestamp}-${Math.random().toString(36).slice(2)}`,
                type: msg.type,
                from: msg.fromUserId || msg.from,
                text: msg.text,
                timestamp: new Date(msg.createdAt || msg.timestamp).getTime(),
              }))
              .sort((a: UiMessage, b: UiMessage) => a.timestamp - b.timestamp);

            if (newMessages.length > 0) {
              setMessages(prev => {
                // Deduplicate messages by combining existing and new messages, removing duplicates by id
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
      } catch (error) {
        console.error('Error polling for messages:', error);
      }
    };

    // Start polling
    pollingRef.current = setInterval(pollForNewMessages, 2000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [open, canChat, peerId, lastMessageTime]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || !canChat) return;

    try {
      setLoading(true);
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
          id: `${data.message.timestamp}-${Math.random().toString(36).slice(2)}`,
          type: data.message.type,
          from: data.message.fromUserId || data.message.from,
          text: data.message.text,
          timestamp: new Date(data.message.timestamp).getTime(),
        };
        
        // Update lastMessageTime immediately to prevent polling from fetching this message again
        setLastMessageTime(newMessage.timestamp);
        setMessages(prev => [...prev, newMessage]);
        setText('');
      } else {
        console.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
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