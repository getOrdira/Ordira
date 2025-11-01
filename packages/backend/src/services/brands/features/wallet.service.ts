// src/services/brands/features/wallet.service.ts
import { BrandSettings } from '../../../models/deprecated/brandSettings.model';
import { logger } from '../../../utils/logger';
import { ethers } from 'ethers';

export interface WalletValidationResult {
  valid: boolean;
  verified?: boolean;
  errors?: string[];
  address?: string;
}

export interface WalletVerificationStatus {
  hasWallet: boolean;
  walletAddress: string | null;
  verified: boolean;
  verifiedAt: Date | null;
  lastDiscountCheck: Date | null;
  discountCount: number;
  message: string;
}

export interface TokenDiscountInfo {
  hasDiscounts: boolean;
  discounts: any[];
  walletAddress: string;
  lastUpdated: Date;
  discountCount: number;
  message?: string;
}

export interface WalletOwnershipResult {
  verified: boolean;
  message?: string;
  signature?: string;
  verifiedAt?: Date;
}

export class WalletService {

  /**
   * Validate wallet address with comprehensive checks
   */
  async validateWalletAddress(
    address: string,
    options: {
      requireSignature?: boolean;
      signature?: string;
      message?: string;
      businessId?: string;
      checkOwnership?: boolean;
    } = {}
  ): Promise<WalletValidationResult> {
    try {
      // Basic format validation
      if (!this.isValidEthereumAddress(address)) {
        return {
          valid: false,
          errors: ['Invalid wallet address format']
        };
      }

      // Normalize address
      const normalizedAddress = ethers.getAddress(address);

      // Check if wallet is already in use by another business
      if (options.businessId) {
        const isInUse = await this.isWalletInUse(normalizedAddress, options.businessId);
        if (isInUse) {
          return {
            valid: false,
            errors: ['Wallet address is already in use by another brand']
          };
        }
      }

      // Signature verification for ownership proof
      if (options.requireSignature || options.signature) {
        if (!options.signature || !options.message) {
          return {
            valid: false,
            errors: ['Signature and message are required for wallet verification']
          };
        }

        const ownershipVerified = await this.verifyWalletSignature(
          normalizedAddress,
          options.message,
          options.signature
        );

        return {
          valid: true,
          verified: ownershipVerified,
          address: normalizedAddress,
          errors: ownershipVerified ? [] : ['Wallet signature verification failed']
        };
      }

      return {
        valid: true,
        verified: false,
        address: normalizedAddress
      };
    } catch (error: any) {
      logger.error('Wallet validation error:', error);
      return {
        valid: false,
        errors: [error.message || 'Wallet validation failed']
      };
    }
  }

  /**
   * Verify wallet ownership through signature verification
   */
  async verifyWalletOwnership(
    businessId: string,
    walletAddress: string,
    signature?: string,
    message?: string
  ): Promise<WalletOwnershipResult> {
    try {
      // If no signature provided, check if wallet is already verified in settings
      if (!signature || signature === '') {
        const brandSettings = await BrandSettings.findOne({ business: businessId });
        const isAlreadyVerified = !!(brandSettings?.web3Settings?.walletVerified &&
          brandSettings?.web3Settings?.certificateWallet === walletAddress);

        return {
          verified: isAlreadyVerified,
          message: isAlreadyVerified ? 'Wallet already verified' : 'Signature required for verification'
        };
      }

      // If signature provided, verify it
      const verificationMessage = message || `Verify wallet ownership for business: ${businessId}`;
      const isValid = await this.verifyWalletSignature(walletAddress, verificationMessage, signature);

      if (isValid) {
        // Update brand settings with verified wallet
        await BrandSettings.updateOne(
          { business: businessId },
          {
            $set: {
              'web3Settings.certificateWallet': walletAddress,
              'web3Settings.walletVerified': true,
              'web3Settings.walletVerifiedAt': new Date(),
              'web3Settings.walletSignature': signature,
              'web3Settings.verificationMessage': verificationMessage
            }
          },
          { upsert: true }
        );

        // Update token discounts for the verified wallet
        await this.updateTokenDiscounts(businessId, walletAddress);

        logger.info(`Wallet verified for business ${businessId}: ${walletAddress}`);

        return {
          verified: true,
          message: 'Wallet ownership verified successfully',
          signature,
          verifiedAt: new Date()
        };
      }

      return {
        verified: false,
        message: 'Wallet signature verification failed'
      };
    } catch (error) {
      logger.error('Error verifying wallet ownership:', error);
      return {
        verified: false,
        message: 'Failed to verify wallet ownership'
      };
    }
  }

  /**
   * Get wallet verification status with detailed information
   */
  async getWalletVerificationStatus(businessId: string): Promise<WalletVerificationStatus> {
    try {
      const brandSettings = await BrandSettings.findOne({ business: businessId });

      if (!brandSettings?.web3Settings) {
        return {
          hasWallet: false,
          walletAddress: null,
          verified: false,
          verifiedAt: null,
          lastDiscountCheck: null,
          discountCount: 0,
          message: 'No Web3 settings found'
        };
      }

      const web3Settings = brandSettings.web3Settings;

      return {
        hasWallet: !!web3Settings.certificateWallet,
        walletAddress: web3Settings.certificateWallet || null,
        verified: web3Settings.walletVerified || false,
        verifiedAt: web3Settings.walletVerifiedAt || null,
        lastDiscountCheck: web3Settings.lastDiscountCheck || null,
        discountCount: web3Settings.tokenDiscounts?.length || 0,
        message: web3Settings.walletVerified ? 'Wallet verified' : 'Wallet not verified'
      };
    } catch (error) {
      logger.error('Error getting wallet verification status:', error);
      throw {
        statusCode: 500,
        message: 'Failed to get wallet verification status'
      };
    }
  }

  /**
   * Update token discounts for a business account
   */
  async updateTokenDiscounts(businessId: string, walletAddress?: string): Promise<TokenDiscountInfo> {
    try {
      const brandSettings = await BrandSettings.findOne({ business: businessId });

      // Use provided wallet address or get from brand settings
      const targetWallet = walletAddress || brandSettings?.web3Settings?.certificateWallet;

      if (!targetWallet || !brandSettings?.web3Settings?.walletVerified) {
        return {
          hasDiscounts: false,
          discounts: [],
          walletAddress: targetWallet || '',
          lastUpdated: new Date(),
          discountCount: 0,
          message: 'No verified wallet found'
        };
      }

      // Check for token-based discounts
      const discounts = await this.getAvailableTokenDiscounts(targetWallet);

      // Update brand settings with current discounts
      await BrandSettings.updateOne(
        { business: businessId },
        {
          $set: {
            'web3Settings.tokenDiscounts': discounts,
            'web3Settings.discountsUpdatedAt': new Date(),
            'web3Settings.lastDiscountCheck': new Date()
          }
        }
      );

      logger.info(`Token discounts updated for business ${businessId}: ${discounts.length} discounts found`);

      return {
        hasDiscounts: discounts.length > 0,
        discounts,
        walletAddress: targetWallet,
        lastUpdated: new Date(),
        discountCount: discounts.length
      };
    } catch (error) {
      logger.error('Error updating token discounts:', error);
      throw {
        statusCode: 500,
        message: 'Failed to update token discounts',
        originalError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update certificate wallet with enhanced validation and metadata
   */
  async updateCertificateWallet(
    businessId: string,
    walletData: string | { certificateWallet: string; verificationData?: any }
  ): Promise<{
    certificateWallet: string;
    verifiedAt?: Date;
  }> {
    const certificateWallet = typeof walletData === 'string' ? walletData : walletData.certificateWallet;

    // Validate wallet address first
    const validation = await this.validateWalletAddress(certificateWallet, { businessId });
    if (!validation.valid) {
      throw {
        statusCode: 400,
        message: validation.errors?.join(', ') || 'Invalid wallet address'
      };
    }

    const updateData: any = {
      'web3Settings.certificateWallet': certificateWallet
    };

    // Store verification metadata if provided
    if (typeof walletData === 'object' && walletData.verificationData) {
      updateData['web3Settings.lastWalletVerification'] = walletData.verificationData.verifiedAt;
    }

    const settings = await BrandSettings.findOneAndUpdate(
      { business: businessId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    return {
      certificateWallet: settings.web3Settings?.certificateWallet!,
      verifiedAt: new Date()
    };
  }

  /**
   * Batch update token discounts for multiple businesses
   */
  async batchUpdateTokenDiscounts(businessIds: string[]): Promise<any[]> {
    const results = [];

    for (const businessId of businessIds) {
      try {
        const result = await this.updateTokenDiscounts(businessId);
        results.push({ businessId, success: true, ...result });
      } catch (error) {
        logger.error(`Failed to update token discounts for business ${businessId}:`, error);
        results.push({
          businessId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Handle wallet address changes with proper validation and notifications
   */
  async handleWalletAddressChange(
    businessId: string,
    newWallet: string,
    oldWallet?: string
  ): Promise<void> {
    try {
      // Verify wallet ownership if required
      if (newWallet) {
        const validation = await this.validateWalletAddress(newWallet, { businessId });
        if (!validation.valid) {
          throw new Error(validation.errors?.join(', ') || 'Wallet validation failed');
        }
      }

      // Update billing discounts if wallet changed
      if (oldWallet !== newWallet) {
        await this.updateTokenDiscounts(businessId, newWallet);

        // Update billing service if available
        try {
          const { getBillingService } = await import('../../container.service');
          await getBillingService().updateTokenDiscounts(businessId, newWallet);
        } catch (error) {
          logger.warn('Could not update billing service with new wallet:', error);
        }
      }
    } catch (error) {
      logger.error('Error handling wallet address change:', error);
      throw error;
    }
  }

  /**
   * Generate wallet verification message
   */
  generateVerificationMessage(businessId: string, timestamp?: number): string {
    const ts = timestamp || Date.now();
    return `Verify wallet ownership for business: ${businessId} at ${new Date(ts).toISOString()}`;
  }

  /**
   * Get wallet statistics for analytics
   */
  async getWalletStatistics(): Promise<{
    totalConnectedWallets: number;
    verifiedWallets: number;
    walletsWithDiscounts: number;
    averageDiscountCount: number;
  }> {
    try {
      const stats = await BrandSettings.aggregate([
        {
          $match: {
            'web3Settings.certificateWallet': { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            totalConnectedWallets: { $sum: 1 },
            verifiedWallets: {
              $sum: { $cond: ['$web3Settings.walletVerified', 1, 0] }
            },
            walletsWithDiscounts: {
              $sum: {
                $cond: [
                  { $gt: [{ $size: { $ifNull: ['$web3Settings.tokenDiscounts', []] } }, 0] },
                  1,
                  0
                ]
              }
            },
            totalDiscounts: {
              $sum: { $size: { $ifNull: ['$web3Settings.tokenDiscounts', []] } }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalConnectedWallets: 0,
        verifiedWallets: 0,
        walletsWithDiscounts: 0,
        totalDiscounts: 0
      };

      return {
        ...result,
        averageDiscountCount: result.totalConnectedWallets > 0
          ? Math.round(result.totalDiscounts / result.totalConnectedWallets * 100) / 100
          : 0
      };
    } catch (error) {
      logger.error('Error getting wallet statistics:', error);
      return {
        totalConnectedWallets: 0,
        verifiedWallets: 0,
        walletsWithDiscounts: 0,
        averageDiscountCount: 0
      };
    }
  }

  /**
   * Check if wallet address is already in use
   */
  private async isWalletInUse(address: string, excludeBusinessId?: string): Promise<boolean> {
    const query: any = { 'web3Settings.certificateWallet': address };
    if (excludeBusinessId) {
      query.business = { $ne: excludeBusinessId };
    }

    const existing = await BrandSettings.findOne(query);
    return !!existing;
  }

  /**
   * Verify wallet signature using ethers.js
   */
  private async verifyWalletSignature(
    walletAddress: string,
    message: string,
    signature: string
  ): Promise<boolean> {
    try {
      const normalizedAddress = ethers.getAddress(walletAddress);
      const messageHash = ethers.hashMessage(message);
      const recoveredAddress = ethers.recoverAddress(messageHash, signature);

      const isValid = normalizedAddress.toLowerCase() === recoveredAddress.toLowerCase();

      if (isValid) {
        logger.info(`Signature verification successful for wallet: ${walletAddress}`);
      } else {
        logger.warn(`Signature verification failed - Expected: ${normalizedAddress}, Got: ${recoveredAddress}`);
      }

      return isValid;
    } catch (error) {
      logger.error('Wallet signature verification error:', error);

      try {
        // Check signature format as fallback
        const isValidFormat = /^0x[a-fA-F0-9]{130}$/.test(signature);
        if (!isValidFormat) {
          logger.warn('Invalid signature format');
          return false;
        }

        // Allow test signature in development
        if (process.env.NODE_ENV === 'development' && signature === '0xtest_signature') {
          logger.warn('Using test signature in development mode');
          return true;
        }

        return false;
      } catch (fallbackError) {
        logger.error('Signature verification fallback failed:', fallbackError);
        return false;
      }
    }
  }

  /**
   * Validate Ethereum address format
   */
  private isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Get available token discounts for a wallet
   */
  private async getAvailableTokenDiscounts(walletAddress: string): Promise<any[]> {
    try {
      // Import token discount service dynamically to avoid circular dependencies
      const { TokenDiscountService } = await import('../../external/tokenDiscount.service');
      const tokenService = new TokenDiscountService();
      return await tokenService.getAvailableDiscounts(walletAddress);
    } catch (error) {
      logger.error('Error getting token discounts:', error);
      return [];
    }
  }
}