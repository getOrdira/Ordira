// src/services/supplyChain/validation/supplyChainValidation.service.ts
import { logger } from '../../../utils/logger';
import { createAppError } from '../../../middleware/core/error.middleware';

// ===== INTERFACES =====

export interface IDeploymentInput {
  businessId: string;
  manufacturerName: string;
}

export interface IEndpointData {
  name: string;
  eventType: 'sourced' | 'manufactured' | 'quality_checked' | 'packaged' | 'shipped' | 'delivered';
  location: string;
}

export interface IProductData {
  productId: string;
  name: string;
  description: string;
}

export interface IEventData {
  endpointId: number;
  productId: string;
  eventType: string;
  location: string;
  details: string;
}

export interface IValidationResult {
  valid: boolean;
  errors: string[];
}

// ===== ERROR CLASS =====

class ValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
  }
}

// ===== MAIN SERVICE CLASS =====

export class SupplyChainValidationService {
  private static instance: SupplyChainValidationService;

  private constructor() {}

  public static getInstance(): SupplyChainValidationService {
    if (!SupplyChainValidationService.instance) {
      SupplyChainValidationService.instance = new SupplyChainValidationService();
    }
    return SupplyChainValidationService.instance;
  }

  /**
   * Validate deployment input
   */
  async validateDeploymentInput(input: IDeploymentInput): Promise<IValidationResult> {
    const errors: string[] = [];

    // Validate business ID
    if (!input.businessId || typeof input.businessId !== 'string' || input.businessId.trim().length === 0) {
      errors.push('Business ID is required and must be a non-empty string');
    } else if (input.businessId.length > 100) {
      errors.push('Business ID must be 100 characters or less');
    }

    // Validate manufacturer name
    if (!input.manufacturerName || typeof input.manufacturerName !== 'string' || input.manufacturerName.trim().length === 0) {
      errors.push('Manufacturer name is required and must be a non-empty string');
    } else if (input.manufacturerName.length > 200) {
      errors.push('Manufacturer name must be 200 characters or less');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate endpoint data
   */
  async validateEndpointData(data: IEndpointData): Promise<IValidationResult> {
    const errors: string[] = [];

    // Validate name
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Endpoint name is required and must be a non-empty string');
    } else if (data.name.length > 100) {
      errors.push('Endpoint name must be 100 characters or less');
    }

    // Validate event type
    const validEventTypes = ['sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered'];
    if (!data.eventType || !validEventTypes.includes(data.eventType)) {
      errors.push(`Event type must be one of: ${validEventTypes.join(', ')}`);
    }

    // Validate location
    if (!data.location || typeof data.location !== 'string' || data.location.trim().length === 0) {
      errors.push('Location is required and must be a non-empty string');
    } else if (data.location.length > 200) {
      errors.push('Location must be 200 characters or less');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate product data
   */
  async validateProductData(data: IProductData): Promise<IValidationResult> {
    const errors: string[] = [];

    // Validate product ID
    if (!data.productId || typeof data.productId !== 'string' || data.productId.trim().length === 0) {
      errors.push('Product ID is required and must be a non-empty string');
    } else if (data.productId.length > 100) {
      errors.push('Product ID must be 100 characters or less');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(data.productId)) {
      errors.push('Product ID must contain only alphanumeric characters, hyphens, and underscores');
    }

    // Validate name
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Product name is required and must be a non-empty string');
    } else if (data.name.length > 200) {
      errors.push('Product name must be 200 characters or less');
    }

    // Validate description
    if (data.description && typeof data.description !== 'string') {
      errors.push('Description must be a string');
    } else if (data.description && data.description.length > 1000) {
      errors.push('Description must be 1000 characters or less');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate event data
   */
  async validateEventData(data: IEventData): Promise<IValidationResult> {
    const errors: string[] = [];

    // Validate endpoint ID
    if (typeof data.endpointId !== 'number' || data.endpointId < 0 || !Number.isInteger(data.endpointId)) {
      errors.push('Endpoint ID must be a non-negative integer');
    }

    // Validate product ID
    if (!data.productId || typeof data.productId !== 'string' || data.productId.trim().length === 0) {
      errors.push('Product ID is required and must be a non-empty string');
    } else if (data.productId.length > 100) {
      errors.push('Product ID must be 100 characters or less');
    }

    // Validate event type
    if (!data.eventType || typeof data.eventType !== 'string' || data.eventType.trim().length === 0) {
      errors.push('Event type is required and must be a non-empty string');
    } else if (data.eventType.length > 50) {
      errors.push('Event type must be 50 characters or less');
    }

    // Validate location
    if (!data.location || typeof data.location !== 'string' || data.location.trim().length === 0) {
      errors.push('Location is required and must be a non-empty string');
    } else if (data.location.length > 200) {
      errors.push('Location must be 200 characters or less');
    }

    // Validate details
    if (data.details && typeof data.details !== 'string') {
      errors.push('Details must be a string');
    } else if (data.details && data.details.length > 1000) {
      errors.push('Details must be 1000 characters or less');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate contract address format
   */
  async validateContractAddress(address: string): Promise<IValidationResult> {
    const errors: string[] = [];

    if (!address || typeof address !== 'string') {
      errors.push('Contract address is required and must be a string');
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      errors.push('Contract address must be a valid Ethereum address (0x followed by 40 hex characters)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate business ID format
   */
  async validateBusinessId(businessId: string): Promise<IValidationResult> {
    const errors: string[] = [];

    if (!businessId || typeof businessId !== 'string') {
      errors.push('Business ID is required and must be a string');
    } else if (businessId.trim().length === 0) {
      errors.push('Business ID cannot be empty');
    } else if (businessId.length > 100) {
      errors.push('Business ID must be 100 characters or less');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(businessId)) {
      errors.push('Business ID must contain only alphanumeric characters, hyphens, and underscores');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate QR code data
   */
  async validateQrCodeData(data: any): Promise<IValidationResult> {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('QR code data must be an object');
      return { valid: false, errors };
    }

    // Check for required fields based on type
    switch (data.type) {
      case 'supply_chain_tracking':
        if (!data.productId) errors.push('Product ID is required for supply chain tracking');
        if (!data.manufacturerId) errors.push('Manufacturer ID is required for supply chain tracking');
        break;
      case 'certificate_verification':
        if (!data.certificateId) errors.push('Certificate ID is required for certificate verification');
        if (!data.tokenId) errors.push('Token ID is required for certificate verification');
        break;
      case 'voting':
        if (!data.proposalId) errors.push('Proposal ID is required for voting');
        if (!data.voterEmail) errors.push('Voter email is required for voting');
        break;
      default:
        // Allow custom types but warn
        logger.warn('Unknown QR code data type', { type: data.type });
    }

    // Validate timestamp if present
    if (data.timestamp && !this.isValidTimestamp(data.timestamp)) {
      errors.push('Invalid timestamp format');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate gas limit
   */
  async validateGasLimit(gasLimit: any): Promise<IValidationResult> {
    const errors: string[] = [];

    if (gasLimit === undefined || gasLimit === null) {
      return { valid: true, errors: [] }; // Gas limit is optional
    }

    if (typeof gasLimit !== 'bigint' && typeof gasLimit !== 'number' && typeof gasLimit !== 'string') {
      errors.push('Gas limit must be a number, string, or BigInt');
    } else {
      const numGasLimit = typeof gasLimit === 'bigint' ? gasLimit : BigInt(gasLimit);
      if (numGasLimit <= 0) {
        errors.push('Gas limit must be greater than 0');
      } else if (numGasLimit > BigInt(30000000)) { // 30M gas limit
        errors.push('Gas limit exceeds maximum allowed (30,000,000)');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate transaction hash
   */
  async validateTransactionHash(txHash: string): Promise<IValidationResult> {
    const errors: string[] = [];

    if (!txHash || typeof txHash !== 'string') {
      errors.push('Transaction hash is required and must be a string');
    } else if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      errors.push('Transaction hash must be a valid Ethereum transaction hash (0x followed by 64 hex characters)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate pagination parameters
   */
  async validatePaginationParams(params: {
    page?: number;
    limit?: number;
    offset?: number;
  }): Promise<IValidationResult> {
    const errors: string[] = [];

    if (params.page !== undefined) {
      if (typeof params.page !== 'number' || !Number.isInteger(params.page) || params.page < 1) {
        errors.push('Page must be a positive integer');
      }
    }

    if (params.limit !== undefined) {
      if (typeof params.limit !== 'number' || !Number.isInteger(params.limit) || params.limit < 1 || params.limit > 1000) {
        errors.push('Limit must be a positive integer between 1 and 1000');
      }
    }

    if (params.offset !== undefined) {
      if (typeof params.offset !== 'number' || !Number.isInteger(params.offset) || params.offset < 0) {
        errors.push('Offset must be a non-negative integer');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate date range
   */
  async validateDateRange(params: {
    startDate?: string | Date;
    endDate?: string | Date;
  }): Promise<IValidationResult> {
    const errors: string[] = [];

    if (params.startDate && !this.isValidDate(params.startDate)) {
      errors.push('Start date must be a valid date');
    }

    if (params.endDate && !this.isValidDate(params.endDate)) {
      errors.push('End date must be a valid date');
    }

    if (params.startDate && params.endDate) {
      const start = new Date(params.startDate);
      const end = new Date(params.endDate);
      
      if (start > end) {
        errors.push('Start date must be before end date');
      }

      // Check if date range is too large (more than 1 year)
      const diffInDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (diffInDays > 365) {
        errors.push('Date range cannot exceed 365 days');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Helper method to validate timestamp
   */
  private isValidTimestamp(timestamp: any): boolean {
    try {
      const date = new Date(timestamp);
      return !isNaN(date.getTime()) && date.getTime() > 0;
    } catch {
      return false;
    }
  }

  /**
   * Helper method to validate date
   */
  private isValidDate(date: any): boolean {
    try {
      const d = new Date(date);
      return !isNaN(d.getTime()) && d.getTime() > 0;
    } catch {
      return false;
    }
  }

  /**
   * Validate all input at once
   */
  async validateAll(input: {
    deployment?: IDeploymentInput;
    endpoint?: IEndpointData;
    product?: IProductData;
    event?: IEventData;
    contractAddress?: string;
    businessId?: string;
    qrCodeData?: any;
    gasLimit?: any;
    txHash?: string;
    pagination?: { page?: number; limit?: number; offset?: number };
    dateRange?: { startDate?: string | Date; endDate?: string | Date };
  }): Promise<IValidationResult> {
    const allErrors: string[] = [];

    // Validate each provided input
    if (input.deployment) {
      const result = await this.validateDeploymentInput(input.deployment);
      allErrors.push(...result.errors);
    }

    if (input.endpoint) {
      const result = await this.validateEndpointData(input.endpoint);
      allErrors.push(...result.errors);
    }

    if (input.product) {
      const result = await this.validateProductData(input.product);
      allErrors.push(...result.errors);
    }

    if (input.event) {
      const result = await this.validateEventData(input.event);
      allErrors.push(...result.errors);
    }

    if (input.contractAddress) {
      const result = await this.validateContractAddress(input.contractAddress);
      allErrors.push(...result.errors);
    }

    if (input.businessId) {
      const result = await this.validateBusinessId(input.businessId);
      allErrors.push(...result.errors);
    }

    if (input.qrCodeData) {
      const result = await this.validateQrCodeData(input.qrCodeData);
      allErrors.push(...result.errors);
    }

    if (input.gasLimit !== undefined) {
      const result = await this.validateGasLimit(input.gasLimit);
      allErrors.push(...result.errors);
    }

    if (input.txHash) {
      const result = await this.validateTransactionHash(input.txHash);
      allErrors.push(...result.errors);
    }

    if (input.pagination) {
      const result = await this.validatePaginationParams(input.pagination);
      allErrors.push(...result.errors);
    }

    if (input.dateRange) {
      const result = await this.validateDateRange(input.dateRange);
      allErrors.push(...result.errors);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors
    };
  }
}
