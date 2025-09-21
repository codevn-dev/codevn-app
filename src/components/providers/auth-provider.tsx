'use client';

import { useEffect } from 'react';
import { useAuthActions } from '@/hooks/use-auth-actions';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { checkAuth } = useAuthActions();

  useEffect(() => {
    // Only check auth once when the app loads
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
}
