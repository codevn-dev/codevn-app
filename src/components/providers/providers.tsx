'use client';

import { Navigation } from '@/features/navigation';
import { Notification } from '@/components/ui/notification';
import { FloatingChatButton, ChatProvider, WebSocketProvider } from '@/components/features/chat';
import { CommentWebSocketProvider } from '@/components/features/comments';
import { AuthProvider } from './auth-provider';
import { I18nProvider } from './index';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <I18nProvider>
      <AuthProvider>
        <ChatProvider>
          <WebSocketProvider>
            <CommentWebSocketProvider>
              <Navigation />
              <main className="min-h-screen bg-gray-100">{children}</main>
              <Notification />
              <FloatingChatButton />
            </CommentWebSocketProvider>
          </WebSocketProvider>
        </ChatProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
