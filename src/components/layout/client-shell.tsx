'use client';

import { Suspense, lazy, useEffect, useState } from 'react';
import { PageTransition } from './page-transition';
import { BackToTop } from './back-to-top';
import { AuthRedirectHandler } from './auth-redirect-handler';

interface ClientShellProps {
  children: React.ReactNode;
}

// Lazy load CustomCursor only for non-mobile devices
const LazyCustomCursor = lazy(() =>
  import('./custom-cursor').then((m) => ({ default: m.CustomCursor }))
);

// Component to conditionally render CustomCursor only on desktop
function DesktopCustomCursor() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Only load CustomCursor on desktop (non-touch devices)
    const checkDevice = () => {
      const isMobile = window.matchMedia('(pointer: coarse)').matches;
      const isLargeScreen = window.matchMedia('(min-width: 1024px)').matches;
      setIsDesktop(!isMobile && isLargeScreen);
    };

    checkDevice();
    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const screenQuery = window.matchMedia('(min-width: 1024px)');

    mediaQuery.addEventListener('change', checkDevice);
    screenQuery.addEventListener('change', checkDevice);

    return () => {
      mediaQuery.removeEventListener('change', checkDevice);
      screenQuery.removeEventListener('change', checkDevice);
    };
  }, []);

  if (!isDesktop) return null;

  return (
    <Suspense fallback={null}>
      <LazyCustomCursor />
    </Suspense>
  );
}

// ClientShell component chính
export function ClientShell({ children }: ClientShellProps) {
  return (
    <>
      <AuthRedirectHandler />
      <DesktopCustomCursor />
      <PageTransition>{children}</PageTransition>
      <BackToTop />
    </>
  );
}

// Export ClientShellWrapper để giữ tương thích với code hiện tại
export function ClientShellWrapper({ children }: ClientShellProps) {
  return <ClientShell>{children}</ClientShell>;
}

export default ClientShell;
