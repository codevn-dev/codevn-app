import { useEffect, useRef } from 'react';

export function useAbortController() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const createAbortController = () => {
    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new controller
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current;
  };

  const abort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      abort();
    };
  }, []);

  return {
    createAbortController,
    abort,
    signal: abortControllerRef.current?.signal,
  };
}
