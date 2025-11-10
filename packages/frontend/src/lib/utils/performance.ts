// src/lib/utils/performance.ts
// Performance-focused helpers (debounce, throttle, etc.).

export const debounce = <T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      timeout = null;
      fn(...args);
    }, delay);
  };
};

export const throttle = <T extends (...args: any[]) => void>(
  fn: T,
  interval: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  let trailingTimeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall >= interval) {
      lastCall = now;
      fn(...args);
      return;
    }

    lastArgs = args;

    if (!trailingTimeout) {
      trailingTimeout = setTimeout(() => {
        trailingTimeout = null;
        lastCall = Date.now();
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, interval - (now - lastCall));
    }
  };
};

export const rafThrottle = <T extends (...args: any[]) => void>(fn: T): ((...args: Parameters<T>) => void) => {
  let running = false;
  let lastArgs: Parameters<T> | null = null;

  const run = () => {
    if (!lastArgs) {
      running = false;
      return;
    }
    fn(...lastArgs);
    lastArgs = null;
    requestAnimationFrame(run);
  };

  return (...args: Parameters<T>) => {
    lastArgs = args;
    if (!running) {
      running = true;
      requestAnimationFrame(run);
    }
  };
};

