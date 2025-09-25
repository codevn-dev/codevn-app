'use client';

import { useEffect } from 'react';

/**
 * Component to handle auth redirect cleanup
 * Clears the redirect flag when the page loads to prevent loops
 */
export function AuthRedirectHandler() {
  useEffect(() => {
    // Clear redirect flag when component mounts (page loads)
    sessionStorage.removeItem('auth-redirecting');
  }, []);

  return null; // This component doesn't render anything
}
