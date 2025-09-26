'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useFastifyAuthStore } from '@/stores';
import { RoleLevel } from '@/types/shared';

interface PreviewGuardProps {
  children: React.ReactNode;
  isPreview: boolean;
  articleAuthorId: string;
}

export function PreviewGuard({ children, isPreview, articleAuthorId }: PreviewGuardProps) {
  const { user, isLoading } = useFastifyAuthStore();
  const isAuthenticated = !!user;
  const router = useRouter();
  const [hasWaited, setHasWaited] = useState(false);

  // Wait for AuthProvider to complete authentication
  useEffect(() => {
    if (isPreview && !isLoading && !hasWaited) {
      // If not loading and no user, wait a bit more
      if (!user) {
        const timer = setTimeout(() => {
          setHasWaited(true);
        }, 500); // Wait 500ms for auth to complete
        return () => clearTimeout(timer);
      } else {
        setHasWaited(true);
      }
    }
  }, [isPreview, isLoading, user, hasWaited]);

  useEffect(() => {
    // Only redirect after loading is complete and we've waited
    if (isLoading || !hasWaited) return;

    if (isPreview && !isAuthenticated) {
      // Redirect to login if trying to preview without being logged in
      router.push('/?login=true');
      return;
    }

    if (isPreview && isAuthenticated && user?.id) {
      const isAuthor = user.id === articleAuthorId;
      const isAdmin = user.role === RoleLevel.admin;

      if (!isAuthor && !isAdmin) {
        // Redirect to home if not author or admin
        router.push('/');
        return;
      }
    }
  }, [isPreview, isAuthenticated, isLoading, user, articleAuthorId, router, hasWaited]);

  // Show loading while checking authentication
  if (isPreview && isLoading) {
    return <LoadingScreen />;
  }

  // If not preview mode, show content normally
  if (!isPreview) {
    return <>{children}</>;
  }

  // If preview mode and authenticated with proper access, show content
  if (isPreview && isAuthenticated && user?.id) {
    const isAuthor = user.id === articleAuthorId;
    const isAdmin = user.role === RoleLevel.admin;

    if (isAuthor || isAdmin) {
      return <>{children}</>;
    }
  }

  // If preview mode but not authenticated or no access, show loading (will redirect)
  return <LoadingScreen message="Redirecting..." />;
}
