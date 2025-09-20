import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  enabled: boolean;
  interval: number;
  onPoll: () => Promise<void> | void;
  dependencies?: any[];
  maxConcurrent?: number;
}

// Global counter to track concurrent polling operations
let activePollingCount = 0;
const maxGlobalPolling = 10; // Maximum concurrent polling operations globally

// Track connection errors to implement backoff
let connectionErrorCount = 0;
let lastErrorTime = 0;
const maxErrors = 5;
const errorResetTime = 60000; // Reset error count after 1 minute

export function usePolling({ enabled, interval, onPoll }: UsePollingOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);
  const isPollingRef = useRef(false);

  const startPolling = useCallback(() => {
    if (!enabled || !isActiveRef.current) return;

    const poll = async () => {
      if (!isActiveRef.current || isPollingRef.current) return;

      // Check global polling limit
      if (activePollingCount >= maxGlobalPolling) {
        console.warn('Max global polling limit reached, skipping poll');
        return;
      }

      // Check for too many connection errors
      const now = Date.now();
      if (now - lastErrorTime > errorResetTime) {
        connectionErrorCount = 0;
      }

      if (connectionErrorCount >= maxErrors) {
        console.warn('Too many connection errors, skipping poll');
        return;
      }

      isPollingRef.current = true;
      activePollingCount++;

      try {
        await onPoll();
        // Reset error count on successful poll
        connectionErrorCount = Math.max(0, connectionErrorCount - 1);
      } catch (error) {
        if (isActiveRef.current) {
          console.error('Polling error:', error);

          // Track connection errors
          if (
            error instanceof Error &&
            (error.message.includes('too many clients') ||
              error.message.includes('connection') ||
              error.message.includes('timeout'))
          ) {
            connectionErrorCount++;
            lastErrorTime = now;
          }
        }
      } finally {
        isPollingRef.current = false;
        activePollingCount = Math.max(0, activePollingCount - 1);
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
      // Cleanup polling state
      if (isPollingRef.current) {
        isPollingRef.current = false;
        activePollingCount = Math.max(0, activePollingCount - 1);
      }
    };
  }, [enabled, startPolling, stopPolling]);

  return {
    startPolling,
    stopPolling,
    isActive: isActiveRef.current,
  };
}
