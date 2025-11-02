import { createAppError } from '../../../middleware/deprecated/error.middleware';
import { BrandSettings } from '../../../models/brands/brandSettings.model';
import { logger } from '../../../utils/logger';
import { VotingService as BlockchainVotingService } from '../../blockchain/voting.service';
import { enhancedCacheService } from '../../external/enhanced-cache.service';
import { getVotingCacheTags } from '../utils/cache';
import { votingValidationService } from '../validation/votingValidation.service';

/**
 * Interface for contract deployment result
 */
export interface DeployContractResult {
  votingAddress: string;
  txHash: string;
  blockNumber?: number;
  gasUsed?: string;
  deploymentCost?: string;
}

/**
 * Interface for voting contract settings
 */
export interface VotingContractSettings {
  votingDelay?: number; // Delay before voting starts (in blocks)
  votingPeriod?: number; // Duration of voting period (in blocks)
  quorumPercentage?: number; // Minimum quorum percentage required
}

/**
 * Service for deploying and managing voting contracts
 */
export class VotingContractDeploymentService {
  /**
   * Deploy a new voting contract for a business
   */
  async deployVotingContract(
    businessId: string,
    settings: VotingContractSettings = {}
  ): Promise<DeployContractResult> {
    const validatedBusinessId = votingValidationService.ensureBusinessId(businessId);

    // Check if contract already exists
    const existingSettings = await BrandSettings.findOne({ business: validatedBusinessId });
    if (existingSettings?.web3Settings?.voteContract) {
      throw createAppError(
        'Voting contract already deployed for this business',
        400,
        'CONTRACT_EXISTS'
      );
    }

    logger.info('Deploying voting contract', {
      businessId: validatedBusinessId,
      settings
    });

    try {
      // Deploy contract via blockchain service
      const deployment = await BlockchainVotingService.deployVotingContract(
        validatedBusinessId,
        settings
      );

      // Store contract address in brand settings
      if (existingSettings) {
        existingSettings.web3Settings = {
          ...existingSettings.web3Settings,
          voteContract: deployment.address
        };
        await existingSettings.save();
      } else {
        await BrandSettings.create({
          business: validatedBusinessId,
          web3Settings: {
            voteContract: deployment.address
          }
        });
      }

      logger.info('Voting contract deployed successfully', {
        businessId: validatedBusinessId,
        contractAddress: deployment.address,
        txHash: deployment.txHash
      });

      // Clear caches
      await this.clearCaches(validatedBusinessId);

      return {
        votingAddress: deployment.address,
        txHash: deployment.txHash,
        blockNumber: deployment.blockNumber,
        gasUsed: deployment.gasUsed?.toString()
      };
    } catch (error: any) {
      logger.error('Failed to deploy voting contract', {
        businessId: validatedBusinessId,
        error: error.message,
        stack: error.stack
      });

      if (error.code === 'CONTRACT_EXISTS') {
        throw error;
      }

      throw createAppError(
        `Failed to deploy voting contract: ${error.message}`,
        500,
        'DEPLOYMENT_FAILED'
      );
    }
  }

  /**
   * Get the voting contract address for a business
   */
  async getVotingContractAddress(businessId: string): Promise<string | undefined> {
    const validatedBusinessId = votingValidationService.ensureBusinessId(businessId);

    const settings = await BrandSettings.findOne({ business: validatedBusinessId }).lean();
    return settings?.web3Settings?.voteContract;
  }

  /**
   * Verify that a voting contract exists for a business
   */
  async verifyContractExists(businessId: string): Promise<boolean> {
    const address = await this.getVotingContractAddress(businessId);
    return !!address;
  }

  /**
   * Get contract deployment information
   */
  async getContractDeploymentInfo(businessId: string): Promise<{
    contractAddress: string | undefined;
    isDeployed: boolean;
    deployedAt?: Date;
  }> {
    const validatedBusinessId = votingValidationService.ensureBusinessId(businessId);

    const settings = await BrandSettings.findOne({ business: validatedBusinessId });
    const contractAddress = settings?.web3Settings?.voteContract;

    return {
      contractAddress,
      isDeployed: !!contractAddress,
      deployedAt: contractAddress ? settings?.updatedAt : undefined
    };
  }

  /**
   * Update voting contract settings (for future contract upgrades)
   */
  async updateContractSettings(
    businessId: string,
    contractAddress: string,
    settings: VotingContractSettings
  ): Promise<void> {
    const validatedBusinessId = votingValidationService.ensureBusinessId(businessId);

    // Verify ownership
    const brandSettings = await BrandSettings.findOne({ business: validatedBusinessId });
    if (!brandSettings?.web3Settings?.voteContract) {
      throw createAppError('No voting contract found for this business', 404, 'NO_CONTRACT');
    }

    if (brandSettings.web3Settings.voteContract !== contractAddress) {
      throw createAppError('Contract address does not match business', 403, 'INVALID_CONTRACT');
    }

    logger.info('Updating voting contract settings', {
      businessId: validatedBusinessId,
      contractAddress,
      settings
    });

    // Note: Actual on-chain updates would require contract upgrade mechanism
    // For now, we just log the intent
    logger.warn('Contract settings update requested but not implemented on-chain', {
      businessId: validatedBusinessId,
      contractAddress,
      settings
    });

    await this.clearCaches(validatedBusinessId);
  }

  /**
   * Clear all contract-related caches
   */
  private async clearCaches(businessId: string): Promise<void> {
    await enhancedCacheService.invalidateByTags(getVotingCacheTags(businessId));
  }
}

export const votingContractDeploymentService = new VotingContractDeploymentService();


