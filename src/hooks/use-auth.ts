'use client';

import { useSession } from 'next-auth/react';
import { useAuthStore } from '@/stores/auth-store';
import { useEffect, useRef, useState } from 'react';

export function useAuth() {
  const { data: session, status } = useSession();
  const { user, isAuthenticated, isLoading, setUser, setLoading, logout } = useAuthStore();
  const isInitializedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Set client flag on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return; // Only run on client side

    // Only sync once on mount or when session actually changes
    if (isInitializedRef.current && status === 'loading') {
      return;
    }

    isInitializedRef.current = true;

    if (status === 'loading') {
      setLoading(true);
      setIsReady(false);
    } else if (status === 'unauthenticated') {
      setLoading(false);
      setIsReady(true);
      logout();
    } else if (status === 'authenticated' && session?.user) {
      setLoading(false);
      setUser({
        id: session.user.id,
        name: session.user.name || '',
        email: session.user.email || '',
        role: (session.user.role as 'user' | 'admin') || 'user',
        avatar: session.user.avatar || '',
        createdAt: new Date().toISOString(),
      });
      setIsReady(true);
    }
  }, [session, status, setUser, setLoading, logout, isClient]);

  // Add a small delay to ensure state is fully settled
  useEffect(() => {
    if (!isClient) return; // Only run on client side

    if (status !== 'loading' && !isReady) {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [status, isReady, isClient]);

  return {
    user: isClient ? user : null,
    isAuthenticated: isClient ? isAuthenticated : false,
    isLoading: !isClient || isLoading || !isReady,
    session,
    status,
    refresh: () => {
      // Force refresh the session
      if (isClient) {
        window.location.reload();
      }
    },
  };
}
