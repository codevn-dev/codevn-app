'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuthActions } from '@/hooks/use-auth-actions';

interface PreviewGuardProps {
  children: React.ReactNode;
  isPreview: boolean;
  articleAuthorId: string;
}

export function PreviewGuard({ children, isPreview, articleAuthorId }: PreviewGuardProps) {
  const { user, loading } = useAuthActions();
  const isAuthenticated = !!user;
  const isLoading = loading;
  const router = useRouter();

  useEffect(() => {
    // Only redirect after loading is complete
    if (isLoading) return;

    if (isPreview && !isAuthenticated) {
      // Redirect to login if trying to preview without being logged in
      router.push('/?login=true');
      return;
    }

    if (isPreview && isAuthenticated && user?.id) {
      const isAuthor = user.id === articleAuthorId;
      const isAdmin = user.role === 'admin';

      if (!isAuthor && !isAdmin) {
        // Redirect to home if not author or admin
        router.push('/');
        return;
      }
    }
  }, [isPreview, isAuthenticated, isLoading, user, articleAuthorId, router]);

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
    const isAdmin = user.role === 'admin';

    if (isAuthor || isAdmin) {
      return <>{children}</>;
    }
  }

  // If preview mode but not authenticated or no access, show loading (will redirect)
  return <LoadingScreen message="Redirecting..." />;
}
