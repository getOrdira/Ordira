// src/controllers/features/votes/votesDeployment.controller.ts
// Controller exposing voting contract deployment operations

import { Response } from 'express';
import { VotesBaseController, VotesBaseRequest } from './votesBase.controller';
import type { VotingContractSettings } from '../../../services/votes/features/votingContractDeployment.service';

interface DeployContractRequest extends VotesBaseRequest {
  validatedParams?: {
    businessId?: string;
  };
  validatedBody?: VotingContractSettings & {
    businessId?: string;
  };
}

interface ContractSettingsRequest extends VotesBaseRequest {
  validatedParams?: {
    businessId?: string;
  };
  validatedBody?: VotingContractSettings & {
    contractAddress?: string;
  };
  validatedQuery?: {
    contractAddress?: string;
  };
}

/**
 * VotesDeploymentController maps HTTP requests to contract deployment service.
 */
export class VotesDeploymentController extends VotesBaseController {
  /**
   * Deploy a new voting contract for a business.
   */
  async deployVotingContract(req: DeployContractRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_CONTRACT_DEPLOY');

      const businessId = this.requireBusinessId(req);
      const body = this.sanitizeInput(req.validatedBody ?? (req.body as any) ?? {}) as VotingContractSettings;

      const settings: VotingContractSettings = {
        votingDelay: this.parseOptionalNumber(body.votingDelay, { min: 0 }),
        votingPeriod: this.parseOptionalNumber(body.votingPeriod, { min: 1 }),
        quorumPercentage: this.parseOptionalNumber(body.quorumPercentage, { min: 0, max: 100 }),
      };

      const deployment = await this.votingContractDeploymentService.deployVotingContract(
        businessId,
        settings,
      );

      this.logAction(req, 'VOTING_CONTRACT_DEPLOY_SUCCESS', {
        businessId,
        contractAddress: deployment.votingAddress,
      });

      return {
        businessId,
        deployment,
      };
    }, res, 'Voting contract deployed successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve the deployed voting contract address for a business.
   */
  async getVotingContractAddress(req: VotesBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_CONTRACT_ADDRESS_GET');

      const businessId = this.requireBusinessId(req);
      const contractAddress = await this.votingContractDeploymentService.getVotingContractAddress(businessId);

      this.logAction(req, 'VOTING_CONTRACT_ADDRESS_GET_SUCCESS', {
        businessId,
        hasContract: Boolean(contractAddress),
      });

      return {
        businessId,
        contractAddress: contractAddress ?? null,
      };
    }, res, 'Voting contract address retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Verify whether a business has a contract deployed.
   */
  async verifyVotingContract(req: VotesBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_CONTRACT_VERIFY');

      const businessId = this.requireBusinessId(req);
      const exists = await this.votingContractDeploymentService.verifyContractExists(businessId);

      this.logAction(req, 'VOTING_CONTRACT_VERIFY_SUCCESS', {
        businessId,
        exists,
      });

      return {
        businessId,
        exists,
      };
    }, res, 'Voting contract verification completed', this.getRequestMeta(req));
  }

  /**
   * Retrieve contract deployment information for a business.
   */
  async getContractDeploymentInfo(req: VotesBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_CONTRACT_INFO_GET');

      const businessId = this.requireBusinessId(req);
      const info = await this.votingContractDeploymentService.getContractDeploymentInfo(businessId);

      this.logAction(req, 'VOTING_CONTRACT_INFO_GET_SUCCESS', {
        businessId,
        contractAddress: info.contractAddress,
      });

      return {
        businessId,
        info,
      };
    }, res, 'Voting contract info retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Update contract settings (metadata tracking only).
   */
  async updateContractSettings(req: ContractSettingsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_CONTRACT_SETTINGS_UPDATE');

      const businessId = this.requireBusinessId(req);
      const body = this.sanitizeInput(req.validatedBody ?? (req.body as any) ?? {});
      const contractAddress =
        this.parseString(body.contractAddress) ??
        req.validatedQuery?.contractAddress ??
        this.parseString((req.query as any)?.contractAddress);

      if (!contractAddress) {
        throw { statusCode: 400, message: 'Contract address is required to update settings' };
      }

      const settings: VotingContractSettings = {
        votingDelay: this.parseOptionalNumber(body.votingDelay, { min: 0 }),
        votingPeriod: this.parseOptionalNumber(body.votingPeriod, { min: 1 }),
        quorumPercentage: this.parseOptionalNumber(body.quorumPercentage, { min: 0, max: 100 }),
      };

      await this.votingContractDeploymentService.updateContractSettings(
        businessId,
        contractAddress,
        settings,
      );

      this.logAction(req, 'VOTING_CONTRACT_SETTINGS_UPDATE_SUCCESS', {
        businessId,
        contractAddress,
      });

      return {
        businessId,
        contractAddress,
        updated: true,
        updatedAt: new Date().toISOString(),
      };
    }, res, 'Voting contract settings update recorded successfully', this.getRequestMeta(req));
  }
}

export const votesDeploymentController = new VotesDeploymentController();
