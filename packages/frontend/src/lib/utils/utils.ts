// src/lib/utils/utils.ts
// Backwards compatible exports for legacy imports.

export { cn } from './ui';
export {
  generateSlug,
  truncateText,
  truncateWords,
  capitalize,
  camelToTitle,
  generateId,
  generateUUID,
  generateVerificationCode
} from './string';
export {
  formatDate,
  formatRelativeTime,
  isDateInRange,
  calculateResponseTime
} from './date';
export {
  formatCurrency,
  formatFileSize,
  formatPercentage,
  formatNumber
} from './number';
export {
  groupBy,
  uniqueBy,
  sortBy,
  chunk,
  flatten
} from './array';
export {
  debounce,
  throttle,
  rafThrottle
} from './performance';

export const quickValidate = {
  email: (email: string): boolean => /^\S+@\S+\.\S+$/.test(email),
  phone: (phone: string): boolean => /^\+?[\d\s-()]{10,}$/.test(phone),
  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  walletAddress: (address: string): boolean => /^0x[a-fA-F0-9]{40}$/.test(address),
  domain: (domain: string): boolean =>
    /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,})+$/.test(domain)
};

export const buildQueryString = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, String(item)));
      return;
    }
    searchParams.append(key, String(value));
  });

  return searchParams.toString();
};

export const parseQueryString = (queryString: string): Record<string, string | string[]> => {
  const params = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : queryString);
  const result: Record<string, string | string[]> = {};

  params.forEach((value, key) => {
    if (key in result) {
      const existing = result[key];
      result[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      result[key] = value;
    }
  });

  return result;
};