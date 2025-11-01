// src/controllers/utils/validation.helpers.ts
// Validation utilities for controllers

import { Request, Response, NextFunction } from 'express';
import { ResponseHelpers } from './response.helpers';

/**
 * Validation helper class
 */
export class ValidationHelpers {
  /**
   * Validate required fields
   */
  static validateRequired(
    data: any,
    requiredFields: string[],
    res: Response,
    next: NextFunction
  ): void {
    const missingFields = requiredFields.filter(field => {
      return data[field] === undefined || data[field] === null || data[field] === '';
    });

    if (missingFields.length > 0) {
      ResponseHelpers.validationError(
        res,
        `Missing required fields: ${missingFields.join(', ')}`,
        { missingFields }
      );
      return;
    }

    next();
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  static validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate MongoDB ObjectId
   */
  static validateObjectId(id: string): boolean {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(
    req: Request,
    page: any,
    limit: any,
    res: Response,
    next: NextFunction
  ): void {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    if (pageNum < 1) {
      ResponseHelpers.validationError(res, 'Page must be greater than 0');
      return;
    }

    if (limitNum < 1 || limitNum > 100) {
      ResponseHelpers.validationError(res, 'Limit must be between 1 and 100');
      return;
    }

    // Add validated values to request
    (req as any).validatedPagination = {
      page: pageNum,
      limit: limitNum,
      skip: (pageNum - 1) * limitNum
    };

    next();
  }

  /**
   * Validate date range
   */
  static validateDateRange(
    req: Request,
    startDate: any,
    endDate: any,
    res: Response,
    next: NextFunction
  ): void {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        ResponseHelpers.validationError(res, 'Invalid date format');
        return;
      }

      if (start > end) {
        ResponseHelpers.validationError(res, 'Start date must be before end date');
        return;
      }

      // Add validated values to request
      (req as any).validatedDateRange = { startDate: start, endDate: end };
    }

    next();
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Sanitize object input
   */
  static sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = ValidationHelpers.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = ValidationHelpers.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Validate business ID format
   */
  static validateBusinessId(businessId: string): boolean {
    // Business ID should be a valid MongoDB ObjectId
    return ValidationHelpers.validateObjectId(businessId);
  }

  /**
   * Validate brand slug format
   */
  static validateBrandSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9\-]+$/;
    return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50;
  }

  /**
   * Validate wallet address format
   */
  static validateWalletAddress(address: string): boolean {
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
  }
}
