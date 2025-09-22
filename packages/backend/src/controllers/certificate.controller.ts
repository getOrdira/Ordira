// src/controllers/certificate.controller.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { PlanLimitsRequest } from '../middleware/planLimits.middleware';
import { getServices } from '../services/container.service';
import { BrandSettings } from '../models/brandSettings.model';
import { Certificate } from '../models/certificate.model';
import { PLAN_DEFINITIONS, PlanKey } from '../constants/plans';
import { NftService } from '../services/blockchain/nft.service';

// ✨ Enhanced request interfaces with Web3 support
interface CertificateRequest extends Request, UnifiedAuthRequest, TenantRequest, ValidatedRequest {
  body: {
    productId: string;
    recipient: string;
    contactMethod: 'email' | 'sms' | 'wallet';
    certificateData?: {
      customMessage?: string;
      expirationDate?: Date;
      attributes?: Array<{
        trait_type: string;
        value: string | number;
        display_type?: string;
      }>;
      metadata?: any;
      certificateLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
    };
    deliveryOptions?: {
      scheduleDate?: Date;
      priority?: 'standard' | 'priority' | 'urgent';
      notifyRecipient?: boolean;
    };
    // ✨ New Web3 options
    web3Options?: {
      autoTransfer?: boolean;
      transferDelay?: number;
      brandWallet?: string;
      requireCustomerConfirmation?: boolean;
      gasOptimization?: boolean;
    };
    batchRequest?: boolean;
    templateId?: string;
  };
}

interface BatchCertificateRequest extends UnifiedAuthRequest, TenantRequest, ValidatedRequest {
  body: {
    productId: string;
    recipients: Array<{
      address: string;
      contactMethod: 'email' | 'sms' | 'wallet';
      customData?: any;
    }>;
    batchOptions?: {
      delayBetweenCerts?: number;
      maxConcurrent?: number;
      continueOnError?: boolean;
      // ✨ New Web3 batch options
      batchTransfer?: boolean;
      transferBatchSize?: number;
      gasOptimization?: boolean;
    };
  };
}

interface CertificateSearchRequest extends UnifiedAuthRequest, TenantRequest, ValidatedRequest {
  query: {
    page?: string;
    limit?: string;
    status?: 'minted' | 'pending_transfer' | 'transferred_to_brand' | 'transfer_failed' | 'revoked';
    productId?: string;
    recipient?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    sortBy?: 'created' | 'minted' | 'transferred' | 'status';
    sortOrder?: 'asc' | 'desc';
    // ✨ New Web3 filters
    ownershipType?: 'relayer' | 'brand' | 'all';
    transferStatus?: 'success' | 'failed' | 'pending';
    hasWeb3?: 'true' | 'false';
  };
}

// ✨ New interfaces for Web3 operations
interface TransferRequest extends UnifiedAuthRequest, TenantRequest, ValidatedRequest {
  body: {
    certificateIds: string[];
    brandWallet?: string;
    transferOptions?: {
      priority?: 'low' | 'normal' | 'high';
      gasLimit?: number;
      gasPrice?: number;
      batchSize?: number;
    };
  };
}

interface Web3AnalyticsRequest extends UnifiedAuthRequest, TenantRequest, ValidatedRequest {
  query: {
    timeframe?: string;
    groupBy?: string;
    includeGasMetrics?: 'true' | 'false';
    includeTransferMetrics?: 'true' | 'false';
  };
}

interface revokeCertificateRequest extends UnifiedAuthRequest, TenantRequest, ValidatedRequest {
  body: {
    reason?: string;
    notifyRecipient?: boolean;
    burnOnBlockchain?: boolean;
  };
}

// Services are now injected via container

// Business logic functions moved to CertificateService

/**
 * POST /api/certificates
 * Create a new NFT certificate with automatic transfer capabilities
 */
export async function createCertificate(
  req: CertificateRequest & PlanLimitsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const {
      certificate: certificateService,
      billing: billingService,
      notifications: notificationsService,
      analytics: analyticsService,
      nft: nftService,
    } = getServices();

    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const certificateData = req.validatedBody;

    // ✨ Get brand settings for Web3 capabilities
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    const hasWeb3 = brandSettings?.hasWeb3Features() || false;
    const shouldAutoTransfer = brandSettings?.shouldAutoTransfer() || false;

    // Use the new plan limits system
    const planLimits = certificateService.getPlanLimits(userPlan);
    const currentUsage = req.planLimits?.usage || { certificates: 0, votes: 0, apiCalls: 0, storage: 0 };

    // Check certificate limits with enhanced validation
    if (planLimits.certificates !== Infinity && currentUsage.certificates >= planLimits.certificates) {
      const utilization = Math.round((currentUsage.certificates / planLimits.certificates) * 100);

      res.status(403).json({
        error: 'Certificate limit reached for your plan',
        details: {
          plan: userPlan,
          currentUsage: currentUsage.certificates,
          limit: planLimits.certificates,
          utilization: `${utilization}%`
        },
        options: {
          upgradeAvailable: userPlan !== 'enterprise',
          overageAllowed: planLimits.allowOverage
        },
        recommendations: [
          'Consider upgrading your plan for higher limits',
          'Archive unused certificates to free up quota',
          'Contact support for custom solutions'
        ],
        code: 'CERTIFICATE_LIMIT_REACHED'
      });
      return;
    }

    // ✨ Check transfer limits for Web3 users
    if (hasWeb3 && shouldAutoTransfer) {
      const transferUsage = await certificateService.getTransferUsage(businessId);
      const transferLimits = certificateService.getTransferLimits(userPlan);
      
      if (transferUsage.thisMonth >= transferLimits.transfersPerMonth) {
         res.status(403).json({
          error: 'Monthly transfer limit reached',
          usage: {
            current: transferUsage.thisMonth,
            limit: transferLimits.transfersPerMonth,
            plan: userPlan
          },
          options: {
            disableAutoTransfer: true,
            upgradeAvailable: userPlan !== 'enterprise'
          },
          code: 'TRANSFER_LIMIT_REACHED'
        })
        return;
      }
    }

    // Validate product ownership
    const productExists = await certificateService.validateProductOwnership(businessId, certificateData.productId);
    if (!productExists) {
       res.status(404).json({
        error: 'Product not found or access denied',
        code: 'PRODUCT_NOT_FOUND'
      })
      return;
    }

    // Validate recipient format based on contact method
    const recipientValidation = certificateService.validateRecipient(certificateData.recipient, certificateData.contactMethod);
    if (!recipientValidation.valid) {
       res.status(400).json({
        error: 'Invalid recipient format',
        details: recipientValidation.error,
        code: 'INVALID_RECIPIENT'
      })
      return;
    }

    // Check for duplicate certificates
    const existingCert = await Certificate.findOne({
      business: businessId,
      product: certificateData.productId,
      recipient: certificateData.recipient
    });

    if (existingCert) {
       res.status(409).json({
        error: 'Certificate already exists for this recipient and product',
        existingCertificate: {
          id: existingCert._id.toString(),
          tokenId: existingCert.tokenId,
          status: existingCert.status,
          transferredToBrand: existingCert.transferredToBrand,
          createdAt: existingCert.createdAt
        },
        options: {
          reissue: true,
          viewExisting: true
        },
        code: 'CERTIFICATE_ALREADY_EXISTS'
      })
      return;
    }

    // ✨ Create NFT certificate with auto-transfer
    let mintResult;
    try {
      // Get or deploy NFT contract if needed
      let contractAddress = brandSettings?.web3Settings?.nftContract;
      if (!contractAddress && hasWeb3) {
        const deployResult = await nftService.deployNFTContract({
          name: `${businessId} Certificates`,
          symbol: 'CERT',
          baseUri: `${process.env.METADATA_BASE_URL}/${businessId}/`,
          businessId
        });
        contractAddress = deployResult.address;
      }

      if (!contractAddress) {
        throw new Error('No NFT contract available. Please deploy a contract first.');
      }

      // Create token URI
      const tokenUri = `${process.env.METADATA_BASE_URL}/${businessId}/${certificateData.productId}`;

      // Mint NFT with auto-transfer capabilities
      mintResult = await nftService.mintNFTWithAutoTransfer({
        contractAddress,
        recipient: certificateData.recipient,
        tokenUri,
        businessId,
        productId: certificateData.productId
      });

    } catch (error) {
      logger.error('NFT minting failed:', error);
       res.status(500).json({
        error: 'Failed to mint NFT certificate',
        details: error.message,
        code: 'MINTING_FAILED'
      })
      return;
    }

    // Track certificate creation
    trackManufacturerAction('create_certificate');

    // Note: Usage tracking handled by middleware

    // Send delivery notification
    await certificateService.processCertificateDelivery(mintResult, certificateData.deliveryOptions, hasWeb3);

    // ✨ Notify about certificate creation with transfer status
    await notificationsService.notifyBrandOfCertificateMinted(businessId, mintResult.certificateId, {
      tokenId: mintResult.tokenId,
      txHash: mintResult.txHash,
      recipient: certificateData.recipient,
      transferScheduled: mintResult.transferScheduled,
      brandWallet: mintResult.brandWallet,
      autoTransferEnabled: shouldAutoTransfer
    });

    res.status(201).json({
      success: true,
      certificate: {
        id: mintResult.certificateId,
        tokenId: mintResult.tokenId,
        status: 'minted',
        createdAt: new Date(),
        contractAddress: mintResult.contractAddress,
        txHash: mintResult.txHash
      },
      web3: {
        hasWeb3Features: hasWeb3,
        autoTransferEnabled: shouldAutoTransfer,
        transferScheduled: mintResult.transferScheduled,
        brandWallet: mintResult.brandWallet,
        transferDelay: mintResult.transferDelay,
        blockchain: {
          network: process.env.BLOCKCHAIN_NETWORK || 'base',
          explorerUrl: `https://basescan.io/tx/${mintResult.txHash}`
        }
      },
      usage: {
        certificates: {
          current: currentUsage.certificates + 1,
          remaining: Math.max(0, planLimits.certificates - currentUsage.certificates - 1),
          limit: planLimits.certificates
        },
        ...(hasWeb3 && {
          transfers: {
            current: (await certificateService.getTransferUsage(businessId)).thisMonth + (mintResult.transferScheduled ? 1 : 0),
            limit: certificateService.getTransferLimits(userPlan).transfersPerMonth
          }
        })
      },
      delivery: {
        method: certificateData.contactMethod,
        scheduled: !!certificateData.deliveryOptions?.scheduleDate,
        recipient: certificateData.recipient
      },
      nextSteps: certificateService.getCertificateNextSteps(hasWeb3, shouldAutoTransfer, mintResult.transferScheduled)
    });
  } catch (error) {
    logger.error('Create certificate error:', error);
    next(error);
  }
}

/**
 * ✨ POST /api/certificates/transfer
 * Manually trigger NFT transfers to brand wallet
 */
export async function transferCertificates(
  req: TransferRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const {
      certificate: certificateService,
      billing: billingService,
      notifications: notificationsService,
      analytics: analyticsService
    } = getServices();

    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const { certificateIds, brandWallet, transferOptions } = req.validatedBody;

    // Check Web3 permissions
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    if (!brandSettings?.hasWeb3Features()) {
       res.status(403).json({
        error: 'Web3 features require Growth plan or higher',
        currentPlan: userPlan,
        requiredPlans: ['growth', 'premium', 'enterprise'],
        code: 'PLAN_UPGRADE_REQUIRED'
      })
      return;
    }

    if (!brandSettings?.canTransferToBrand()) {
       res.status(400).json({
        error: 'Brand wallet not configured or verified',
        code: 'WALLET_NOT_CONFIGURED'
      })
      return;
    }

    // Validate certificates
    const certificates = await Certificate.find({
      _id: { $in: certificateIds },
      business: businessId
    });

    if (certificates.length !== certificateIds.length) {
       res.status(404).json({
        error: 'Some certificates not found',
        code: 'CERTIFICATES_NOT_FOUND'
      })
      return;
    }

    // Check if certificates can be transferred
    const eligibleCerts = certificates.filter(cert => cert.canBeTransferred());
    const ineligibleCerts = certificates.filter(cert => !cert.canBeTransferred());

    if (ineligibleCerts.length > 0) {
       res.status(400).json({
        error: 'Some certificates cannot be transferred',
        eligibleCount: eligibleCerts.length,
        ineligibleCount: ineligibleCerts.length,
        ineligibleReasons: ineligibleCerts.map(cert => ({
          id: cert._id.toString(),
          tokenId: cert.tokenId,
          status: cert.status,
          reason: cert.getOwnershipStatus()
        })),
        code: 'CERTIFICATES_NOT_ELIGIBLE'
      })
      return;
    }

    // Check rate limits
    const currentTime = new Date();
    const transferSettings = brandSettings.getTransferSettings();
    const canTransfer = brandSettings.canTransferNow();
    
    if (!canTransfer.allowed) {
       res.status(429).json({
        error: 'Transfer not allowed at this time',
        reason: canTransfer.reason,
        code: 'TRANSFER_RATE_LIMITED'
      })
      return;
    }

    // Process transfers
    const transferResults = [];
    const errors = [];

    for (const cert of eligibleCerts) {
      try {
        const success = await cert.executeTransfer();
        if (success) {
          transferResults.push({
            certificateId: cert._id.toString(),
            tokenId: cert.tokenId,
            status: 'success'
          });
        } else {
          errors.push({
            certificateId: cert._id.toString(),
            tokenId: cert.tokenId,
            error: 'Transfer execution failed'
          });
        }
      } catch (error) {
        errors.push({
          certificateId: cert._id.toString(),
          tokenId: cert.tokenId,
          error: error.message
        });
      }
    }

    // Track transfer action
    trackManufacturerAction('manual_transfer_certificates');

    res.json({
      success: true,
      results: {
        total: certificateIds.length,
        successful: transferResults.length,
        failed: errors.length,
        transfers: transferResults,
        errors: errors
      },
      transferSettings: {
        autoTransferEnabled: brandSettings.shouldAutoTransfer(),
        batchTransferEnabled: transferSettings.batchTransfer,
        maxRetryAttempts: transferSettings.maxRetryAttempts
      },
      message: `${transferResults.length} certificates transferred successfully`
    });
  } catch (error) {
    logger.error('Transfer certificates error:', error);
    next(error);
  }
}

/**
 * ✨ POST /api/certificates/retry-failed
 * Retry failed NFT transfers
 */
export async function retryFailedTransfers(
  req: UnifiedAuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const {
      certificate: certificateService,
      billing: billingService,
      notifications: notificationsService
    } = getServices();

    const businessId = req.userId!;
    const { limit = 10 } = req.query;

    // Check Web3 permissions
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    if (!brandSettings?.hasWeb3Features()) {
       res.status(403).json({
        error: 'Web3 features require Growth plan or higher',
        code: 'PLAN_UPGRADE_REQUIRED'
      })
      return;
    }

    // Retry failed transfers
    const retryResults = await nftService.retryFailedTransfers(businessId, Number(limit));

    // Track retry action
    trackManufacturerAction('retry_failed_transfers');

    res.json({
      success: true,
      retryResults,
      message: `Processed ${retryResults.processed} failed transfers`
    });
  } catch (error) {
    logger.error('Retry failed transfers error:', error);
    next(error);
  }
}

/**
 * GET /api/certificates
 * List certificates with enhanced Web3 filtering
 */
export async function listCertificates(
  req: CertificateSearchRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const {
      certificate: certificateService,
      analytics: analyticsService
    } = getServices();

    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';
    const {
      page = '1',
      limit = '20',
      status,
      productId,
      recipient,
      dateFrom,
      dateTo,
      search,
      sortBy = 'created',
      sortOrder = 'desc',
      ownershipType = 'all',
      transferStatus,
      hasWeb3
    } = req.query;

    // Parse and validate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // ✨ Get brand settings for Web3 context
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    const hasWeb3Features = brandSettings?.hasWeb3Features() || false;

    // Build search options with Web3 filters
    let query: any = { business: businessId };

    // Apply filters
    if (status) query.status = status;
    if (productId) query.product = productId;
    if (recipient) query.recipient = new RegExp(recipient, 'i');
    if (dateFrom && dateTo) {
      query.createdAt = {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo)
      };
    }
    if (search) {
      query.$or = [
        { tokenId: new RegExp(search, 'i') },
        { recipient: new RegExp(search, 'i') },
        { product: new RegExp(search, 'i') }
      ];
    }

    // ✨ Apply Web3-specific filters
    if (ownershipType !== 'all') {
      if (ownershipType === 'relayer') {
        query.$or = [
          { transferredToBrand: false },
          { transferredToBrand: { $exists: false } },
          { status: { $in: ['minted', 'transfer_failed'] } }
        ];
      } else if (ownershipType === 'brand') {
        query.transferredToBrand = true;
        query.status = 'transferred_to_brand';
      }
    }

    if (transferStatus) {
      switch (transferStatus) {
        case 'success':
          query.status = 'transferred_to_brand';
          break;
        case 'failed':
          query.status = 'transfer_failed';
          break;
        case 'pending':
          query.status = 'pending_transfer';
          break;
      }
    }

    if (hasWeb3 === 'true') {
      query.autoTransferEnabled = true;
    } else if (hasWeb3 === 'false') {
      query.autoTransferEnabled = { $ne: true };
    }

    // Execute query with pagination
    const certificates = await Certificate.find(query)
      .sort({ [sortBy === 'created' ? 'createdAt' : sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const total = await Certificate.countDocuments(query);

    // ✨ Get enhanced analytics with Web3 metrics
    const analytics = await nftService.getCertificateAnalytics(businessId);

    // Track certificate list view
    trackManufacturerAction('view_certificates');

    res.json({
      certificates: certificates.map(cert => ({
        ...cert,
        id: cert._id.toString(),
        ownershipStatus: certificateService.getOwnershipStatus(cert),
        transferHealth: certificateService.getTransferHealth(cert)
      })),
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
        resultsPerPage: limitNum
      },
      analytics: {
        ...analytics,
        web3Enabled: hasWeb3Features,
        transferSettings: hasWeb3Features ? brandSettings?.getTransferSettings() : null
      },
      filters: {
        availableStatuses: ['minted', 'pending_transfer', 'transferred_to_brand', 'transfer_failed', 'revoked'],
        ownershipTypes: ['all', 'relayer', 'brand'],
        transferStatuses: ['success', 'failed', 'pending']
      },
      web3: {
        enabled: hasWeb3Features,
        autoTransferEnabled: brandSettings?.shouldAutoTransfer() || false,
        walletConnected: !!brandSettings?.web3Settings?.certificateWallet,
        walletVerified: brandSettings?.web3Settings?.walletVerified || false
      }
    });
  } catch (error) {
    logger.error('List certificates error:', error);
    next(error);
  }
}

/**
 * GET /api/certificates/:id
 * Get detailed certificate information with Web3 data
 */
export async function getCertificate(
  req: UnifiedAuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const {
      certificate: certificateService,
      analytics: analyticsService
    } = getServices();

    const businessId = req.userId!;
    const { id } = req.params;

    if (!id) {
       res.status(400).json({
        error: 'Certificate ID is required',
        code: 'MISSING_CERTIFICATE_ID'
      })
      return;
    }

    // Get certificate with Web3 data
    const certificate = await Certificate.findOne({
      _id: id,
      business: businessId
    });

    if (!certificate) {
       res.status(404).json({
        error: 'Certificate not found',
        code: 'CERTIFICATE_NOT_FOUND'
      })
      return;
    }

    // ✨ Get blockchain data if available
    let blockchainData = null;
    if (certificate.contractAddress && certificate.tokenId) {
      try {
        const tokenOwner = await nftService.getTokenOwner(certificate.contractAddress, certificate.tokenId);
        const tokenUri = await nftService.getTokenURI(certificate.contractAddress, certificate.tokenId);
        
        blockchainData = {
          contractAddress: certificate.contractAddress,
          tokenId: certificate.tokenId,
          currentOwner: tokenOwner,
          tokenUri,
          explorerUrl: `https://basescan.io/tx/${certificate.txHash}`,
          transferExplorerUrl: certificate.transferTxHash ? `https://basescan.io/tx/${certificate.transferTxHash}` : null
        };
      } catch (error) {
        logger.warn('Failed to get blockchain data for certificate ${id}:', error.message);
      }
    }

    // Get brand settings for Web3 context
    const brandSettings = await BrandSettings.findOne({ business: businessId });

    res.json({
      certificate: {
        ...certificate.toObject(),
        id: certificate._id.toString(),
        ownershipStatus: certificate.getOwnershipStatus(),
        canBeTransferred: certificate.canBeTransferred(),
        transferHealth: certificateService.getTransferHealth(certificate)
      },
      blockchain: blockchainData,
      actions: {
        canTransfer: certificate.canBeTransferred() && brandSettings?.canTransferToBrand(),
        canRetry: certificate.status === 'transfer_failed' && certificate.transferAttempts < certificate.maxTransferAttempts,
        canRevoke: ['minted', 'transferred_to_brand'].includes(certificate.status),
        canView: true
      },
      web3: {
        enabled: brandSettings?.hasWeb3Features() || false,
        autoTransferSettings: brandSettings?.getTransferSettings(),
        transferHealth: brandSettings.web3Settings?.transferHealth
      },
      links: {
        verificationUrl: certificate.verificationUrl,
        explorerUrl: blockchainData?.explorerUrl,
        transferUrl: blockchainData?.transferExplorerUrl
      }
    });
  } catch (error) {
    logger.error('Get certificate error:', error);
    next(error);
  }
}

/**
 * ✨ GET /api/certificates/analytics/web3
 * Get comprehensive Web3 analytics
 */
export async function getWeb3Analytics(
  req: Web3AnalyticsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const {
      certificate: certificateService,
      analytics: analyticsService
    } = getServices();

    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';
    const { 
      timeframe = '30d', 
      groupBy = 'day',
      includeGasMetrics = 'true',
      includeTransferMetrics = 'true'
    } = req.query;

    // Check Web3 permissions
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    if (!brandSettings?.hasWeb3Features()) {
       res.status(403).json({
        error: 'Web3 analytics require Premium plan or higher',
        currentPlan: userPlan,
        code: 'PLAN_UPGRADE_REQUIRED'
      })
      return;
    }

    // Get comprehensive analytics
    const [certificateAnalytics, transferAnalytics, globalAnalytics] = await Promise.all([
     nftService.getCertificateAnalytics(businessId),
     brandSettings.transferAnalytics,
     userPlan === 'enterprise' ? certificateService.getGlobalTransferAnalytics() : null
    ]);

    // Track analytics view
    trackManufacturerAction('view_web3_analytics');

    res.json({
      timeframe,
      groupBy,
      analytics: {
        certificates: certificateAnalytics,
        transfers: {
          ...transferAnalytics,
          successRate: transferAnalytics?.totalTransfers > 0 
            ? Math.round((transferAnalytics.successfulTransfers / transferAnalytics.totalTransfers) * 100) 
            : 0,
          avgGasUsed: transferAnalytics?.totalGasUsed 
            ? (BigInt(transferAnalytics.totalGasUsed) / BigInt(transferAnalytics.totalTransfers || 1)).toString()
            : '0'
        },
        ...(globalAnalytics && { global: globalAnalytics }),
        insights: certificateService.generateWeb3Insights(certificateAnalytics, transferAnalytics),
        recommendations: certificateService.generateWeb3Recommendations(certificateAnalytics, transferAnalytics, userPlan)
      },
      web3Status: {
        walletConnected: !!brandSettings.web3Settings?.certificateWallet,
        walletVerified: brandSettings.web3Settings?.walletVerified || false,
        autoTransferEnabled: brandSettings.shouldAutoTransfer(),
        contractDeployed: !!brandSettings.web3Settings?.nftContract,
        networkSupported: [1, 137, 56].includes(brandSettings.web3Settings?.chainId || 0)
      },
      metadata: {
        generatedAt: new Date(),
        planLevel: userPlan,
        includesGasMetrics: includeGasMetrics === 'true',
        includesTransferMetrics: includeTransferMetrics === 'true'
      }
    });
  } catch (error) {
    logger.error('Get Web3 analytics error:', error);
    next(error);
  }
}

/**
 * POST /api/certificates/batch
 * Create multiple certificates in batch with Web3 support
 */
export async function createBatchCertificates(
  req: BatchCertificateRequest & PlanLimitsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const {
      certificate: certificateService,
      billing: billingService,
      notifications: notificationsService,
      analytics: analyticsService
    } = getServices();

    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const batchData = req.validatedBody;

    // Validate batch permissions using new plan system
    const planLimits = certificateService.getPlanLimits(userPlan);
    if (!planLimits.hasWeb3) {
      res.status(403).json({
        error: 'Batch certificate creation requires Growth plan or higher',
        currentPlan: userPlan,
        requiredPlans: ['growth', 'premium', 'enterprise'],
        code: 'PLAN_UPGRADE_REQUIRED'
      });
      return;
    }

    const recipientCount = batchData.recipients.length;

    // Validate batch size limits
    const batchLimits = certificateService.getBatchLimits(userPlan);
    if (recipientCount > batchLimits.maxBatchSize) {
      res.status(400).json({
        error: 'Batch size exceeds plan limits',
        requestedSize: recipientCount,
        maxAllowed: batchLimits.maxBatchSize,
        code: 'BATCH_SIZE_EXCEEDED'
      });
      return;
    }

    // Check certificate limits using new system
    const currentUsage = req.planLimits?.usage || { certificates: 0, votes: 0, apiCalls: 0, storage: 0 };
    const remainingLimit = planLimits.certificates === Infinity ? 
      Infinity : 
      planLimits.certificates - currentUsage.certificates;

    if (remainingLimit !== Infinity && recipientCount > remainingLimit) {
      res.status(403).json({
        error: 'Insufficient certificate quota for batch',
        details: {
          requested: recipientCount,
          available: remainingLimit,
          currentUsage: currentUsage.certificates,
          planLimit: planLimits.certificates
        },
        options: {
          upgradeAvailable: userPlan !== 'enterprise',
          overageAllowed: planLimits.allowOverage
        },
        code: 'INSUFFICIENT_QUOTA'
      });
      return;
    }

    // ✨ Check Web3 batch capabilities
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    const hasWeb3 = brandSettings?.hasWeb3Features() || false;
    const shouldAutoTransfer = brandSettings?.shouldAutoTransfer() || false;
    
    if (hasWeb3 && shouldAutoTransfer) {
      const transferUsage = await certificateService.getTransferUsage(businessId);
      const transferLimits = certificateService.getTransferLimits(userPlan);
      
      if (transferUsage.thisMonth + recipientCount > transferLimits.transfersPerMonth) {
         res.status(403).json({
          error: 'Insufficient transfer quota for batch with auto-transfer',
          transfersRequested: recipientCount,
          transfersAvailable: transferLimits.transfersPerMonth - transferUsage.thisMonth,
          options: {
            disableAutoTransfer: true,
            splitBatch: true,
            upgradeAvailable: userPlan !== 'enterprise'
          },
          code: 'INSUFFICIENT_TRANSFER_QUOTA'
        })
        return;
      }
    }

    // Create batch job with Web3 support
    const batchJob = await certificateService.createBatchCertificateJob(businessId, {
      ...batchData,
      planLevel: userPlan,
      hasWeb3,
      shouldAutoTransfer,
      transferSettings: hasWeb3 ? brandSettings?.getTransferSettings() : null,
      initiatedBy: businessId,
      jobMetadata: {
        recipientCount,
        estimatedDuration: certificateService.calculateBatchDuration(recipientCount, batchData.batchOptions, hasWeb3),
        priority: certificateService.determineBatchPriority(userPlan),
        web3Enabled: hasWeb3,
        autoTransferEnabled: shouldAutoTransfer
      }
    });

    // Track batch creation
    trackManufacturerAction('create_batch_certificates');

    // Note: Usage tracking handled by middleware

    res.status(202).json({
      success: true,
      batchJob: {
        id: batchJob.id,
        status: 'queued',
        recipientCount,
        estimatedCompletion: batchJob.estimatedCompletion,
        progressUrl: `/api/certificates/batch/${batchJob.id}/progress`
      },
      web3: {
        enabled: hasWeb3,
        autoTransferEnabled: shouldAutoTransfer,
        batchTransferEnabled: batchData.batchOptions?.batchTransfer || false,
        estimatedGasCost: hasWeb3 ? certificateService.calculateEstimatedGasCost(recipientCount) : null
      },
      processing: {
        queuePosition: batchJob.queuePosition,
        estimatedStartTime: batchJob.estimatedStartTime,
        notificationsEnabled: true
      },
      tracking: {
        webhookUrl: batchJob.webhookUrl,
        statusUpdates: true,
        completionNotification: true
      }
    });
  } catch (error) {
    logger.error('Create batch certificates error:', error);
    next(error);
  }
}

/**
 * POST /api/certificates/:id/revoke
 * Revoke an issued certificate with blockchain integration
 */
export async function revokeCertificate(
  req: UnifiedAuthRequest & TenantRequest & revokeCertificateRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const {
      certificate: certificateService,
      notifications: notificationsService,
      analytics: analyticsService
    } = getServices();

    const businessId = req.userId!;
    const { id } = req.params;
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const { reason, notifyRecipient = true, burnNft = false } = req.validatedBody;

    // Get certificate
    const certificate = await Certificate.findOne({
      _id: id,
      business: businessId
    });

    if (!certificate) {
       res.status(404).json({
        error: 'Certificate not found',
        code: 'CERTIFICATE_NOT_FOUND'
      })
      return;
    }

    // Validate revocation permissions
    if (!['minted', 'transferred_to_brand', 'pending_transfer'].includes(certificate.status)) {
       res.status(400).json({
        error: 'Certificate cannot be revoked in current status',
        currentStatus: certificate.status,
        allowedStatuses: ['minted', 'transferred_to_brand', 'pending_transfer'],
        code: 'INVALID_STATUS_FOR_REVOCATION'
      })
      return;
    }

    // ✨ Handle blockchain revocation
    let blockchainRevocation = null;
    if (certificate.contractAddress && certificate.tokenId && burnNft) {
      try {
        // Note: Burning NFT would require a burn function in the contract
        // For now, we'll just mark as revoked in our system
        logger.info('NFT burn requested for token ${certificate.tokenId} but not implemented');
      } catch (error) {
        logger.warn('Failed to burn NFT ${certificate.tokenId}:', error.message);
      }
    }

    // Process revocation
    certificate.revoked = true;
    certificate.revokedAt = new Date();
    certificate.revokedReason = reason;
    certificate.status = 'revoked';
    
    await certificate.save();

    // Track revocation
    trackManufacturerAction('revoke_certificate');

    // Send notification if requested
    if (notifyRecipient) {
      await notificationsService.sendCertificateRevocationNotification(
        certificate.recipient,
        {
          certificateId: id,
          tokenId: certificate.tokenId,
          reason,
          revokedAt: certificate.revokedAt
        }
      );
    }

    res.json({
      success: true,
      revocation: {
        certificateId: id,
        tokenId: certificate.tokenId,
        revokedAt: certificate.revokedAt,
        reason: certificate.revokedReason,
        blockchainRevocation
      },
      impact: {
        certificateInvalidated: true,
        recipientNotified: notifyRecipient,
        nftBurned: burnNft && blockchainRevocation,
        transfersStopped: true
      },
      message: 'Certificate revoked successfully'
    });
  } catch (error) {
    logger.error('Revoke certificate error:', error);
    next(error);
  }
}

/**
 * ✨ GET /api/certificates/pending-transfers
 * Get certificates pending transfer
 */
export async function getPendingTransfers(
  req: UnifiedAuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const {
      certificate: certificateService,
      analytics: analyticsService
    } = getServices();

    const businessId = req.userId!;

    // Check Web3 permissions
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    if (!brandSettings?.hasWeb3Features()) {
       res.status(403).json({
        error: 'Web3 features require Growth plan or higher',
        code: 'PLAN_UPGRADE_REQUIRED'
      })
      return;
    }

    // Get pending transfers
    const pendingTransfers = await nftService.getPendingTransfers(businessId);

    res.json({
      success: true,
      pendingTransfers: pendingTransfers.map(cert => ({
        id: cert._id.toString(),
        tokenId: cert.tokenId,
        recipient: cert.recipient,
        nextTransferAttempt: cert.nextTransferAttempt,
        transferAttempts: cert.transferAttempts,
        maxTransferAttempts: cert.maxTransferAttempts,
        transferError: cert.transferError,
        createdAt: cert.createdAt
      })),
      summary: {
        total: pendingTransfers.length,
        canTransferNow: brandSettings.canTransferNow(),
        transferSettings: brandSettings.getTransferSettings()
      }
    });
  } catch (error) {
    logger.error('Get pending transfers error:', error);
    next(error);
  }
}

/**
 * GET /api/certificates/batch/:batchId/progress
 * Get batch certificate processing progress with Web3 metrics
 */
export async function getBatchProgress(
  req: UnifiedAuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { batchId } = req.params;

    // Get batch progress with Web3 metrics
    const { certificate: certificateService } = getServices();
    const progress = await certificateService.getBatchProgress(businessId, batchId);

    if (!progress) {
       res.status(404).json({
        error: 'Batch job not found',
        code: 'BATCH_NOT_FOUND'
      })
      return;
    }

    res.json({
      batchJob: {
        id: progress.id,
        status: progress.status,
        createdAt: progress.createdAt,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt
      },
      progress: {
        total: progress.total,
        processed: progress.processed,
        successful: progress.successful,
        failed: progress.failed,
        percentage: Math.round((progress.processed / progress.total) * 100)
      },
      web3Progress: {
        minted: progress.web3?.minted || 0,
        transfersScheduled: progress.web3?.transfersScheduled || 0,
        transfersCompleted: progress.web3?.transfersCompleted || 0,
        transfersFailed: progress.web3?.transfersFailed || 0,
        totalGasUsed: progress.web3?.totalGasUsed || '0'
      },
      timing: {
        estimatedCompletion: progress.estimatedCompletion,
        averageProcessingTime: progress.averageProcessingTime,
        remainingTime: progress.remainingTime
      },
      errors: progress.errors?.slice(0, 10) || [],
      nextUpdate: new Date(Date.now() + 30000)
    });
  } catch (error) {
    logger.error('Get batch progress error:', error);
    next(error);
  }
}

// ✨ Enhanced Helper Functions

// All business logic functions have been moved to CertificateService

