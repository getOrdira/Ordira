// src/services/supplyChain/core/association.service.ts
import { logger } from '../../../utils/logger';
import { createAppError } from '../../../middleware/error.middleware';

// ===== INTERFACES =====

export interface IBusinessContractMapping {
  deployed: boolean;
  contractAddress?: string;
  deployedAt?: Date;
  networkId?: string;
  contractType?: 'supplychain' | 'voting' | 'nft';
}

export interface IContractAssociation {
  businessId: string;
  contractAddress: string;
  contractType: 'supplychain' | 'voting' | 'nft';
  deployedAt: Date;
  networkId: string;
  isActive: boolean;
}

export interface IAssociationResult {
  success: boolean;
  error?: string;
}

// ===== ERROR CLASS =====

class AssociationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'AssociationError';
    this.statusCode = statusCode;
  }
}

// ===== MAIN SERVICE CLASS =====

export class AssociationService {
  private static instance: AssociationService;

  private constructor() {}

  public static getInstance(): AssociationService {
    if (!AssociationService.instance) {
      AssociationService.instance = new AssociationService();
    }
    return AssociationService.instance;
  }

  /**
   * Store business-contract mapping
   */
  async storeBusinessContractMapping(
    businessId: string,
    contractAddress: string,
    contractType: 'supplychain' | 'voting' | 'nft'
  ): Promise<IAssociationResult> {
    try {
      const { BrandSettings } = require('../../../models/brandSettings.model');
      
      const updateData: any = {
        [`web3Settings.${contractType}Contract`]: contractAddress,
        [`${contractType}Settings.contractDeployedAt`]: new Date(),
        [`${contractType}Settings.networkId`]: process.env.CHAIN_ID || '8453'
      };

      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { $set: updateData },
        { upsert: true }
      );

      logger.info('Business contract mapping stored successfully', {
        businessId,
        contractAddress,
        contractType
      });

      return { success: true };

    } catch (error: any) {
      logger.error('Failed to store business contract mapping:', error);
      return {
        success: false,
        error: `Failed to store business contract mapping: ${error.message}`
      };
    }
  }

  /**
   * Get business-contract mapping
   */
  async getBusinessContractMapping(
    businessId: string,
    contractType: 'supplychain' | 'voting' | 'nft'
  ): Promise<IBusinessContractMapping> {
    try {
      const { BrandSettings } = require('../../../models/brandSettings.model');
      
      const brandSettings = await BrandSettings.findOne({ business: businessId });
      
      if (!brandSettings) {
        return { deployed: false };
      }

      const contractAddress = brandSettings.web3Settings?.[`${contractType}Contract`];
      const deployedAt = brandSettings[`${contractType}Settings`]?.contractDeployedAt;
      const networkId = brandSettings[`${contractType}Settings`]?.networkId;

      return {
        deployed: !!contractAddress,
        contractAddress,
        deployedAt,
        networkId
      };

    } catch (error: any) {
      logger.error('Failed to get business contract mapping:', error);
      throw new AssociationError(`Failed to get business contract mapping: ${error.message}`, 500);
    }
  }

  /**
   * Validate business-contract association
   */
  async validateBusinessContractAssociation(
    contractAddress: string,
    businessId: string,
    contractType: 'supplychain' | 'voting' | 'nft' = 'supplychain'
  ): Promise<void> {
    try {
      const mapping = await this.getBusinessContractMapping(businessId, contractType);
      
      if (!mapping.deployed) {
        throw new AssociationError(`No ${contractType} contract deployed for this business`, 404);
      }

      if (mapping.contractAddress !== contractAddress) {
        throw new AssociationError('Contract address does not match business association', 403);
      }

    } catch (error: any) {
      if (error instanceof AssociationError) {
        throw error;
      }
      throw new AssociationError(`Failed to validate contract association: ${error.message}`, 500);
    }
  }

  /**
   * Remove business-contract association
   */
  async removeBusinessContractMapping(
    businessId: string,
    contractType: 'supplychain' | 'voting' | 'nft'
  ): Promise<IAssociationResult> {
    try {
      const { BrandSettings } = require('../../../models/brandSettings.model');
      
      const unsetData: any = {
        [`web3Settings.${contractType}Contract`]: '',
        [`${contractType}Settings.contractDeployedAt`]: '',
        [`${contractType}Settings.networkId`]: ''
      };

      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { $unset: unsetData }
      );

      logger.info('Business contract mapping removed successfully', {
        businessId,
        contractType
      });

      return { success: true };

    } catch (error: any) {
      logger.error('Failed to remove business contract mapping:', error);
      return {
        success: false,
        error: `Failed to remove business contract mapping: ${error.message}`
      };
    }
  }

  /**
   * Get all contract associations for a business
   */
  async getAllBusinessContractMappings(businessId: string): Promise<IContractAssociation[]> {
    try {
      const { BrandSettings } = require('../../../models/brandSettings.model');
      
      const brandSettings = await BrandSettings.findOne({ business: businessId });
      
      if (!brandSettings) {
        return [];
      }

      const associations: IContractAssociation[] = [];
      const contractTypes: ('supplychain' | 'voting' | 'nft')[] = ['supplychain', 'voting', 'nft'];

      for (const contractType of contractTypes) {
        const contractAddress = brandSettings.web3Settings?.[`${contractType}Contract`];
        const deployedAt = brandSettings[`${contractType}Settings`]?.contractDeployedAt;
        const networkId = brandSettings[`${contractType}Settings`]?.networkId;

        if (contractAddress) {
          associations.push({
            businessId,
            contractAddress,
            contractType,
            deployedAt: deployedAt || new Date(),
            networkId: networkId || process.env.CHAIN_ID || '8453',
            isActive: true
          });
        }
      }

      return associations;

    } catch (error: any) {
      logger.error('Failed to get all business contract mappings:', error);
      throw new AssociationError(`Failed to get all business contract mappings: ${error.message}`, 500);
    }
  }

  /**
   * Update contract association status
   */
  async updateContractAssociationStatus(
    businessId: string,
    contractAddress: string,
    contractType: 'supplychain' | 'voting' | 'nft',
    isActive: boolean
  ): Promise<IAssociationResult> {
    try {
      // First validate the association exists
      await this.validateBusinessContractAssociation(contractAddress, businessId, contractType);

      const { BrandSettings } = require('../../../models/brandSettings.model');
      
      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { 
          $set: { 
            [`${contractType}Settings.isActive`]: isActive,
            [`${contractType}Settings.lastStatusUpdate`]: new Date()
          }
        }
      );

      logger.info('Contract association status updated successfully', {
        businessId,
        contractAddress,
        contractType,
        isActive
      });

      return { success: true };

    } catch (error: any) {
      logger.error('Failed to update contract association status:', error);
      return {
        success: false,
        error: `Failed to update contract association status: ${error.message}`
      };
    }
  }

  /**
   * Get contract statistics for a business
   */
  async getContractStatistics(businessId: string): Promise<{
    totalContracts: number;
    activeContracts: number;
    contractTypes: {
      supplychain: boolean;
      voting: boolean;
      nft: boolean;
    };
    lastDeployment?: Date;
  }> {
    try {
      const associations = await this.getAllBusinessContractMappings(businessId);
      
      const contractTypes = {
        supplychain: associations.some(a => a.contractType === 'supplychain'),
        voting: associations.some(a => a.contractType === 'voting'),
        nft: associations.some(a => a.contractType === 'nft')
      };

      const activeContracts = associations.filter(a => a.isActive).length;
      const lastDeployment = associations.length > 0 
        ? new Date(Math.max(...associations.map(a => a.deployedAt.getTime())))
        : undefined;

      return {
        totalContracts: associations.length,
        activeContracts,
        contractTypes,
        lastDeployment
      };

    } catch (error: any) {
      logger.error('Failed to get contract statistics:', error);
      throw new AssociationError(`Failed to get contract statistics: ${error.message}`, 500);
    }
  }

  /**
   * Validate business exists and is active
   */
  async validateBusinessExists(businessId: string): Promise<boolean> {
    try {
      const { BrandSettings } = require('../../../models/brandSettings.model');
      
      const brandSettings = await BrandSettings.findOne({ business: businessId });
      return !!brandSettings;

    } catch (error: any) {
      logger.error('Failed to validate business exists:', error);
      return false;
    }
  }

  /**
   * Get businesses by contract address
   */
  async getBusinessesByContractAddress(contractAddress: string): Promise<string[]> {
    try {
      const { BrandSettings } = require('../../../models/brandSettings.model');
      
      const brandSettings = await BrandSettings.find({
        $or: [
          { 'web3Settings.supplyChainContract': contractAddress },
          { 'web3Settings.votingContract': contractAddress },
          { 'web3Settings.nftContract': contractAddress }
        ]
      });

      return brandSettings.map(bs => bs.business);

    } catch (error: any) {
      logger.error('Failed to get businesses by contract address:', error);
      throw new AssociationError(`Failed to get businesses by contract address: ${error.message}`, 500);
    }
  }
}
