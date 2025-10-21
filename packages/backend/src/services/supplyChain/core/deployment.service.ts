// src/services/supplyChain/core/deployment.service.ts
import { BlockchainProviderService } from '../../blockchain/provider.service';
import { logger } from '../../../utils/logger';
import { createAppError } from '../../../middleware/error.middleware';
import { SupplyChainValidationService } from '../validation/supplyChainValidation.service';
import { AssociationService } from './association.service';
import { LogParsingService } from '../utils/logs';

import supplyChainFactoryAbi from '../../../abi/supplyChainFactoryAbi.json';

// ===== INTERFACES =====

export interface ISupplyChainDeployment {
  contractAddress: string;
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  deploymentCost: string;
  businessId: string;
  manufacturerName: string;
}

export interface IDeploymentOptions {
  gasLimit?: bigint;
  gasPrice?: string;
  value?: string;
}

export interface IDeploymentResult {
  deployment: ISupplyChainDeployment;
  success: boolean;
  error?: string;
}

// ===== ERROR CLASS =====

class DeploymentError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'DeploymentError';
    this.statusCode = statusCode;
  }
}

// ===== MAIN SERVICE CLASS =====

export class DeploymentService {
  private static instance: DeploymentService;
  private validationService: SupplyChainValidationService;
  private associationService: AssociationService;
  private logParsingService: LogParsingService;

  private constructor() {
    this.validationService = SupplyChainValidationService.getInstance();
    this.associationService = AssociationService.getInstance();
    this.logParsingService = LogParsingService.getInstance();
  }

  public static getInstance(): DeploymentService {
    if (!DeploymentService.instance) {
      DeploymentService.instance = new DeploymentService();
    }
    return DeploymentService.instance;
  }

  /**
   * Get the SupplyChain factory contract
   */
  private async getSupplyChainFactoryContract() {
    const { FactorySettings } = require('../../../models/factorySettings.model');
    const factorySettings = await FactorySettings.findOne({ type: 'supplychain' });

    if (!factorySettings?.address) {
      throw new DeploymentError('SupplyChain factory not deployed. Please deploy factory first.', 500);
    }

    return BlockchainProviderService.getContract(factorySettings.address, supplyChainFactoryAbi);
  }

  /**
   * Deploy a new SupplyChain contract for a business
   */
  async deployContract(
    businessId: string,
    manufacturerName: string,
    options: IDeploymentOptions = {}
  ): Promise<IDeploymentResult> {
    try {
      // Validate input parameters
      await this.validationService.validateDeploymentInput({
        businessId,
        manufacturerName
      });

      // Get factory contract
      const factoryContract = await this.getSupplyChainFactoryContract();

      // Estimate gas for deployment
      const gasEstimate = await this.estimateDeploymentGas(
        factoryContract,
        businessId,
        manufacturerName,
        options.value || '10000000000000000'
      );

      // Deploy contract
      const tx = await this.executeDeployment(
        factoryContract,
        businessId,
        manufacturerName,
        {
          value: options.value || '10000000000000000', // 0.01 ETH
          gasLimit: options.gasLimit || gasEstimate * BigInt(2) // Add buffer
        }
      );

      // Wait for transaction confirmation
      const receipt = await BlockchainProviderService.waitForTransaction(tx.hash);
      
      if (!receipt) {
        throw new DeploymentError('Transaction receipt not found', 500);
      }

      // Extract contract address from logs
      const contractAddress = this.logParsingService.extractContractAddressFromLogs([...receipt.logs]);
      
      if (!contractAddress) {
        throw new DeploymentError('Contract address not found in transaction logs', 500);
      }

      // Store business-contract mapping
      await this.associationService.storeBusinessContractMapping(
        businessId,
        contractAddress,
        'supplychain'
      );

      const deployment: ISupplyChainDeployment = {
        contractAddress,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        deploymentCost: options.value || '10000000000000000', // 0.01 ETH
        businessId,
        manufacturerName
      };

      logger.info('SupplyChain contract deployed successfully', {
        businessId,
        contractAddress,
        txHash: tx.hash,
        gasUsed: receipt.gasUsed.toString()
      });

      return {
        deployment,
        success: true
      };

    } catch (error: any) {
      logger.error('Deploy SupplyChain contract error:', error);
      
      if (error instanceof DeploymentError) {
        throw error;
      }

      // Handle blockchain errors
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new DeploymentError('Insufficient funds for contract deployment', 400);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new DeploymentError('Blockchain network error during deployment', 503);
      }

      throw new DeploymentError(`Failed to deploy SupplyChain contract: ${error.message}`, 500);
    }
  }

  /**
   * Estimate gas for contract deployment
   */
  private async estimateDeploymentGas(
    factoryContract: any,
    businessId: string,
    manufacturerName: string,
    value: string
  ): Promise<bigint> {
    try {
      return await (factoryContract as unknown as { 
        estimateGas: { 
          deploySupplyChain: (args: [string, string], options: { value: string }) => Promise<bigint> 
        } 
      }).estimateGas.deploySupplyChain(
        [businessId, manufacturerName],
        { value }
      );
    } catch (error: any) {
      logger.warn('Gas estimation failed, using default', { error: error.message });
      return BigInt(2000000); // Default gas limit
    }
  }

  /**
   * Execute contract deployment transaction
   */
  private async executeDeployment(
    factoryContract: any,
    businessId: string,
    manufacturerName: string,
    options: { value: string; gasLimit: bigint }
  ): Promise<{ hash: string }> {
    return await (factoryContract as unknown as { 
      write: { 
        deploySupplyChain: (args: [string, string], options: { value: string; gasLimit: bigint }) => Promise<{ hash: string }> 
      } 
    }).write.deploySupplyChain(
      [businessId, manufacturerName],
      options
    );
  }

  /**
   * Get deployment status for a business
   */
  async getDeploymentStatus(businessId: string): Promise<{
    deployed: boolean;
    contractAddress?: string;
    deployedAt?: Date;
    networkId?: string;
  }> {
    try {
      return await this.associationService.getBusinessContractMapping(businessId, 'supplychain');
    } catch (error: any) {
      logger.error('Failed to get deployment status:', error);
      throw new DeploymentError(`Failed to get deployment status: ${error.message}`, 500);
    }
  }

  /**
   * Validate deployment prerequisites
   */
  async validateDeploymentPrerequisites(businessId: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Check if factory is deployed
      const factoryContract = await this.getSupplyChainFactoryContract();
      if (!factoryContract) {
        errors.push('SupplyChain factory not deployed');
      }

      // Check if business already has a contract
      const existingDeployment = await this.getDeploymentStatus(businessId);
      if (existingDeployment.deployed) {
        errors.push('Business already has a deployed SupplyChain contract');
      }

      // Validate business exists and is active
      const { BrandSettings } = require('../../../models/brandSettings.model');
      const brandSettings = await BrandSettings.findOne({ business: businessId });
      if (!brandSettings) {
        errors.push('Business not found');
      }

      return {
        valid: errors.length === 0,
        errors
      };

    } catch (error: any) {
      logger.error('Deployment prerequisites validation failed:', error);
      return {
        valid: false,
        errors: [`Validation failed: ${error.message}`]
      };
    }
  }

  /**
   * Get deployment history for a business
   */
  async getDeploymentHistory(businessId: string): Promise<ISupplyChainDeployment[]> {
    try {
      // This would typically query a deployment history table
      // For now, return current deployment if exists
      const currentDeployment = await this.getDeploymentStatus(businessId);
      
      if (currentDeployment.deployed && currentDeployment.contractAddress) {
        return [{
          contractAddress: currentDeployment.contractAddress,
          txHash: '', // Would be stored in deployment history
          blockNumber: 0,
          gasUsed: '',
          deploymentCost: '',
          businessId,
          manufacturerName: '' // Would be stored in deployment history
        }];
      }

      return [];

    } catch (error: any) {
      logger.error('Failed to get deployment history:', error);
      throw new DeploymentError(`Failed to get deployment history: ${error.message}`, 500);
    }
  }
}
