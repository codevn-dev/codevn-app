'use client';

import { useChatPolling } from '@/hooks/use-chat-polling';

export function ChatNotificationListener() {
  // Use the centralized polling hook
  useChatPolling();

  return null; // This component doesn't render anything
}
