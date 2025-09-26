'use client';

import { Navigation } from '@/features/navigation';
import { Notification } from '@/components/ui/notification';
import { FloatingChatButton, ChatProvider, WebSocketProvider } from '@/components/features/chat';
import { CommentWebSocketProvider } from '@/components/features/comments';
import { AuthProvider } from './auth-provider';
import { I18nProvider } from './i18n-provider';
import type { Locale } from '@/stores/i18n-store';

interface ProvidersProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function Providers({ children, initialLocale }: ProvidersProps) {
  return (
    <I18nProvider initialLocale={initialLocale}>
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
