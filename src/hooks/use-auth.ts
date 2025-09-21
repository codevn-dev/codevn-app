'use client';

import { useFastifyAuthStore } from '@/stores';
import { useEffect, useRef, useState } from 'react';

export function useAuth() {
  const { user, isAuthenticated, isLoading } = useFastifyAuthStore();
  const isInitializedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Set client flag on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return; // Only run on client side

    // Initialize ready state
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      setIsReady(true);
    }
  }, [isClient]);

  return {
    user: isClient ? user : null,
    isAuthenticated: isClient ? isAuthenticated : false,
    isLoading: !isClient || isLoading || !isReady,
    session: null, // No session with Fastify auth
    status: isAuthenticated ? 'authenticated' : 'unauthenticated',
    refresh: () => {
      // Force refresh by reloading page
      if (isClient) {
        window.location.reload();
      }
    },
  };
}
