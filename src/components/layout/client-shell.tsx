'use client';

import dynamic from 'next/dynamic';

interface ClientShellProps {
  children: React.ReactNode;
}

const DynamicPageTransition = dynamic(() => import('./index').then((m) => m.PageTransition), {
  ssr: false,
});

const DynamicBackToTop = dynamic(() => import('./index').then((m) => m.BackToTop), { ssr: false });

const DynamicAuthRedirectHandler = dynamic(
  () => import('./index').then((m) => m.AuthRedirectHandler),
  { ssr: false }
);

const DynamicCustomCursor = dynamic(() => import('./custom-cursor').then((m) => m.CustomCursor), {
  ssr: false,
});

export function ClientShell({ children }: ClientShellProps) {
  return (
    <>
      <DynamicAuthRedirectHandler />
      <DynamicCustomCursor />
      <DynamicPageTransition>{children}</DynamicPageTransition>
      <DynamicBackToTop />
    </>
  );
}

export default ClientShell;
