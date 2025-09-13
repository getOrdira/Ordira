// src/hooks/use-local-storage.ts

import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = T | ((val: T) => T);

interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: SetValue<T>) => void;
  removeValue: () => void;
  isLoading: boolean;
  error: Error | null;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): UseLocalStorageReturn<T> {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // State to track loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value: SetValue<T>) => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        // Save state
        setStoredValue(valueToStore);
        
        // Save to local storage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
        setError(error as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [key, storedValue]
  );

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);
      
      setStoredValue(initialValue);
      
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [key, initialValue]);

  // Listen for changes to this localStorage key from other tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing localStorage key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return {
    value: storedValue,
    setValue,
    removeValue,
    isLoading,
    error,
  };
}

// Hook for managing multiple localStorage keys
export function useLocalStorageMulti<T extends Record<string, any>>(
  keys: T
): {
  values: T;
  setValue: <K extends keyof T>(key: K, value: T[K]) => void;
  setValues: (values: Partial<T>) => void;
  removeValue: <K extends keyof T>(key: K) => void;
  removeAll: () => void;
  isLoading: boolean;
  error: Error | null;
} {
  const [values, setValues] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return keys;
    }
    
    const result = { ...keys };
    Object.keys(keys).forEach(key => {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          result[key as keyof T] = JSON.parse(item);
        }
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}":`, error);
      }
    });
    return result;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    try {
      setIsLoading(true);
      setError(null);
      
      setValues(prev => ({ ...prev, [key]: value }));
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key as string, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${String(key)}":`, error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setMultipleValues = useCallback((newValues: Partial<T>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      setValues(prev => ({ ...prev, ...newValues }));
      
      if (typeof window !== 'undefined') {
        Object.entries(newValues).forEach(([key, value]) => {
          window.localStorage.setItem(key, JSON.stringify(value));
        });
      }
    } catch (error) {
      console.error('Error setting multiple localStorage keys:', error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeValue = useCallback(<K extends keyof T>(key: K) => {
    try {
      setIsLoading(true);
      setError(null);
      
      setValues(prev => {
        const { [key]: removed, ...rest } = prev;
        return rest as T;
      });
      
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key as string);
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${String(key)}":`, error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeAll = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);
      
      setValues(keys);
      
      if (typeof window !== 'undefined') {
        Object.keys(keys).forEach(key => {
          window.localStorage.removeItem(key);
        });
      }
    } catch (error) {
      console.error('Error removing all localStorage keys:', error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [keys]);

  return {
    values,
    setValue,
    setValues: setMultipleValues,
    removeValue,
    removeAll,
    isLoading,
    error,
  };
}
