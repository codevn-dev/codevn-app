'use client';

import { Navigation } from '@/features/navigation';
import { Notification } from '@/components/ui/notification';
import { FloatingChatButton, ChatProvider, WebSocketProvider } from '@/components/features/chat';
import { CommentWebSocketProvider } from '@/components/features/comments';
import { AuthProvider } from './auth-provider';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <ChatProvider>
        <WebSocketProvider>
          <CommentWebSocketProvider>
            <Navigation />
            <main className="bg-gray-80 min-h-screen">{children}</main>
            <Notification />
            <FloatingChatButton />
          </CommentWebSocketProvider>
        </WebSocketProvider>
      </ChatProvider>
    </AuthProvider>
  );
}
