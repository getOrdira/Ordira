// src/services/utils/utils.service.ts

/**
 * Shared utility functions used across the application
 * Contains common helpers for validation, formatting, and data manipulation
 */
export class UtilsService {

  /**
   * Generate a random numeric code (e.g. "123456") of given length
   * Used for email verification, phone verification, etc.
   */
  static generateNumericCode(length: number = 6): string {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10);
    }
    return code;
  }

  /**
   * Generate a random alphanumeric code (e.g. "A1B2C3") of given length
   * Used for secure tokens, reset codes, etc.
   */
  static generateAlphanumericCode(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Generate a secure random string for tokens, passwords, etc.
   */
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format (basic validation)
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Normalize email (lowercase, trim)
   */
  static normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Normalize phone number (remove spaces, dashes, parentheses)
   */
  static normalizePhone(phone: string): string {
    return phone.replace(/[\s\-\(\)]/g, '');
  }

  /**
   * Generate a slug from a string (for URLs, filenames, etc.)
   */
  static generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Capitalize first letter of each word
   */
  static titleCase(text: string): string {
    return text.replace(/\w\S*/g, (txt) =>
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  /**
   * Format file size in human-readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format currency amount
   */
  static formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Format date to readable string
   */
  static formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return new Intl.DateTimeFormat('en-US', options || defaultOptions).format(date);
  }

  /**
   * Calculate age from date of birth
   */
  static calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Check if a date is valid
   */
  static isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Deep clone an object
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (obj instanceof Array) return obj.map(item => this.deepClone(item)) as unknown as T;
    if (typeof obj === 'object') {
      const clonedObj = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
    return obj;
  }

  /**
   * Remove undefined/null values from object
   */
  static cleanObject(obj: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          const cleanedNested = this.cleanObject(value);
          if (Object.keys(cleanedNested).length > 0) {
            cleaned[key] = cleanedNested;
          }
        } else {
          cleaned[key] = value;
        }
      }
    }
    
    return cleaned;
  }

  /**
   * Generate pagination metadata
   */
  static generatePaginationMeta(
    total: number,
    page: number,
    limit: number
  ): {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } {
    const totalPages = Math.ceil(total / limit);
    
    return {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  /**
   * Validate business registration number format (basic)
   */
  static isValidBusinessNumber(regNumber: string): boolean {
    // Basic validation - adjust based on your requirements
    return /^[A-Z0-9]{6,20}$/i.test(regNumber);
  }

  /**
   * Validate tax ID format (basic)
   */
  static isValidTaxId(taxId: string): boolean {
    // Basic validation - adjust based on your requirements
    return /^[A-Z0-9\-]{8,15}$/i.test(taxId);
  }

  /**
   * Generate a random color hex code
   */
  static generateRandomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }

  /**
   * Extract domain from email address
   */
  static extractEmailDomain(email: string): string {
    return email.split('@')[1]?.toLowerCase() || '';
  }

  /**
   * Check if string contains only allowed characters
   */
  static containsOnlyAllowedChars(text: string, allowedChars: string): boolean {
    const regex = new RegExp(`^[${allowedChars}]*$`);
    return regex.test(text);
  }

  /**
   * Generate initials from name
   */
  static generateInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 3); // Max 3 initials
  }

  /**
   * Mask sensitive information (email, phone, etc.)
   */
  static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    
    const maskedLocal = local.charAt(0) + '*'.repeat(local.length - 2) + local.slice(-1);
    return `${maskedLocal}@${domain}`;
  }

  static maskPhone(phone: string): string {
    if (phone.length <= 4) return phone;
    return '*'.repeat(phone.length - 4) + phone.slice(-4);
  }

  /**
   * Convert string to boolean safely
   */
  static stringToBoolean(value: string | boolean | undefined): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }
    return false;
  }

  /**
   * Retry a function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}

// Legacy exports for backward compatibility
export const generateCode = UtilsService.generateNumericCode;
export const formatFileSize = UtilsService.formatFileSize;