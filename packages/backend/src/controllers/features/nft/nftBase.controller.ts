// src/controllers/features/nft/nftBase.controller.ts
// Shared helpers for NFT feature controllers

import { Response } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { getNftService } from '../../../services/container/container.getters';  

interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Base controller exposing helpers shared across NFT feature controllers.
 */
export abstract class NftBaseController extends BaseController {
  protected nftService = getNftService();

  /**
   * Ensure request is authenticated and optionally matches the allowed roles.
   */
  protected ensureAuthenticated(
    req: BaseRequest,
    allowedTypes?: Array<'business' | 'manufacturer' | 'customer' | 'user'>,
  ): void {
    if (!req.userId || !req.userType) {
      throw { statusCode: 401, message: 'Authentication required' };
    }

    if (allowedTypes && !allowedTypes.includes(req.userType)) {
      throw { statusCode: 403, message: 'User type not permitted for this operation' };
    }
  }

  /**
   * Resolve business ID from the request context.
   */
  protected resolveBusinessId(req: BaseRequest): string {
    // Try validated body/query/params first
    const candidateSources = [
      req.validatedBody,
      req.validatedQuery,
      req.validatedParams,
    ];

    for (const source of candidateSources) {
      if (!source) continue;
      if (typeof source.businessId === 'string') {
        return source.businessId;
      }
    }

    // Fallback to businessId from request or tenant context
    return req.businessId || (req as any).tenant?.business?.toString() || '';
  }

  /**
   * Ensure the business ID is valid.
   */
  protected ensureBusinessId(businessId: string): void {
    if (!businessId?.trim()) {
      throw {
        statusCode: 400,
        message: 'Business ID is required',
      };
    }

    // Validate MongoDB ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(businessId)) {
      throw {
        statusCode: 400,
        message: 'Invalid business ID format',
      };
    }
  }

  /**
   * Resolve token ID from request params.
   */
  protected resolveTokenId(req: BaseRequest): string {
    const tokenId =
      req.validatedParams?.tokenId ??
      req.validatedParams?.id ??
      (req.params?.tokenId as string) ??
      (req.params?.id as string);

    if (!tokenId) {
      throw { statusCode: 400, message: 'Token ID is required' };
    }

    return tokenId;
  }

  /**
   * Resolve contract address from request params or body.
   */
  protected resolveContractAddress(req: BaseRequest): string {
    const contractAddress =
      req.validatedParams?.contractAddress ??
      req.validatedBody?.contractAddress ??
      (req.params?.contractAddress as string);

    if (!contractAddress) {
      throw { statusCode: 400, message: 'Contract address is required' };
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      throw { statusCode: 400, message: 'Invalid contract address format' };
    }

    return contractAddress;
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
   * Validate Ethereum address format.
   */
  protected validateAddress(address: string, name: string): void {
    if (!address?.trim()) {
      throw { statusCode: 400, message: `${name} is required` };
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw { statusCode: 400, message: `Invalid ${name} format` };
    }
  }
}

export type NftBaseRequest = BaseRequest;

