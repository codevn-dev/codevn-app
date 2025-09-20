'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to ensure component only renders on client side
 * Useful for avoiding hydration mismatches with time-sensitive content
 */
export function useClientOnly() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
