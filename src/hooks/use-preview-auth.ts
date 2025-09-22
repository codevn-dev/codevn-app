'use client';

import { useEffect, useState } from 'react';
import { useFastifyAuthStore } from '@/stores';
import { apiGet } from '@/lib/utils';
import { User } from '@/types/shared/auth';
import { UserResponse } from '@/types/shared';

/**
 * Hook specifically for preview authentication
 * Only checks auth when needed for preview mode
 */
export function usePreviewAuth(isPreview: boolean) {
  const { user, isLoading, setUser, setLoading } = useFastifyAuthStore();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!isPreview) return;

    // If user already exists, no need to check
    if (user) return;

    // If already checking, don't check again
    if (isChecking) return;

    const checkAuth = async () => {
      setIsChecking(true);
      setLoading(true);

      try {
        const data = await apiGet<UserResponse>('/api/auth/me');
        setUser(data.user);
      } catch {
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
