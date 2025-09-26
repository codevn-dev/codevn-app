import { useState } from 'react';
import { useWebSocket } from '@/components/features/chat/websocket-context';
import { apiPost } from '@/lib/utils/api-client';

export function useHideConversation() {
  const [isHiding, setIsHiding] = useState(false);
  const { fetchConversations } = useWebSocket();

  const hideConversation = async (conversationId: string) => {
    try {
      setIsHiding(true);

      await apiPost('/api/chat/hide', { conversationId });

      // Refresh conversations list to remove the hidden conversation
      await fetchConversations();

      return { success: true };
    } catch (error) {
      console.error('Error hiding conversation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      setIsHiding(false);
    }
  };

  return {
    hideConversation,
    isHiding,
  };
}
