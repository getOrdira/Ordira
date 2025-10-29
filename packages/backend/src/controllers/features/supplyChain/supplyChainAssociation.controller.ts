// src/controllers/features/supplyChain/supplyChainAssociation.controller.ts
// Controller exposing supply chain association operations

import { Response } from 'express';
import { SupplyChainBaseController, SupplyChainBaseRequest } from './supplyChainBase.controller';
import type { IAssociationResult, IContractAssociation } from '../../../services/supplyChain/core/association.service';

type ContractType = 'supplychain' | 'voting' | 'nft';

interface AssociationRequest extends SupplyChainBaseRequest {
  validatedBody?: {
    businessId?: string;
    contractAddress?: string;
    contractType?: ContractType;
    isActive?: boolean;
  };
  validatedParams?: {
    businessId?: string;
    contractAddress?: string;
    contractType?: ContractType;
  };
  validatedQuery?: {
    businessId?: string;
    contractType?: ContractType;
    contractAddress?: string;
  };
}

/**
 * SupplyChainAssociationController maps association requests to the association service.
 */
export class SupplyChainAssociationController extends SupplyChainBaseController {
  /**
   * Store a mapping between business and contract.
   */
  async storeBusinessContractMapping(req: AssociationRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_ASSOC_STORE_MAPPING');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress({
        ...req,
        validatedParams: {
          contractAddress: req.validatedBody?.contractAddress ?? req.validatedParams?.contractAddress,
        },
        validatedBody: req.validatedBody,
        validatedQuery: req.validatedQuery,
      } as any);

      const contractType = this.parseContractType(
        req.validatedBody?.contractType ?? req.validatedParams?.contractType,
      );

      if (!contractType) {
        throw { statusCode: 400, message: 'Contract type is required to store mapping' };
      }

      const result: IAssociationResult = await this.associationService.storeBusinessContractMapping(
        businessId,
        contractAddress,
        contractType,
      );

      this.logAction(req, 'SUPPLY_CHAIN_ASSOC_STORE_MAPPING_SUCCESS', {
        businessId,
        contractAddress,
        contractType,
        success: result.success,
      });

      return {
        businessId,
        contractAddress,
        contractType,
        result,
      };
    }, res, 'Business contract mapping stored successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve mapping details for a business and contract type.
   */
  async getBusinessContractMapping(req: AssociationRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_ASSOC_GET_MAPPING');

      const businessId = this.requireBusinessId(req);
      const contractType = this.parseContractType(
        req.validatedParams?.contractType ??
          req.validatedQuery?.contractType ??
          req.validatedBody?.contractType,
      );

      if (!contractType) {
        throw { statusCode: 400, message: 'Contract type is required to retrieve mapping' };
      }

      const mapping = await this.associationService.getBusinessContractMapping(businessId, contractType);

      this.logAction(req, 'SUPPLY_CHAIN_ASSOC_GET_MAPPING_SUCCESS', {
        businessId,
        contractType,
        deployed: mapping.deployed,
      });

      return {
        businessId,
        contractType,
        mapping,
      };
    }, res, 'Business contract mapping retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve all contract associations for a business.
   */
  async getAllBusinessContractMappings(req: SupplyChainBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_ASSOC_GET_ALL');

      const businessId = this.requireBusinessId(req);
      const mappings: IContractAssociation[] = await this.associationService.getAllBusinessContractMappings(
        businessId,
      );

      this.logAction(req, 'SUPPLY_CHAIN_ASSOC_GET_ALL_SUCCESS', {
        businessId,
        total: mappings.length,
      });

      return {
        businessId,
        mappings,
      };
    }, res, 'Business contract associations retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Validate a business has a contract association.
   */
  async validateBusinessContractAssociation(req: AssociationRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_ASSOC_VALIDATE');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const contractType = this.parseContractType(
        req.validatedParams?.contractType ?? req.validatedBody?.contractType ?? req.validatedQuery?.contractType,
      );

      if (!contractType) {
        throw { statusCode: 400, message: 'Contract type is required to validate association' };
      }

      await this.associationService.validateBusinessContractAssociation(contractAddress, businessId, contractType);

      this.logAction(req, 'SUPPLY_CHAIN_ASSOC_VALIDATE_SUCCESS', {
        businessId,
        contractAddress,
        contractType,
      });

      return {
        businessId,
        contractAddress,
        contractType,
        valid: true,
      };
    }, res, 'Business contract association validated successfully', this.getRequestMeta(req));
  }

  /**
   * Update contract association status.
   */
  async updateContractAssociationStatus(req: AssociationRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_ASSOC_UPDATE_STATUS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const contractType = this.parseContractType(
        req.validatedBody?.contractType ?? req.validatedParams?.contractType,
      );

      if (!contractType) {
        throw { statusCode: 400, message: 'Contract type is required to update association status' };
      }

      const isActive =
        req.validatedBody?.isActive ??
        this.parseOptionalBoolean((req.body as any)?.isActive) ??
        true;

      const result = await this.associationService.updateContractAssociationStatus(
        businessId,
        contractAddress,
        contractType,
        isActive,
      );

      this.logAction(req, 'SUPPLY_CHAIN_ASSOC_UPDATE_STATUS_SUCCESS', {
        businessId,
        contractAddress,
        contractType,
        isActive,
      });

      return {
        businessId,
        contractAddress,
        contractType,
        result,
      };
    }, res, 'Contract association status updated successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve contract statistics for a business.
   */
  async getContractStatistics(req: SupplyChainBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_ASSOC_STATS');

      const businessId = this.requireBusinessId(req);
      const stats = await this.associationService.getContractStatistics(businessId);

      this.logAction(req, 'SUPPLY_CHAIN_ASSOC_STATS_SUCCESS', {
        businessId,
        totalContracts: stats.totalContracts,
        activeContracts: stats.activeContracts,
      });

      return {
        businessId,
        stats,
      };
    }, res, 'Supply chain contract statistics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Validate business existence.
   */
  async validateBusinessExists(req: SupplyChainBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_ASSOC_BUSINESS_EXISTS');

      const businessId = this.requireBusinessId(req);
      const exists = await this.associationService.validateBusinessExists(businessId);

      this.logAction(req, 'SUPPLY_CHAIN_ASSOC_BUSINESS_EXISTS_SUCCESS', {
        businessId,
        exists,
      });

      return {
        businessId,
        exists,
      };
    }, res, 'Business existence validated successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve businesses associated with a contract address.
   */
  async getBusinessesByContractAddress(req: AssociationRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_ASSOC_BUSINESSES_BY_CONTRACT');

      const contractAddress = this.requireContractAddress(req);
      const businesses = await this.associationService.getBusinessesByContractAddress(contractAddress);

      this.logAction(req, 'SUPPLY_CHAIN_ASSOC_BUSINESSES_BY_CONTRACT_SUCCESS', {
        contractAddress,
        count: businesses.length,
      });

      return {
        contractAddress,
        businesses,
      };
    }, res, 'Businesses associated with contract address retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Helper to validate contract type inputs.
   */
  private parseContractType(value: unknown): ContractType | undefined {
    const normalized = this.parseString(value);
    if (!normalized) {
      return undefined;
    }
    if (['supplychain', 'voting', 'nft'].includes(normalized)) {
      return normalized as ContractType;
    }
    return undefined;
  }
}

export const supplyChainAssociationController = new SupplyChainAssociationController();

