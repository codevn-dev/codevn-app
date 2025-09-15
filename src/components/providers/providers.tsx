'use client';

import { SessionProvider } from 'next-auth/react';
import { Navigation } from '@/features/navigation';
import { Notification } from '@/components/ui/notification';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider
      refetchInterval={0} // Disable automatic refetching
      refetchOnWindowFocus={false} // Disable refetch on window focus
      refetchWhenOffline={false} // Disable refetch when offline
    >
      <Navigation />
      <main className="min-h-screen bg-gray-50">{children}</main>
      <Notification />
    </SessionProvider>
  );
}
