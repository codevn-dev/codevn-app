import { useState } from 'react';
import { useWebSocket } from '@/components/features/chat/websocket-context';

export function useHideConversation() {
  const [isHiding, setIsHiding] = useState(false);
  const { fetchConversations } = useWebSocket();

  const hideConversation = async (conversationId: string) => {
    try {
      setIsHiding(true);
      
      const response = await fetch('/api/chat/hide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId }),
      });

      if (!response.ok) {
        throw new Error('Failed to hide conversation');
      }

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
