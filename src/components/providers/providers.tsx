'use client';

import { Navigation } from '@/features/navigation';
import { Notification } from '@/components/ui/notification';
import { FloatingChatButton, ChatProvider } from '@/components/features/chat';
import { ChatNotificationListener } from '@/components/features/chat/chat-notification-listener';
import { AuthProvider } from './auth-provider';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <ChatProvider>
        <Navigation />
        <main className="min-h-screen bg-gray-50">{children}</main>
        <Notification />
        <FloatingChatButton />
        <ChatNotificationListener />
      </ChatProvider>
    </AuthProvider>
  );
}
