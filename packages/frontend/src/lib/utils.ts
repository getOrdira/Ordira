// src/lib/utils.ts

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// General utility functions (no validation - that's handled in /lib/validation/utils.ts)

// ===== UI UTILITIES =====

// Tailwind class merger (standard for Next.js/Shadcn)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ===== TEXT UTILITIES =====

// Generate slug (aligned with backend collection.model.ts generateSlug())
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

// Truncate text at word boundary
export function truncateWords(text: string, maxWords: number = 20): string {
  const words = text.split(' ');
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}

// Capitalize first letter
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Convert camelCase to Title Case
export function camelToTitle(camelCase: string): string {
  return camelCase
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// ===== DATE UTILITIES =====

// Format date (common utility for model timestamps)
export function formatDate(date: Date | string, format: 'short' | 'long' | 'relative' = 'short'): string {
  const d = new Date(date);
  
  if (format === 'relative') {
    return formatRelativeTime(d);
  }
  
  if (format === 'short') {
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  return d.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
}

// Check if date is within range
export function isDateInRange(date: Date | string, startDate: Date | string, endDate: Date | string): boolean {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return d >= start && d <= end;
}

// ===== FORMATTING UTILITIES =====

// Format currency (aligned with backend pricing/billing)
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2 
  }).format(amount);
}

// Format file size
export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Format number with commas
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

// ===== BUSINESS LOGIC UTILITIES =====

// Get profile completeness (aligned with business.model.ts)
export function getProfileCompleteness(
  profile: Record<string, any>, 
  requiredFields: string[], 
  optionalFields: string[] = []
): { score: number; missingRequired: string[]; missingOptional: string[] } {
  const missingRequired = requiredFields.filter(field => !profile[field]);
  const missingOptional = optionalFields.filter(field => !profile[field]);
  
  const completedRequired = requiredFields.length - missingRequired.length;
  const completedOptional = optionalFields.length - missingOptional.length;
  
  const requiredWeight = optionalFields.length > 0 ? 0.7 : 1.0;
  const optionalWeight = optionalFields.length > 0 ? 0.3 : 0.0;
  
  const requiredScore = (completedRequired / requiredFields.length) * requiredWeight;
  const optionalScore = optionalFields.length > 0 
    ? (completedOptional / optionalFields.length) * optionalWeight 
    : 0;
  
  return {
    score: Math.round((requiredScore + optionalScore) * 100),
    missingRequired,
    missingOptional
  };
}

// Calculate invitation response time (for analytics)
export function calculateResponseTime(sentAt: Date | string, respondedAt: Date | string | null): string | null {
  if (!respondedAt) return null;
  
  const sent = new Date(sentAt);
  const responded = new Date(respondedAt);
  const diffInHours = Math.abs(responded.getTime() - sent.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 1) return 'Within an hour';
  if (diffInHours < 24) return `${Math.round(diffInHours)} hours`;
  if (diffInHours < 168) return `${Math.round(diffInHours / 24)} days`;
  return `${Math.round(diffInHours / 168)} weeks`;
}

// Generate certificate verification code
export function generateVerificationCode(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// ===== ARRAY/OBJECT UTILITIES =====

// Group array by key
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

// Remove duplicates from array by key
export function uniqueBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set();
  return array.filter(item => {
    const k = item[key];
    return seen.has(k) ? false : seen.add(k);
  });
}

// Sort array by multiple keys
export function sortBy<T>(array: T[], ...keys: (keyof T)[]): T[] {
  return [...array].sort((a, b) => {
    for (const key of keys) {
      if (a[key] < b[key]) return -1;
      if (a[key] > b[key]) return 1;
    }
    return 0;
  });
}

// ===== PERFORMANCE UTILITIES =====

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T, 
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T, 
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ===== URL/QUERY UTILITIES =====

// Build query string from object
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  return searchParams.toString();
}

// Parse query string to object
export function parseQueryString(queryString: string): Record<string, string | string[]> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string | string[]> = {};
  
  for (const [key, value] of params.entries()) {
    if (key in result) {
      const existing = result[key];
      result[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// ===== RANDOM/ID UTILITIES =====

// Generate random ID
export function generateId(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

// Generate UUID v4
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ===== VALIDATION HELPERS (Simple checks - complex validation is in /lib/validation/utils.ts) =====

// Quick validation helpers for UI feedback (use /lib/validation/utils.ts for full validation)
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
  domain: (domain: string): boolean => /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,})+$/.test(domain),
};