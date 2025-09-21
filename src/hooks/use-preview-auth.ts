'use client';

import { useEffect, useState } from 'react';
import { useFastifyAuthStore } from '@/stores';
import { apiGet } from '@/lib/utils';

/**
 * Hook specifically for preview authentication
 * Only checks auth when needed for preview mode
 */
export function usePreviewAuth(isPreview: boolean) {
  const { user, isLoading, setUser, setLoading } = useFastifyAuthStore();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    console.log('usePreviewAuth effect:', { isPreview, user: !!user, isChecking });

    if (!isPreview) return;

    // If user already exists, no need to check
    if (user) return;

    // If already checking, don't check again
    if (isChecking) return;

    console.log('Starting preview auth check...');

    const checkAuth = async () => {
      setIsChecking(true);
      setLoading(true);

      try {
        const data = await apiGet('/api/auth/me');
        console.log('Preview auth success:', data);
        setUser(data.user);
      } catch (error) {
        console.log('Preview auth check failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [isPreview, user, isChecking, setUser, setLoading]);

  return {
    user,
    isLoading: isLoading || isChecking,
    isAuthenticated: !!user,
  };
}
