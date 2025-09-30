'use client';

import { Suspense, lazy } from 'react';
import { PageTransition } from './page-transition';
import { BackToTop } from './back-to-top';
import { AuthRedirectHandler } from './auth-redirect-handler';

interface ClientShellProps {
  children: React.ReactNode;
}

// Sử dụng lazy thay vì dynamic để tránh lỗi SSR
const LazyCustomCursor = lazy(() => import('./custom-cursor').then((m) => ({ default: m.CustomCursor })));

// ClientShell component chính
export function ClientShell({ children }: ClientShellProps) {
  return (
    <>
      <AuthRedirectHandler />
      <Suspense fallback={null}>
        <LazyCustomCursor />
      </Suspense>
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
