// src/services/supplyChain/utils/mappers.ts
import { logger } from '../../../utils/logger';
import {
  IContractStats,
  ISupplyChainEndpoint,
  ISupplyChainProduct,
  ISupplyChainEvent,
  SupplyChainEventType,
  ITransactionReceipt,
  ITransactionLog,
  IApiResponse,
  IPaginatedResponse
} from './types';

// ===== MAIN MAPPER CLASS =====

export class SupplyChainMappers {
  private static instance: SupplyChainMappers;

  private constructor() {}

  public static getInstance(): SupplyChainMappers {
    if (!SupplyChainMappers.instance) {
      SupplyChainMappers.instance = new SupplyChainMappers();
    }
    return SupplyChainMappers.instance;
  }

  /**
   * Map blockchain contract stats response to IContractStats
   */
  mapContractStats(
    blockchainResponse: [bigint, bigint, bigint, string, string]
  ): IContractStats {
    try {
      return {
        totalEvents: Number(blockchainResponse[0]),
        totalProducts: Number(blockchainResponse[1]),
        totalEndpoints: Number(blockchainResponse[2]),
        businessId: blockchainResponse[3],
        manufacturerName: blockchainResponse[4]
      };
    } catch (error: any) {
      logger.error('Failed to map contract stats:', error);
      throw new Error(`Failed to map contract stats: ${error.message}`);
    }
  }

  /**
   * Map blockchain endpoint response to ISupplyChainEndpoint
   */
  mapEndpoint(
    id: bigint,
    blockchainResponse: {
      name: string;
      eventType: string;
      isActive: boolean;
      location?: string;
      eventCount?: bigint;
      createdAt?: bigint;
    }
  ): ISupplyChainEndpoint {
    try {
      return {
        id: Number(id),
        name: blockchainResponse.name,
        eventType: this.mapEventType(blockchainResponse.eventType),
        location: blockchainResponse.location || '',
        isActive: blockchainResponse.isActive,
        eventCount: Number(blockchainResponse.eventCount || 0),
        createdAt: Number(blockchainResponse.createdAt || 0)
      };
    } catch (error: any) {
      logger.error('Failed to map endpoint:', error);
      throw new Error(`Failed to map endpoint: ${error.message}`);
    }
  }

  /**
   * Map blockchain product response to ISupplyChainProduct
   */
  mapProduct(
    id: bigint,
    blockchainResponse: {
      productId: string;
      name: string;
      isActive: boolean;
      description?: string;
      totalEvents?: bigint;
      createdAt?: bigint;
    }
  ): ISupplyChainProduct {
    try {
      return {
        id: Number(id),
        productId: blockchainResponse.productId,
        name: blockchainResponse.name,
        description: blockchainResponse.description || '',
        totalEvents: Number(blockchainResponse.totalEvents || 0),
        createdAt: Number(blockchainResponse.createdAt || 0),
        isActive: blockchainResponse.isActive
      };
    } catch (error: any) {
      logger.error('Failed to map product:', error);
      throw new Error(`Failed to map product: ${error.message}`);
    }
  }

  /**
   * Map blockchain event response to ISupplyChainEvent
   */
  mapEvent(
    id: bigint,
    blockchainResponse: {
      endpointId: bigint;
      productId: string;
      eventData: string;
      timestamp: bigint;
      eventType?: string;
      location?: string;
      details?: string;
      loggedBy?: string;
      isValid?: boolean;
    }
  ): ISupplyChainEvent {
    try {
      return {
        id: Number(id),
        eventType: blockchainResponse.eventType || '',
        productId: blockchainResponse.productId,
        location: blockchainResponse.location || '',
        details: blockchainResponse.details || '',
        timestamp: Number(blockchainResponse.timestamp),
        loggedBy: blockchainResponse.loggedBy || '',
        isValid: blockchainResponse.isValid || false
      };
    } catch (error: any) {
      logger.error('Failed to map event:', error);
      throw new Error(`Failed to map event: ${error.message}`);
    }
  }

  /**
   * Map transaction receipt to ITransactionReceipt
   */
  mapTransactionReceipt(
    receipt: any,
    transactionHash: string
  ): ITransactionReceipt {
    try {
      return {
        blockNumber: receipt.blockNumber || 0,
        gasUsed: receipt.gasUsed?.toString() || '0',
        logs: this.mapTransactionLogs(receipt.logs || []),
        status: receipt.status === 1 ? 'success' : 'failed',
        transactionHash
      };
    } catch (error: any) {
      logger.error('Failed to map transaction receipt:', error);
      throw new Error(`Failed to map transaction receipt: ${error.message}`);
    }
  }

  /**
   * Map transaction logs to ITransactionLog[]
   */
  mapTransactionLogs(logs: any[]): ITransactionLog[] {
    try {
      return logs.map(log => ({
        address: log.address || '',
        topics: log.topics || [],
        data: log.data || '',
        blockNumber: log.blockNumber || 0,
        transactionHash: log.transactionHash || '',
        logIndex: log.logIndex || 0
      }));
    } catch (error: any) {
      logger.error('Failed to map transaction logs:', error);
      return [];
    }
  }

  /**
   * Map event type string to SupplyChainEventType enum
   */
  mapEventType(eventType: string): SupplyChainEventType {
    const normalizedType = eventType.toLowerCase().trim();
    
    switch (normalizedType) {
      case 'sourced':
        return SupplyChainEventType.SOURCED;
      case 'manufactured':
        return SupplyChainEventType.MANUFACTURED;
      case 'quality_checked':
      case 'qualitychecked':
        return SupplyChainEventType.QUALITY_CHECKED;
      case 'packaged':
        return SupplyChainEventType.PACKAGED;
      case 'shipped':
        return SupplyChainEventType.SHIPPED;
      case 'delivered':
        return SupplyChainEventType.DELIVERED;
      default:
        logger.warn('Unknown event type, defaulting to MANUFACTURED', { eventType });
        return SupplyChainEventType.MANUFACTURED;
    }
  }

  /**
   * Map BigInt array to number array
   */
  mapBigIntArrayToNumbers(bigIntArray: bigint[]): number[] {
    try {
      return bigIntArray.map(bigInt => Number(bigInt));
    } catch (error: any) {
      logger.error('Failed to map BigInt array to numbers:', error);
      return [];
    }
  }

  /**
   * Map string array to SupplyChainEventType array
   */
  mapStringArrayToEventTypes(stringArray: string[]): SupplyChainEventType[] {
    try {
      return stringArray.map(str => this.mapEventType(str));
    } catch (error: any) {
      logger.error('Failed to map string array to event types:', error);
      return [];
    }
  }

  /**
   * Map blockchain response to API response format
   */
  mapToApiResponse<T>(
    data: T,
    success: boolean = true,
    message?: string,
    error?: string
  ): IApiResponse<T> {
    return {
      success,
      data: success ? data : undefined,
      error: success ? undefined : error,
      message
    };
  }

  /**
   * Map array data to paginated response format
   */
  mapToPaginatedResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): IPaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Map raw blockchain data to normalized endpoint array
   */
  mapEndpointsArray(
    endpointIds: bigint[],
    endpointData: Array<{
      name: string;
      eventType: string;
      isActive: boolean;
      location?: string;
      eventCount?: bigint;
      createdAt?: bigint;
    }>
  ): ISupplyChainEndpoint[] {
    try {
      return endpointIds.map((id, index) => 
        this.mapEndpoint(id, endpointData[index])
      );
    } catch (error: any) {
      logger.error('Failed to map endpoints array:', error);
      return [];
    }
  }

  /**
   * Map raw blockchain data to normalized product array
   */
  mapProductsArray(
    productIds: bigint[],
    productData: Array<{
      productId: string;
      name: string;
      isActive: boolean;
      description?: string;
      totalEvents?: bigint;
      createdAt?: bigint;
    }>
  ): ISupplyChainProduct[] {
    try {
      return productIds.map((id, index) => 
        this.mapProduct(id, productData[index])
      );
    } catch (error: any) {
      logger.error('Failed to map products array:', error);
      return [];
    }
  }

  /**
   * Map raw blockchain data to normalized event array
   */
  mapEventsArray(
    eventIds: bigint[],
    eventData: Array<{
      endpointId: bigint;
      productId: string;
      eventData: string;
      timestamp: bigint;
      eventType?: string;
      location?: string;
      details?: string;
      loggedBy?: string;
      isValid?: boolean;
    }>
  ): ISupplyChainEvent[] {
    try {
      return eventIds.map((id, index) => 
        this.mapEvent(id, eventData[index])
      );
    } catch (error: any) {
      logger.error('Failed to map events array:', error);
      return [];
    }
  }

  /**
   * Map hex string to number
   */
  mapHexToNumber(hex: string): number {
    try {
      if (hex.startsWith('0x')) {
        return parseInt(hex, 16);
      }
      return parseInt(hex, 10);
    } catch (error: any) {
      logger.error('Failed to map hex to number:', error);
      return 0;
    }
  }

  /**
   * Map hex string to BigInt
   */
  mapHexToBigInt(hex: string): bigint {
    try {
      if (hex.startsWith('0x')) {
        return BigInt(hex);
      }
      return BigInt(parseInt(hex, 10));
    } catch (error: any) {
      logger.error('Failed to map hex to BigInt:', error);
      return BigInt(0);
    }
  }

  /**
   * Map timestamp to Date
   */
  mapTimestampToDate(timestamp: number | bigint): Date {
    try {
      const numTimestamp = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
      return new Date(numTimestamp * 1000); // Assuming timestamp is in seconds
    } catch (error: any) {
      logger.error('Failed to map timestamp to date:', error);
      return new Date();
    }
  }

  /**
   * Map Date to timestamp
   */
  mapDateToTimestamp(date: Date): number {
    try {
      return Math.floor(date.getTime() / 1000);
    } catch (error: any) {
      logger.error('Failed to map date to timestamp:', error);
      return Math.floor(Date.now() / 1000);
    }
  }

  /**
   * Map boolean to string (for blockchain compatibility)
   */
  mapBooleanToString(bool: boolean): string {
    return bool ? 'true' : 'false';
  }

  /**
   * Map string to boolean (from blockchain response)
   */
  mapStringToBoolean(str: string): boolean {
    return str.toLowerCase() === 'true' || str === '1';
  }

  /**
   * Map array of mixed types to consistent format
   */
  mapMixedArrayToConsistent<T>(
    array: any[],
    mapper: (item: any, index: number) => T
  ): T[] {
    try {
      return array.map((item, index) => mapper(item, index));
    } catch (error: any) {
      logger.error('Failed to map mixed array to consistent format:', error);
      return [];
    }
  }

  /**
   * Map blockchain error to standardized error format
   */
  mapBlockchainError(error: any): {
    code: string;
    message: string;
    statusCode: number;
    details?: any;
  } {
    try {
      return {
        code: error.code || 'BLOCKCHAIN_ERROR',
        message: error.message || 'Unknown blockchain error',
        statusCode: error.statusCode || 500,
        details: error.details || error
      };
    } catch (mappingError: any) {
      logger.error('Failed to map blockchain error:', mappingError);
      return {
        code: 'MAPPING_ERROR',
        message: 'Failed to map blockchain error',
        statusCode: 500,
        details: error
      };
    }
  }

  /**
   * Map validation errors to standardized format
   */
  mapValidationErrors(errors: string[]): {
    valid: boolean;
    errors: string[];
  } {
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Map operation result to standardized format
   */
  mapOperationResult<T>(
    success: boolean,
    data?: T,
    error?: string,
    txHash?: string
  ): {
    success: boolean;
    data?: T;
    error?: string;
    txHash?: string;
  } {
    return {
      success,
      data: success ? data : undefined,
      error: success ? undefined : error,
      txHash
    };
  }
}
