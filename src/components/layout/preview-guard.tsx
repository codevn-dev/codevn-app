'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface PreviewGuardProps {
  children: React.ReactNode;
  isPreview: boolean;
  articleAuthorId: string;
}

export function PreviewGuard({ children, isPreview, articleAuthorId }: PreviewGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isPreview && status === 'unauthenticated') {
      // Redirect to login if trying to preview without being logged in
      router.push('/?login=true');
      return;
    }

    if (isPreview && status === 'authenticated' && session?.user?.id) {
      const isAuthor = session.user.id === articleAuthorId;
      const isAdmin = session.user.role === 'admin';

      if (!isAuthor && !isAdmin) {
        // Redirect to home if not author or admin
        router.push('/');
        return;
      }
    }
  }, [isPreview, status, session, articleAuthorId, router]);

  // Show loading while checking authentication
  if (isPreview && status === 'loading') {
    return <LoadingScreen message="Checking access..." />;
  }

  // If not preview mode, show content normally
  if (!isPreview) {
    return <>{children}</>;
  }

  // If preview mode and authenticated with proper access, show content
  if (isPreview && status === 'authenticated' && session?.user?.id) {
    const isAuthor = session.user.id === articleAuthorId;
    const isAdmin = session.user.role === 'admin';

    if (isAuthor || isAdmin) {
      return <>{children}</>;
    }
  }

  // If preview mode but not authenticated or no access, show loading (will redirect)
  return <LoadingScreen message="Redirecting..." />;
}
