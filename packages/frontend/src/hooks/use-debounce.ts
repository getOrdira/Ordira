// src/hooks/use-debounce.ts

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseDebounceOptions {
  delay?: number;
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

interface UseDebounceReturn<T> {
  debouncedValue: T;
  isDebouncing: boolean;
  cancel: () => void;
  flush: () => void;
}

export function useDebounce<T>(
  value: T,
  options: UseDebounceOptions = {}
): UseDebounceReturn<T> {
  const {
    delay = 500,
    leading = false,
    trailing = true,
    maxWait,
  } = options;

  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallTimeRef = useRef<number>(0);
  const lastInvokeTimeRef = useRef<number>(0);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
    setIsDebouncing(false);
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setDebouncedValue(value);
    setIsDebouncing(false);
    lastInvokeTimeRef.current = Date.now();
  }, [value]);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTimeRef.current;
    const timeSinceLastInvoke = now - lastInvokeTimeRef.current;

    // Clear existing timeouts
    cancel();

    // Leading edge
    if (leading && timeSinceLastCall >= delay) {
      setDebouncedValue(value);
      setIsDebouncing(false);
      lastInvokeTimeRef.current = now;
      return;
    }

    // Set debouncing state
    setIsDebouncing(true);
    lastCallTimeRef.current = now;

    // Max wait timeout
    if (maxWait && timeSinceLastInvoke >= maxWait) {
      flush();
      return;
    }

    // Regular debounce timeout
    timeoutRef.current = setTimeout(() => {
      if (trailing) {
        setDebouncedValue(value);
        setIsDebouncing(false);
        lastInvokeTimeRef.current = Date.now();
      }
    }, delay);

    // Max wait timeout
    if (maxWait) {
      maxTimeoutRef.current = setTimeout(() => {
        flush();
      }, maxWait);
    }

    return () => {
      cancel();
    };
  }, [value, delay, leading, trailing, maxWait, cancel, flush]);

  return {
    debouncedValue,
    isDebouncing,
    cancel,
    flush,
  };
}

// Hook for debouncing function calls
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500,
  options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {}
): T {
  const {
    leading = false,
    trailing = true,
    maxWait,
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallTimeRef = useRef<number>(0);
  const lastInvokeTimeRef = useRef<number>(0);
  const argsRef = useRef<Parameters<T>>();

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    argsRef.current = args;
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTimeRef.current;
    const timeSinceLastInvoke = now - lastInvokeTimeRef.current;

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }

    // Leading edge
    if (leading && timeSinceLastCall >= delay) {
      callback(...args);
      lastInvokeTimeRef.current = now;
      return;
    }

    lastCallTimeRef.current = now;

    // Max wait timeout
    if (maxWait && timeSinceLastInvoke >= maxWait) {
      callback(...args);
      lastInvokeTimeRef.current = now;
      return;
    }

    // Regular debounce timeout
    timeoutRef.current = setTimeout(() => {
      if (trailing && argsRef.current) {
        callback(...argsRef.current);
        lastInvokeTimeRef.current = Date.now();
      }
    }, delay);

    // Max wait timeout
    if (maxWait) {
      maxTimeoutRef.current = setTimeout(() => {
        if (argsRef.current) {
          callback(...argsRef.current);
          lastInvokeTimeRef.current = Date.now();
        }
      }, maxWait);
    }
  }, [callback, delay, leading, trailing, maxWait]) as T;

  return debouncedCallback;
}

// Hook for debouncing async operations
export function useDebouncedAsyncCallback<T extends (...args: any[]) => Promise<any>>(
  callback: T,
  delay: number = 500,
  options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {}
): {
  debouncedCallback: T;
  isLoading: boolean;
  error: Error | null;
  cancel: () => void;
} {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const debouncedCallback = useDebouncedCallback(
    async (...args: Parameters<T>) => {
      try {
        setIsLoading(true);
        setError(null);
        await callback(...args);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    delay,
    options
  );

  const cancel = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    debouncedCallback: debouncedCallback as T,
    isLoading,
    error,
    cancel,
  };
}
