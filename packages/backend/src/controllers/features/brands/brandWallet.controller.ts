// src/controllers/features/brands/brandWallet.controller.ts
// Brand wallet controller using modular brand services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { getBrandsServices } from '../../../services/container/container.getters';  

/**
 * Brand wallet request interfaces
 */
interface ValidateWalletRequest extends BaseRequest {
  validatedBody: {
    address: string;
    options?: {
      checkBalance?: boolean;
      validateFormat?: boolean;
    };
  };
}

interface VerifyWalletOwnershipRequest extends BaseRequest {
  validatedBody: {
    walletAddress: string;
    signature: string;
    message: string;
  };
}

interface UpdateTokenDiscountsRequest extends BaseRequest {
  validatedBody: {
    walletAddress: string;
    discounts: Array<{
      tokenAddress: string;
      discountPercentage: number;
      minAmount?: number;
    }>;
  };
}

interface UpdateCertificateWalletRequest extends BaseRequest {
  validatedBody: {
    walletAddress: string;
    isDefault?: boolean;
    metadata?: Record<string, any>;
  };
}

interface BatchUpdateTokenDiscountsRequest extends BaseRequest {
  validatedBody: {
    businessIds: string[];
    discounts: Array<{
      tokenAddress: string;
      discountPercentage: number;
      minAmount?: number;
    }>;
  };
}

interface HandleWalletAddressChangeRequest extends BaseRequest {
  validatedBody: {
    newWallet: string;
    oldWallet: string;
    signature: string;
  };
}

interface GenerateVerificationMessageRequest extends BaseRequest {
  validatedBody: {
    timestamp?: number;
  };
}

/**
 * Brand wallet controller
 */
export class BrandWalletController extends BaseController {
  private brandServices = getBrandsServices();

  /**
   * Validate wallet address with comprehensive checks
   */
  async validateWalletAddress(req: ValidateWalletRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'VALIDATE_WALLET_ADDRESS');

        const options = {
          businessId: req.businessId,
          checkOwnership: req.validatedBody.options?.checkBalance || false
        };

        const result = await this.brandServices.wallet.validateWalletAddress(
          req.validatedBody.address,
          options
        );
        
        this.logAction(req, 'VALIDATE_WALLET_ADDRESS_SUCCESS', {
          businessId: req.businessId,
          address: req.validatedBody.address,
          valid: result.valid,
          verified: result.verified
        });

        return { result };
      });
    }, res, 'Wallet address validated', this.getRequestMeta(req));
  }

  /**
   * Verify wallet ownership through signature
   */
  async verifyWalletOwnership(req: VerifyWalletOwnershipRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'VERIFY_WALLET_OWNERSHIP');

        const result = await this.brandServices.wallet.verifyWalletOwnership(
          req.businessId!,
          req.validatedBody.walletAddress,
          req.validatedBody.signature,
          req.validatedBody.message
        );
        
        this.logAction(req, 'VERIFY_WALLET_OWNERSHIP_SUCCESS', {
          businessId: req.businessId,
          walletAddress: req.validatedBody.walletAddress,
          verified: result.verified,
          verifiedAt: result.verifiedAt
        });

        return { result };
      });
    }, res, 'Wallet ownership verified', this.getRequestMeta(req));
  }

  /**
   * Get wallet verification status
   */
  async getWalletVerificationStatus(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_WALLET_VERIFICATION_STATUS');

        const status = await this.brandServices.wallet.getWalletVerificationStatus(req.businessId!);
        
        this.logAction(req, 'GET_WALLET_VERIFICATION_STATUS_SUCCESS', {
          businessId: req.businessId,
          verified: status.verified,
          walletAddress: status.walletAddress
        });

        return { status };
      });
    }, res, 'Wallet verification status retrieved', this.getRequestMeta(req));
  }

  /**
   * Update token discounts for wallet
   */
  async updateTokenDiscounts(req: UpdateTokenDiscountsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'UPDATE_TOKEN_DISCOUNTS');

        const result = await this.brandServices.wallet.updateTokenDiscounts(
          req.businessId!,
          req.validatedBody.walletAddress
        );
        
        this.logAction(req, 'UPDATE_TOKEN_DISCOUNTS_SUCCESS', {
          businessId: req.businessId,
          walletAddress: req.validatedBody.walletAddress,
          discountCount: req.validatedBody.discounts.length
        });

        return { result };
      });
    }, res, 'Token discounts updated', this.getRequestMeta(req));
  }

  /**
   * Update certificate wallet configuration
   */
  async updateCertificateWallet(req: UpdateCertificateWalletRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'UPDATE_CERTIFICATE_WALLET');

        const walletData = {
          certificateWallet: req.validatedBody.walletAddress,
          verificationData: req.validatedBody.metadata
        };

        const result = await this.brandServices.wallet.updateCertificateWallet(
          req.businessId!,
          walletData
        );
        
        this.logAction(req, 'UPDATE_CERTIFICATE_WALLET_SUCCESS', {
          businessId: req.businessId,
          walletAddress: walletData.certificateWallet,
          verifiedAt: result.verifiedAt
        });

        return { result };
      });
    }, res, 'Certificate wallet updated', this.getRequestMeta(req));
  }

  /**
   * Batch update token discounts for multiple businesses
   */
  async batchUpdateTokenDiscounts(req: BatchUpdateTokenDiscountsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'BATCH_UPDATE_TOKEN_DISCOUNTS');

        const results = await this.brandServices.wallet.batchUpdateTokenDiscounts(
          req.validatedBody.businessIds
        );
        
        this.logAction(req, 'BATCH_UPDATE_TOKEN_DISCOUNTS_SUCCESS', {
          businessId: req.businessId,
          businessIds: req.validatedBody.businessIds,
          processedCount: results.length
        });

        return { results };
      });
    }, res, 'Token discounts updated in batch', this.getRequestMeta(req));
  }

  /**
   * Handle wallet address change
   */
  async handleWalletAddressChange(req: HandleWalletAddressChangeRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'HANDLE_WALLET_ADDRESS_CHANGE');

        const changeData = {
          newWallet: req.validatedBody.newWallet,
          oldWallet: req.validatedBody.oldWallet,
          signature: req.validatedBody.signature
        };

        await this.brandServices.wallet.handleWalletAddressChange(
          req.businessId!,
          changeData.newWallet,
          changeData.oldWallet
        );
        
        this.logAction(req, 'HANDLE_WALLET_ADDRESS_CHANGE_SUCCESS', {
          businessId: req.businessId,
          newWallet: changeData.newWallet,
          oldWallet: changeData.oldWallet
        });

        return { message: 'Wallet address change processed' };
      });
    }, res, 'Wallet address change processed', this.getRequestMeta(req));
  }

  /**
   * Generate verification message for wallet
   */
  async generateVerificationMessage(req: GenerateVerificationMessageRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GENERATE_VERIFICATION_MESSAGE');

        const timestamp = req.validatedBody.timestamp || Date.now();
        const message = this.brandServices.wallet.generateVerificationMessage(req.businessId!, timestamp);
        
        this.logAction(req, 'GENERATE_VERIFICATION_MESSAGE_SUCCESS', {
          businessId: req.businessId,
          timestamp
        });

        return { message };
      });
    }, res, 'Verification message generated', this.getRequestMeta(req));
  }

  /**
   * Get wallet statistics
   */
  async getWalletStatistics(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_WALLET_STATISTICS');

        const stats = await this.brandServices.wallet.getWalletStatistics();
        
        this.logAction(req, 'GET_WALLET_STATISTICS_SUCCESS', {
          businessId: req.businessId,
          totalConnectedWallets: stats.totalConnectedWallets,
          verifiedWallets: stats.verifiedWallets
        });

        return { stats };
      });
    }, res, 'Wallet statistics retrieved', this.getRequestMeta(req));
  }
}

// Export controller instance
export const brandWalletController = new BrandWalletController();