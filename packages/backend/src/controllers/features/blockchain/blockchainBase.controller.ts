// src/controllers/features/blockchain/blockchainBase.controller.ts
// Shared helpers for blockchain feature controllers

import { BaseController, BaseRequest } from '../../core/base.controller';
import { ErrorHelpers } from '../../utils/error.helpers';
import { BlockchainContractsService } from '../../../services/blockchain/contracts.service';

const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const TRANSACTION_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

export type BlockchainBaseRequest = BaseRequest;

/**
 * Base controller that centralises blockchain-specific helpers.
 */
export abstract class BlockchainBaseController extends BaseController {
  /**
   * Ensure the current request is authenticated.
   * @throws AppError when authentication context is missing.
   */
  protected ensureAuthenticated(req: BlockchainBaseRequest): void {
    if (!req.userId) {
      throw ErrorHelpers.createError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    if (!req.userType) {
      throw ErrorHelpers.createError('User type required', 401, 'USER_TYPE_REQUIRED');
    }
  }

  /**
   * Ensure the current request contains a business context.
   * @returns Business identifier from request context.
   * @throws AppError when a business identifier cannot be resolved.
   */
  protected ensureBusinessContext(req: BlockchainBaseRequest): string {
    this.ensureAuthenticated(req);

    const businessId =
      req.businessId ??
      req.validatedParams?.businessId ??
      req.validatedBody?.businessId ??
      req.validatedQuery?.businessId ??
      (req.params as any)?.businessId ??
      (req.body as any)?.businessId ??
      (req.query as any)?.businessId;

    if (!businessId || typeof businessId !== 'string') {
      throw ErrorHelpers.createError(
        'Business identifier is required for blockchain operation',
        400,
        'BUSINESS_ID_REQUIRED'
      );
    }

    return businessId;
  }

  /**
   * Resolve a request field as a trimmed string.
   * @param req Request instance.
   * @param fieldName Name of the field to resolve.
   * @returns Trimmed string or undefined when missing.
   */
  protected getRequestString(req: BlockchainBaseRequest, fieldName: string): string | undefined {
    const value =
      req.validatedParams?.[fieldName] ??
      req.validatedBody?.[fieldName] ??
      req.validatedQuery?.[fieldName] ??
      (req.params as any)?.[fieldName] ??
      (req.body as any)?.[fieldName] ??
      (req.query as any)?.[fieldName];

    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  /**
   * Ensure an Ethereum address is present and valid.
   * @param req Request instance.
   * @param fieldName Field that should contain the address.
   */
  protected requireEthereumAddress(req: BlockchainBaseRequest, fieldName: string): string {
    const address = this.getRequestString(req, fieldName);

    if (!address) {
      throw ErrorHelpers.createError(`${fieldName} is required`, 400, 'ADDRESS_REQUIRED');
    }

    if (!ETHEREUM_ADDRESS_REGEX.test(address)) {
      throw ErrorHelpers.createError(`Invalid ${fieldName} format`, 400, 'INVALID_ADDRESS');
    }

    return address;
  }

  /**
   * Ensure a transaction hash is present and valid.
   */
  protected requireTransactionHash(req: BlockchainBaseRequest, fieldName: string): string {
    const hash = this.getRequestString(req, fieldName);

    if (!hash) {
      throw ErrorHelpers.createError(`${fieldName} is required`, 400, 'TX_HASH_REQUIRED');
    }

    if (!TRANSACTION_HASH_REGEX.test(hash)) {
      throw ErrorHelpers.createError(`Invalid ${fieldName} format`, 400, 'INVALID_TX_HASH');
    }

    return hash;
  }

  /**
   * Parse gas priority ensuring only supported values are accepted.
   */
  protected parseGasPriority(value?: string): 'slow' | 'standard' | 'fast' {
    if (!value) {
      return 'standard';
    }

    const normalized = value.toLowerCase();
    if (normalized === 'slow' || normalized === 'standard' || normalized === 'fast') {
      return normalized;
    }

    throw ErrorHelpers.createError(
      'priority must be one of slow, standard, or fast',
      400,
      'INVALID_PRIORITY'
    );
  }

  /**
   * Validate an ABI payload.
   */
  protected validateAbi(abi: unknown): abi is any[] {
    if (!Array.isArray(abi) || abi.length === 0) {
      throw ErrorHelpers.createError('ABI must be a non-empty array', 400, 'INVALID_ABI');
    }

    return true;
  }

  /**
   * Validate an array of Ethereum addresses.
   */
  protected validateAddressArray(addresses: unknown, fieldName: string): string[] {
    if (!Array.isArray(addresses)) {
      throw ErrorHelpers.createError(`${fieldName} must be an array`, 400, 'INVALID_ADDRESS_LIST');
    }

    const uniqueAddresses = new Set<string>();

    addresses.forEach((item, index) => {
      if (typeof item !== 'string' || !ETHEREUM_ADDRESS_REGEX.test(item.trim())) {
        throw ErrorHelpers.createError(
          `${fieldName}[${index}] must be a valid Ethereum address`,
          400,
          'INVALID_ADDRESS'
        );
      }
      uniqueAddresses.add(item.trim());
    });

    if (uniqueAddresses.size === 0) {
      throw ErrorHelpers.createError(`${fieldName} cannot be empty`, 400, 'EMPTY_ADDRESS_LIST');
    }

    return Array.from(uniqueAddresses);
  }

  /**
   * Normalize optional parameters array.
   */
  protected normalizeParams(params: unknown): any[] {
    if (params === undefined || params === null) {
      return [];
    }

    if (!Array.isArray(params)) {
      throw ErrorHelpers.createError('params must be an array', 400, 'INVALID_PARAMS');
    }

    return params;
  }

  /**
   * Map blockchain service errors to controller-friendly responses.
   */
  protected unwrapBlockchainError(error: unknown): never {
    if (error instanceof Error) {
      throw ErrorHelpers.createError(
        error.message,
        (error as any).statusCode ?? 500,
        (error as any).code ?? 'BLOCKCHAIN_ERROR',
        (error as any).details
      );
    }

    throw ErrorHelpers.createError('Unexpected blockchain service error', 500, 'BLOCKCHAIN_ERROR');
  }

  /**
   * Helper to capture provider health metrics prior to performing an operation.
   */
  protected async captureProviderHealth(): Promise<void> {
    try {
      const health = await BlockchainContractsService.getNetworkInfo();
      this.logger.debug('Blockchain provider health snapshot', {
        chainId: health.chainId,
        blockNumber: health.blockNumber,
        gasPrice: health.gasPrice
      });
    } catch (error) {
      this.logger.warn('Unable to capture provider health snapshot', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

