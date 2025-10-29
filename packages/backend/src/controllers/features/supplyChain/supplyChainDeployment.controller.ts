// src/controllers/features/supplyChain/supplyChainDeployment.controller.ts
// Controller exposing supply chain contract deployment operations

import { Response } from 'express';
import { SupplyChainBaseController, SupplyChainBaseRequest } from './supplyChainBase.controller';

interface DeployContractRequest extends SupplyChainBaseRequest {
  validatedBody?: {
    businessId?: string;
    networkId?: string;
    metadata?: Record<string, unknown>;
  };
}

interface DeploymentHistoryRequest extends SupplyChainBaseRequest {
  validatedParams?: {
    businessId?: string;
  };
  validatedQuery?: {
    businessId?: string;
  };
}

/**
 * SupplyChainDeploymentController maps deployment requests to the deployment service.
 */
export class SupplyChainDeploymentController extends SupplyChainBaseController {
  /**
   * Deploy a new supply chain contract for a business.
   */
  async deployContract(req: DeployContractRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_DEPLOY_CONTRACT');

      const businessId = this.requireBusinessId(req);
      const payload = this.sanitizeInput(req.validatedBody ?? (req.body as any) ?? {});

      const deployment = await this.deploymentService.deployContract({
        businessId,
        networkId: this.parseString(payload.networkId),
        metadata: payload.metadata,
      });

      this.logAction(req, 'SUPPLY_CHAIN_DEPLOY_CONTRACT_SUCCESS', {
        businessId,
        contractAddress: deployment.contractAddress,
      });

      return {
        businessId,
        deployment,
      };
    }, res, 'Supply chain contract deployed successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve deployment status for a business.
   */
  async getDeploymentStatus(req: SupplyChainBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_DEPLOYMENT_STATUS');

      const businessId = this.requireBusinessId(req);
      const status = await this.deploymentService.getDeploymentStatus(businessId);

      this.logAction(req, 'SUPPLY_CHAIN_DEPLOYMENT_STATUS_SUCCESS', {
        businessId,
        deployed: status.isDeployed,
      });

      return {
        businessId,
        status,
      };
    }, res, 'Supply chain deployment status retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Validate prerequisites before deploying a contract.
   */
  async validateDeploymentPrerequisites(req: SupplyChainBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_DEPLOYMENT_PREREQS');

      const businessId = this.requireBusinessId(req);
      const prerequisites = await this.deploymentService.validateDeploymentPrerequisites(businessId);

      this.logAction(req, 'SUPPLY_CHAIN_DEPLOYMENT_PREREQS_SUCCESS', {
        businessId,
        ready: prerequisites.isReady,
      });

      return {
        businessId,
        prerequisites,
      };
    }, res, 'Supply chain deployment prerequisites validated successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve deployment history for a business.
   */
  async getDeploymentHistory(req: DeploymentHistoryRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_DEPLOYMENT_HISTORY');

      const businessId = this.requireBusinessId(req);
      const history = await this.deploymentService.getDeploymentHistory(businessId);

      this.logAction(req, 'SUPPLY_CHAIN_DEPLOYMENT_HISTORY_SUCCESS', {
        businessId,
        deployments: history.length,
      });

      return {
        businessId,
        history,
      };
    }, res, 'Supply chain deployment history retrieved successfully', this.getRequestMeta(req));
  }
}

export const supplyChainDeploymentController = new SupplyChainDeploymentController();

