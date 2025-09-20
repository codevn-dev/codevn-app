import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  enabled: boolean;
  interval: number;
  onPoll: () => Promise<void> | void;
  dependencies?: any[];
}

export function usePolling({ enabled, interval, onPoll, dependencies = [] }: UsePollingOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);

  const startPolling = useCallback(() => {
    if (!enabled || !isActiveRef.current) return;

    const poll = async () => {
      if (!isActiveRef.current) return;
      
      try {
        await onPoll();
      } catch (error) {
        if (isActiveRef.current) {
          console.error('Polling error:', error);
        }
      }
    };

    // Initial poll
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, interval);
  }, [enabled, interval, onPoll]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    isActiveRef.current = true;
    
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      isActiveRef.current = false;
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling, ...dependencies]);

  return {
    startPolling,
    stopPolling,
    isActive: isActiveRef.current,
  };
}
