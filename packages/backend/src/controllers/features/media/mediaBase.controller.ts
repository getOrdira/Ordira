// src/controllers/features/media/mediaBase.controller.ts
// Shared helpers for media feature controllers

import { Response } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { mediaServices } from '../../../services/media';

interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Base controller exposing helpers shared across media feature controllers.
 */
export abstract class MediaBaseController extends BaseController {
  protected mediaServices = mediaServices;

  /**
   * Ensure request is authenticated and optionally matches the allowed roles.
   */
  protected ensureAuthenticated(
    req: BaseRequest,
    allowedTypes?: Array<'business' | 'manufacturer' | 'customer'>,
  ): void {
    if (!req.userId || !req.userType) {
      throw { statusCode: 401, message: 'Authentication required' };
    }

    if (allowedTypes && !allowedTypes.includes(req.userType)) {
      throw { statusCode: 403, message: 'User type not permitted for this operation' };
    }
  }

  /**
   * Resolve uploader ID from the request context.
   */
  protected resolveUploaderId(req: BaseRequest): string {
    // Try validated body/query/params first
    const candidateSources = [
      req.validatedBody,
      req.validatedQuery,
      req.validatedParams,
    ];

    for (const source of candidateSources) {
      if (!source) continue;
      if (typeof source.uploaderId === 'string') {
        return source.uploaderId;
      }
    }

    // Fallback to businessId or manufacturerId or userId
    return req.businessId || req.manufacturerId || req.userId || '';
  }

  /**
   * Ensure the uploader ID is valid.
   */
  protected ensureUploaderId(uploaderId: string): void {
    if (!uploaderId?.trim()) {
      throw {
        statusCode: 400,
        message: 'Uploader ID is required',
      };
    }
  }

  /**
   * Resolve media identifier from request params.
   */
  protected resolveMediaId(req: BaseRequest): string {
    const mediaId =
      req.validatedParams?.mediaId ??
      req.validatedParams?.id ??
      (req.params?.mediaId as string) ??
      (req.params?.id as string);

    if (!mediaId) {
      throw { statusCode: 400, message: 'Media identifier is required' };
    }

    return mediaId;
  }

  /**
   * Parse pagination inputs with sane defaults.
   */
  protected parsePagination(
    source: Record<string, unknown> | undefined,
    defaultLimit: number = 20,
  ): PaginationResult {
    const page = this.parseNumber(source?.page, 1, { min: 1 });
    const limit = this.parseNumber(source?.limit, defaultLimit, { min: 1, max: 100 });

    return {
      page,
      limit,
      offset: (page - 1) * limit,
    };
  }

  /**
   * Utility to parse numeric input with constraints.
   */
  protected parseNumber(
    value: unknown,
    fallback: number,
    options: { min?: number; max?: number } = {},
  ): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    let result = parsed;
    if (options.min !== undefined && result < options.min) {
      result = options.min;
    }
    if (options.max !== undefined && result > options.max) {
      result = options.max;
    }

    return result;
  }

  /**
   * Parse optional numeric value.
   */
  protected parseOptionalNumber(
    value: unknown,
    options: { min?: number; max?: number } = {},
  ): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }
    if (options.min !== undefined && parsed < options.min) {
      return options.min;
    }
    if (options.max !== undefined && parsed > options.max) {
      return options.max;
    }
    return parsed;
  }

  /**
   * Parse string safely.
   */
  protected parseString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return undefined;
  }

  /**
   * Parse boolean input with fallback.
   */
  protected parseBoolean(value: unknown, fallback: boolean = false): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }

    return fallback;
  }

  /**
   * Parse array input safely.
   */
  protected parseArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
    if (typeof value === 'string') {
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }
}

export type MediaBaseRequest = BaseRequest;

