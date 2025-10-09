/**
 * Certificate Validation Service
 *
 * Handles certificate-specific validation including:
 * - Duplicate certificate checking
 * - Certificate existence validation
 * - Transfer parameter validation
 * - Wallet address validation
 * - Certificate status validation
 */

import { isValidObjectId } from 'mongoose';
import { Certificate, ICertificate } from '../../../models/certificate.model';
import { Business } from '../../../models/business.model';
import { Product } from '../../../models/product.model';
import { logger } from '../../../utils/logger';

/**
 * Check if certificate already exists for product and recipient
 */
export async function checkDuplicateCertificate(
  businessId: string,
  productId: string,
  recipient: string
): Promise<ICertificate | null> {
  try {
    const existingCert = await Certificate.findOne({
      business: businessId,
      product: productId,
      recipient
    });

    return existingCert;
  } catch (error) {
    logger.error('Duplicate certificate check error:', error);
    throw new Error('Failed to check for duplicate certificates');
  }
}

/**
 * Validate certificate exists and belongs to business
 */
export async function validateCertificateOwnership(
  certificateId: string,
  businessId: string
): Promise<ICertificate> {
  const certificate = await Certificate.findOne({
    _id: certificateId,
    business: businessId
  });

  if (!certificate) {
    throw new Error('Certificate not found or access denied');
  }

  return certificate;
}

/**
 * Validate product ownership by business
 */
export async function validateProductOwnership(
  businessId: string,
  productId: string
): Promise<boolean> {
  try {
    if (!isValidObjectId(businessId) || !isValidObjectId(productId)) {
      return false;
    }

    const [businessExists, productExists] = await Promise.all([
      Business.exists({ _id: businessId, isActive: true }),
      Product.exists({
        _id: productId,
        business: businessId,
        status: { $ne: 'archived' }
      })
    ]);

    return Boolean(businessExists && productExists);
  } catch (error) {
    logger.error('Product ownership validation error:', error);
    return false;
  }
}

/**
 * Validate transfer parameters
 */
export function validateTransferParameters(
  contractAddress: string,
  tokenId: string,
  brandWallet: string
): { valid: boolean; error?: string } {
  // Check required parameters
  if (!contractAddress || !tokenId || !brandWallet) {
    return {
      valid: false,
      error: 'Missing required transfer parameters'
    };
  }

  // Validate wallet address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(brandWallet)) {
    return {
      valid: false,
      error: 'Invalid brand wallet address format'
    };
  }

  // Validate contract address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    return {
      valid: false,
      error: 'Invalid contract address format'
    };
  }

  return { valid: true };
}

/**
 * Validate wallet address format
 */
export function validateWalletAddress(address: string): {
  valid: boolean;
  error?: string;
} {
  if (!address) {
    return { valid: false, error: 'Wallet address is required' };
  }

  const walletRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!walletRegex.test(address)) {
    return { valid: false, error: 'Invalid wallet address format' };
  }

  return { valid: true };
}

/**
 * Validate relayer wallet is configured
 */
export function validateRelayerWallet(): {
  valid: boolean;
  address?: string;
  error?: string;
} {
  const relayerWallet = process.env.RELAYER_WALLET_ADDRESS;

  if (!relayerWallet) {
    return {
      valid: false,
      error: 'Relayer wallet address not configured'
    };
  }

  const validation = validateWalletAddress(relayerWallet);
  if (!validation.valid) {
    return {
      valid: false,
      error: 'Invalid relayer wallet address format'
    };
  }

  return {
    valid: true,
    address: relayerWallet
  };
}

/**
 * Validate certificate can be transferred
 */
export function validateCertificateTransferable(
  certificate: ICertificate
): { valid: boolean; error?: string } {
  if (certificate.revoked) {
    return { valid: false, error: 'Certificate is revoked' };
  }

  if (certificate.transferredToBrand) {
    return { valid: false, error: 'Certificate already transferred to brand' };
  }

  if (!certificate.tokenId) {
    return { valid: false, error: 'Certificate has no token ID' };
  }

  if (!certificate.contractAddress) {
    return { valid: false, error: 'Certificate has no contract address' };
  }

  return { valid: true };
}

/**
 * Validate certificate metadata
 */
export function validateCertificateMetadata(metadata: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (metadata.certificateLevel) {
    const validLevels = ['bronze', 'silver', 'gold', 'platinum'];
    if (!validLevels.includes(metadata.certificateLevel)) {
      errors.push(
        `Invalid certificate level. Must be one of: ${validLevels.join(', ')}`
      );
    }
  }

  if (metadata.expirationDate) {
    const expDate = new Date(metadata.expirationDate);
    if (isNaN(expDate.getTime())) {
      errors.push('Invalid expiration date format');
    } else if (expDate < new Date()) {
      errors.push('Expiration date must be in the future');
    }
  }

  if (metadata.attributes && !Array.isArray(metadata.attributes)) {
    errors.push('Attributes must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate batch certificate inputs
 */
export function validateBatchInputs(inputs: any[]): {
  valid: boolean;
  errors: Array<{ index: number; error: string }>;
} {
  const errors: Array<{ index: number; error: string }> = [];

  inputs.forEach((input, index) => {
    if (!input.productId) {
      errors.push({ index, error: 'Product ID is required' });
    }

    if (!input.recipient) {
      errors.push({ index, error: 'Recipient is required' });
    }

    if (!input.contactMethod) {
      errors.push({ index, error: 'Contact method is required' });
    }

    if (input.metadata) {
      const metadataValidation = validateCertificateMetadata(input.metadata);
      if (!metadataValidation.valid) {
        metadataValidation.errors.forEach(err => {
          errors.push({ index, error: err });
        });
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

export class CertificateValidationService {
  checkDuplicateCertificate = checkDuplicateCertificate;
  validateCertificateOwnership = validateCertificateOwnership;
  validateProductOwnership = validateProductOwnership;
  validateTransferParameters = validateTransferParameters;
  validateWalletAddress = validateWalletAddress;
  validateRelayerWallet = validateRelayerWallet;
  validateCertificateTransferable = validateCertificateTransferable;
  validateCertificateMetadata = validateCertificateMetadata;
  validateBatchInputs = validateBatchInputs;
}

export const certificateValidationService = new CertificateValidationService();
