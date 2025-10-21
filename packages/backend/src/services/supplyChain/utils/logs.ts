// src/services/supplyChain/utils/logs.ts
import { logger } from '../../../utils/logger';
import { ITransactionLog } from './types';

// ===== INTERFACES =====

export interface ILogParsingResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface IContractDeploymentLog {
  contractAddress: string;
  businessId: string;
  manufacturerName: string;
  deploymentCost: string;
}

export interface IEndpointCreatedLog {
  endpointId: number;
  name: string;
  eventType: string;
  location: string;
}

export interface IProductRegisteredLog {
  productId: number;
  productIdString: string;
  name: string;
  description: string;
}

export interface IEventLoggedLog {
  eventId: number;
  endpointId: number;
  productId: string;
  eventType: string;
  location: string;
  details: string;
}

// ===== MAIN SERVICE CLASS =====

export class LogParsingService {
  private static instance: LogParsingService;

  private constructor() {}

  public static getInstance(): LogParsingService {
    if (!LogParsingService.instance) {
      LogParsingService.instance = new LogParsingService();
    }
    return LogParsingService.instance;
  }

  /**
   * Extract contract address from transaction logs
   */
  extractContractAddressFromLogs(logs: any[]): string | null {
    try {
      for (const log of logs) {
        if (log.topics && log.topics.length > 0) {
          // Look for contract creation events
          // This is a simplified version - actual implementation depends on your event structure
          if (log.topics[0] === '0x' + 'ContractCreated'.padEnd(64, '0')) {
            // Extract address from log data
            return log.address;
          }
          
          // Alternative: check if log address is a contract (has code)
          if (log.address && log.address !== '0x0000000000000000000000000000000000000000') {
            return log.address;
          }
        }
      }
      
      logger.warn('Contract address not found in transaction logs');
      return null;
    } catch (error: any) {
      logger.error('Failed to extract contract address from logs:', error);
      return null;
    }
  }

  /**
   * Extract endpoint ID from transaction logs
   */
  extractEndpointIdFromLogs(logs: any[]): number | null {
    try {
      for (const log of logs) {
        if (log.topics && log.topics.length > 0) {
          // Look for endpoint creation events
          // This is a simplified version - actual implementation depends on your event structure
          if (log.topics[0] === '0x' + 'EndpointCreated'.padEnd(64, '0')) {
            // Extract endpoint ID from log data
            const data = log.data;
            if (data && data.length >= 66) { // 0x + 64 hex chars
              const endpointIdHex = data.slice(2, 66); // Remove 0x and get first 32 bytes
              return parseInt(endpointIdHex, 16);
            }
          }
        }
      }
      
      logger.warn('Endpoint ID not found in transaction logs');
      return null;
    } catch (error: any) {
      logger.error('Failed to extract endpoint ID from logs:', error);
      return null;
    }
  }

  /**
   * Extract product ID from transaction logs
   */
  extractProductIdFromLogs(logs: any[]): number | null {
    try {
      for (const log of logs) {
        if (log.topics && log.topics.length > 0) {
          // Look for product registration events
          // This is a simplified version - actual implementation depends on your event structure
          if (log.topics[0] === '0x' + 'ProductRegistered'.padEnd(64, '0')) {
            // Extract product ID from log data
            const data = log.data;
            if (data && data.length >= 66) { // 0x + 64 hex chars
              const productIdHex = data.slice(2, 66); // Remove 0x and get first 32 bytes
              return parseInt(productIdHex, 16);
            }
          }
        }
      }
      
      logger.warn('Product ID not found in transaction logs');
      return null;
    } catch (error: any) {
      logger.error('Failed to extract product ID from logs:', error);
      return null;
    }
  }

  /**
   * Extract event ID from transaction logs
   */
  extractEventIdFromLogs(logs: any[]): number | null {
    try {
      for (const log of logs) {
        if (log.topics && log.topics.length > 0) {
          // Look for event logging events
          // This is a simplified version - actual implementation depends on your event structure
          if (log.topics[0] === '0x' + 'EventLogged'.padEnd(64, '0')) {
            // Extract event ID from log data
            const data = log.data;
            if (data && data.length >= 66) { // 0x + 64 hex chars
              const eventIdHex = data.slice(2, 66); // Remove 0x and get first 32 bytes
              return parseInt(eventIdHex, 16);
            }
          }
        }
      }
      
      logger.warn('Event ID not found in transaction logs');
      return null;
    } catch (error: any) {
      logger.error('Failed to extract event ID from logs:', error);
      return null;
    }
  }

  /**
   * Parse contract deployment logs
   */
  parseContractDeploymentLogs(logs: ITransactionLog[]): ILogParsingResult<IContractDeploymentLog> {
    try {
      for (const log of logs) {
        if (log.topics && log.topics.length > 0) {
          // Look for contract deployment events
          if (log.topics[0] === '0x' + 'ContractDeployed'.padEnd(64, '0')) {
            const data = log.data;
            if (data && data.length >= 194) { // 0x + 192 hex chars (3 * 64)
              const contractAddress = log.address;
              const businessIdHex = data.slice(2, 66); // First 32 bytes
              const manufacturerNameHex = data.slice(66, 130); // Second 32 bytes
              const deploymentCostHex = data.slice(130, 194); // Third 32 bytes
              
              return {
                success: true,
                data: {
                  contractAddress,
                  businessId: this.hexToString(businessIdHex),
                  manufacturerName: this.hexToString(manufacturerNameHex),
                  deploymentCost: this.hexToWei(deploymentCostHex)
                }
              };
            }
          }
        }
      }
      
      return {
        success: false,
        error: 'Contract deployment log not found'
      };
    } catch (error: any) {
      logger.error('Failed to parse contract deployment logs:', error);
      return {
        success: false,
        error: `Failed to parse contract deployment logs: ${error.message}`
      };
    }
  }

  /**
   * Parse endpoint creation logs
   */
  parseEndpointCreationLogs(logs: ITransactionLog[]): ILogParsingResult<IEndpointCreatedLog> {
    try {
      for (const log of logs) {
        if (log.topics && log.topics.length > 0) {
          // Look for endpoint creation events
          if (log.topics[0] === '0x' + 'EndpointCreated'.padEnd(64, '0')) {
            const data = log.data;
            if (data && data.length >= 194) { // 0x + 192 hex chars (3 * 64)
              const endpointIdHex = data.slice(2, 66); // First 32 bytes
              const nameHex = data.slice(66, 130); // Second 32 bytes
              const eventTypeHex = data.slice(130, 194); // Third 32 bytes
              
              return {
                success: true,
                data: {
                  endpointId: parseInt(endpointIdHex, 16),
                  name: this.hexToString(nameHex),
                  eventType: this.hexToString(eventTypeHex),
                  location: '' // Would need additional parsing for location
                }
              };
            }
          }
        }
      }
      
      return {
        success: false,
        error: 'Endpoint creation log not found'
      };
    } catch (error: any) {
      logger.error('Failed to parse endpoint creation logs:', error);
      return {
        success: false,
        error: `Failed to parse endpoint creation logs: ${error.message}`
      };
    }
  }

  /**
   * Parse product registration logs
   */
  parseProductRegistrationLogs(logs: ITransactionLog[]): ILogParsingResult<IProductRegisteredLog> {
    try {
      for (const log of logs) {
        if (log.topics && log.topics.length > 0) {
          // Look for product registration events
          if (log.topics[0] === '0x' + 'ProductRegistered'.padEnd(64, '0')) {
            const data = log.data;
            if (data && data.length >= 194) { // 0x + 192 hex chars (3 * 64)
              const productIdHex = data.slice(2, 66); // First 32 bytes
              const productIdStringHex = data.slice(66, 130); // Second 32 bytes
              const nameHex = data.slice(130, 194); // Third 32 bytes
              
              return {
                success: true,
                data: {
                  productId: parseInt(productIdHex, 16),
                  productIdString: this.hexToString(productIdStringHex),
                  name: this.hexToString(nameHex),
                  description: '' // Would need additional parsing for description
                }
              };
            }
          }
        }
      }
      
      return {
        success: false,
        error: 'Product registration log not found'
      };
    } catch (error: any) {
      logger.error('Failed to parse product registration logs:', error);
      return {
        success: false,
        error: `Failed to parse product registration logs: ${error.message}`
      };
    }
  }

  /**
   * Parse event logging logs
   */
  parseEventLoggingLogs(logs: ITransactionLog[]): ILogParsingResult<IEventLoggedLog> {
    try {
      for (const log of logs) {
        if (log.topics && log.topics.length > 0) {
          // Look for event logging events
          if (log.topics[0] === '0x' + 'EventLogged'.padEnd(64, '0')) {
            const data = log.data;
            if (data && data.length >= 194) { // 0x + 192 hex chars (3 * 64)
              const eventIdHex = data.slice(2, 66); // First 32 bytes
              const endpointIdHex = data.slice(66, 130); // Second 32 bytes
              const productIdHex = data.slice(130, 194); // Third 32 bytes
              
              return {
                success: true,
                data: {
                  eventId: parseInt(eventIdHex, 16),
                  endpointId: parseInt(endpointIdHex, 16),
                  productId: this.hexToString(productIdHex),
                  eventType: '', // Would need additional parsing
                  location: '', // Would need additional parsing
                  details: '' // Would need additional parsing
                }
              };
            }
          }
        }
      }
      
      return {
        success: false,
        error: 'Event logging log not found'
      };
    } catch (error: any) {
      logger.error('Failed to parse event logging logs:', error);
      return {
        success: false,
        error: `Failed to parse event logging logs: ${error.message}`
      };
    }
  }

  /**
   * Parse all logs for a transaction
   */
  parseAllLogs(logs: ITransactionLog[]): {
    contractAddress?: string;
    endpointId?: number;
    productId?: number;
    eventId?: number;
    deploymentLog?: IContractDeploymentLog;
    endpointLog?: IEndpointCreatedLog;
    productLog?: IProductRegisteredLog;
    eventLog?: IEventLoggedLog;
  } {
    const result: any = {};

    // Extract basic IDs
    result.contractAddress = this.extractContractAddressFromLogs(logs);
    result.endpointId = this.extractEndpointIdFromLogs(logs);
    result.productId = this.extractProductIdFromLogs(logs);
    result.eventId = this.extractEventIdFromLogs(logs);

    // Parse detailed logs
    const deploymentResult = this.parseContractDeploymentLogs(logs);
    if (deploymentResult.success) {
      result.deploymentLog = deploymentResult.data;
    }

    const endpointResult = this.parseEndpointCreationLogs(logs);
    if (endpointResult.success) {
      result.endpointLog = endpointResult.data;
    }

    const productResult = this.parseProductRegistrationLogs(logs);
    if (productResult.success) {
      result.productLog = productResult.data;
    }

    const eventResult = this.parseEventLoggingLogs(logs);
    if (eventResult.success) {
      result.eventLog = eventResult.data;
    }

    return result;
  }

  /**
   * Convert hex string to string
   */
  private hexToString(hex: string): string {
    try {
      // Remove leading zeros and convert to string
      const cleanHex = hex.replace(/^0+/, '');
      if (cleanHex === '') return '';
      
      const bytes = [];
      for (let i = 0; i < cleanHex.length; i += 2) {
        bytes.push(parseInt(cleanHex.substr(i, 2), 16));
      }
      
      return String.fromCharCode(...bytes).replace(/\0/g, '').trim();
    } catch (error: any) {
      logger.error('Failed to convert hex to string:', error);
      return '';
    }
  }

  /**
   * Convert hex string to Wei
   */
  private hexToWei(hex: string): string {
    try {
      return BigInt('0x' + hex).toString();
    } catch (error: any) {
      logger.error('Failed to convert hex to Wei:', error);
      return '0';
    }
  }

  /**
   * Convert hex string to number
   */
  private hexToNumber(hex: string): number {
    try {
      return parseInt(hex, 16);
    } catch (error: any) {
      logger.error('Failed to convert hex to number:', error);
      return 0;
    }
  }

  /**
   * Validate log format
   */
  validateLogFormat(log: ITransactionLog): boolean {
    try {
      return !!(
        log.address &&
        Array.isArray(log.topics) &&
        typeof log.data === 'string' &&
        log.data.startsWith('0x')
      );
    } catch (error: any) {
      logger.error('Failed to validate log format:', error);
      return false;
    }
  }

  /**
   * Filter logs by event signature
   */
  filterLogsByEventSignature(logs: ITransactionLog[], eventSignature: string): ITransactionLog[] {
    try {
      const normalizedSignature = eventSignature.toLowerCase().startsWith('0x') 
        ? eventSignature.toLowerCase() 
        : '0x' + eventSignature.toLowerCase();
      
      return logs.filter(log => 
        log.topics && 
        log.topics.length > 0 && 
        log.topics[0].toLowerCase() === normalizedSignature
      );
    } catch (error: any) {
      logger.error('Failed to filter logs by event signature:', error);
      return [];
    }
  }

  /**
   * Get log data as decoded parameters
   */
  decodeLogData(log: ITransactionLog, parameterTypes: string[]): any[] {
    try {
      // This is a simplified version - actual implementation would use a proper ABI decoder
      const data = log.data.slice(2); // Remove 0x
      const parameters: any[] = [];
      
      let offset = 0;
      for (const type of parameterTypes) {
        if (offset + 64 <= data.length) {
          const paramData = data.slice(offset, offset + 64);
          
          switch (type) {
            case 'uint256':
              parameters.push(BigInt('0x' + paramData));
              break;
            case 'string':
              parameters.push(this.hexToString(paramData));
              break;
            case 'address':
              parameters.push('0x' + paramData.slice(24)); // Last 20 bytes
              break;
            case 'bool':
              parameters.push(paramData !== '0000000000000000000000000000000000000000000000000000000000000000');
              break;
            default:
              parameters.push('0x' + paramData);
          }
          
          offset += 64;
        }
      }
      
      return parameters;
    } catch (error: any) {
      logger.error('Failed to decode log data:', error);
      return [];
    }
  }
}
