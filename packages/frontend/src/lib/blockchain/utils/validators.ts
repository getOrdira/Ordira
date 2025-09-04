// src/lib/blockchain/utils/validators.ts
import { getAddress, isAddress } from 'viem';
import type { Address, Hash } from 'viem';
import { PATTERNS, BLOCKCHAIN_ERROR_CODES, CHAIN_IDS } from './constants';

// ======================
// VALIDATION RESULT TYPE
// ======================
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  code?: string;
}

// ======================
// ADDRESS VALIDATORS
// ======================

/**
 * Validate Ethereum address format
 */
export function validateAddress(address: string): ValidationResult {
  if (!address) {
    return {
      isValid: false,
      error: 'Address is required',
      code: BLOCKCHAIN_ERROR_CODES.INVALID_CONTRACT_ADDRESS,
    };
  }

  if (!PATTERNS.ETHEREUM_ADDRESS.test(address)) {
    return {
      isValid: false,
      error: 'Invalid address format',
      code: BLOCKCHAIN_ERROR_CODES.INVALID_CONTRACT_ADDRESS,
    };
  }

  try {
    getAddress(address); // This will throw if invalid checksum
    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: 'Invalid address checksum',
      code: BLOCKCHAIN_ERROR_CODES.INVALID_CONTRACT_ADDRESS,
    };
  }
}

/**
 * Validate that address is not a burn address or restricted address
 */
export function validateWalletAddress(address: string): ValidationResult {
  const basicValidation = validateAddress(address);
  if (!basicValidation.isValid) return basicValidation;

  const normalizedAddress = address.toLowerCase();
  
  // Check for burn addresses
  const burnAddresses = [
    '0x0000000000000000000000000000000000000000', // Zero address
    '0x000000000000000000000000000000000000dead', // Dead address
    '0xffffffffffffffffffffffffffffffffffffffff', // Max address
  ];

  if (burnAddresses.includes(normalizedAddress)) {
    return {
      isValid: false,
      error: 'Burn addresses are not allowed',
      code: BLOCKCHAIN_ERROR_CODES.INVALID_RECIPIENT,
    };
  }

  return { isValid: true };
}

/**
 * Validate contract address and check if it exists on blockchain
 */
export async function validateContractAddress(
  address: string,
  publicClient?: any
): Promise<ValidationResult> {
  const basicValidation = validateAddress(address);
  if (!basicValidation.isValid) return basicValidation;

  if (publicClient) {
    try {
      const code = await publicClient.getBytecode({ address: address as Address });
      if (!code || code === '0x') {
        return {
          isValid: false,
          error: 'Address is not a contract',
          code: BLOCKCHAIN_ERROR_CODES.CONTRACT_NOT_FOUND,
        };
      }
    } catch (error) {
      return {
        isValid: false,
        error: 'Failed to verify contract address',
        code: BLOCKCHAIN_ERROR_CODES.NETWORK_ERROR,
      };
    }
  }

  return { isValid: true };
}

// ======================
// TRANSACTION HASH VALIDATORS
// ======================

/**
 * Validate transaction hash format
 */
export function validateTransactionHash(hash: string): ValidationResult {
  if (!hash) {
    return {
      isValid: false,
      error: 'Transaction hash is required',
      code: BLOCKCHAIN_ERROR_CODES.TRANSACTION_FAILED,
    };
  }

  if (!PATTERNS.TRANSACTION_HASH.test(hash)) {
    return {
      isValid: false,
      error: 'Invalid transaction hash format',
      code: BLOCKCHAIN_ERROR_CODES.TRANSACTION_FAILED,
    };
  }

  return { isValid: true };
}

// ======================
// TOKEN VALIDATORS
// ======================

/**
 * Validate token amount format and value
 */
export function validateTokenAmount(
  amount: string,
  options: {
    allowZero?: boolean;
    maxAmount?: string;
    decimals?: number;
  } = {}
): ValidationResult {
  const { allowZero = false, maxAmount, decimals = 18 } = options;

  if (!amount || amount.trim() === '') {
    return {
      isValid: false,
      error: 'Amount is required',
      code: BLOCKCHAIN_ERROR_CODES.INSUFFICIENT_TOKEN_BALANCE,
    };
  }

  // Check if it's a valid number
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) {
    return {
      isValid: false,
      error: 'Amount must be a valid number',
      code: BLOCKCHAIN_ERROR_CODES.INSUFFICIENT_TOKEN_BALANCE,
    };
  }

  // Check for negative numbers
  if (numAmount < 0) {
    return {
      isValid: false,
      error: 'Amount cannot be negative',
      code: BLOCKCHAIN_ERROR_CODES.INSUFFICIENT_TOKEN_BALANCE,
    };
  }

  // Check for zero if not allowed
  if (numAmount === 0 && !allowZero) {
    return {
      isValid: false,
      error: 'Amount must be greater than zero',
      code: BLOCKCHAIN_ERROR_CODES.INSUFFICIENT_TOKEN_BALANCE,
    };
  }

  // Check decimal places
  const decimalPlaces = amount.split('.')[1]?.length || 0;
  if (decimalPlaces > decimals) {
    return {
      isValid: false,
      error: `Amount cannot have more than ${decimals} decimal places`,
      code: BLOCKCHAIN_ERROR_CODES.INSUFFICIENT_TOKEN_BALANCE,
    };
  }

  // Check maximum amount
  if (maxAmount && numAmount > parseFloat(maxAmount)) {
    return {
      isValid: false,
      error: `Amount cannot exceed ${maxAmount}`,
      code: BLOCKCHAIN_ERROR_CODES.INSUFFICIENT_TOKEN_BALANCE,
    };
  }

  return { isValid: true };
}

/**
 * Validate token balance is sufficient
 */
export function validateSufficientBalance(
  balance: string,
  requiredAmount: string
): ValidationResult {
  const balanceNum = parseFloat(balance);
  const requiredNum = parseFloat(requiredAmount);

  if (isNaN(balanceNum) || isNaN(requiredNum)) {
    return {
      isValid: false,
      error: 'Invalid balance or amount values',
      code: BLOCKCHAIN_ERROR_CODES.INSUFFICIENT_TOKEN_BALANCE,
    };
  }

  if (balanceNum < requiredNum) {
    return {
      isValid: false,
      error: `Insufficient balance. Required: ${requiredAmount}, Available: ${balance}`,
      code: BLOCKCHAIN_ERROR_CODES.INSUFFICIENT_TOKEN_BALANCE,
    };
  }

  return { isValid: true };
}

// ======================
// NETWORK VALIDATORS
// ======================

/**
 * Validate chain ID is supported
 */
export function validateChainId(chainId: number): ValidationResult {
  const supportedChainIds = Object.values(CHAIN_IDS);
  
  if (!supportedChainIds.includes(chainId)) {
    return {
      isValid: false,
      error: `Chain ID ${chainId} is not supported`,
      code: BLOCKCHAIN_ERROR_CODES.UNSUPPORTED_CHAIN,
    };
  }

  return { isValid: true };
}

/**
 * Validate network connectivity
 */
export async function validateNetworkConnection(
  publicClient: any,
  chainId: number
): Promise<ValidationResult> {
  try {
    await publicClient.getBlockNumber();
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: `Cannot connect to network ${chainId}`,
      code: BLOCKCHAIN_ERROR_CODES.NETWORK_ERROR,
    };
  }
}

// ======================
// CERTIFICATE VALIDATORS
// ======================

/**
 * Validate certificate ID format
 */
export function validateCertificateId(certificateId: string): ValidationResult {
  if (!certificateId) {
    return {
      isValid: false,
      error: 'Certificate ID is required',
      code: BLOCKCHAIN_ERROR_CODES.CERTIFICATE_NOT_FOUND,
    };
  }

  // Check for MongoDB ObjectId format
  if (PATTERNS.MONGODB_OBJECT_ID.test(certificateId)) {
    return { isValid: true };
  }

  // Check for UUID format
  if (PATTERNS.UUID.test(certificateId)) {
    return { isValid: true };
  }

  // Check for custom format (at least 8 characters, alphanumeric with dashes/underscores)
  if (/^[a-zA-Z0-9-_]{8,}$/.test(certificateId)) {
    return { isValid: true };
  }

  return {
    isValid: false,
    error: 'Invalid certificate ID format',
    code: BLOCKCHAIN_ERROR_CODES.CERTIFICATE_NOT_FOUND,
  };
}

/**
 * Validate token ID format
 */
export function validateTokenId(tokenId: string | bigint): ValidationResult {
  if (!tokenId && tokenId !== 0) {
    return {
      isValid: false,
      error: 'Token ID is required',
      code: BLOCKCHAIN_ERROR_CODES.CERTIFICATE_NOT_FOUND,
    };
  }

  try {
    const tokenIdBigInt = typeof tokenId === 'string' ? BigInt(tokenId) : tokenId;
    if (tokenIdBigInt < 0n) {
      return {
        isValid: false,
        error: 'Token ID cannot be negative',
        code: BLOCKCHAIN_ERROR_CODES.CERTIFICATE_NOT_FOUND,
      };
    }
    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: 'Invalid token ID format',
      code: BLOCKCHAIN_ERROR_CODES.CERTIFICATE_NOT_FOUND,
    };
  }
}

/**
 * Validate certificate metadata
 */
export function validateCertificateMetadata(metadata: any): ValidationResult {
  if (!metadata || typeof metadata !== 'object') {
    return {
      isValid: false,
      error: 'Metadata must be a valid object',
    };
  }

  // Check required fields
  if (!metadata.name || typeof metadata.name !== 'string') {
    return {
      isValid: false,
      error: 'Metadata must include a valid name',
    };
  }

  if (!metadata.description || typeof metadata.description !== 'string') {
    return {
      isValid: false,
      error: 'Metadata must include a valid description',
    };
  }

  if (!metadata.image || typeof metadata.image !== 'string') {
    return {
      isValid: false,
      error: 'Metadata must include a valid image URL',
    };
  }

  // Validate image URL
  try {
    new URL(metadata.image);
  } catch {
    return {
      isValid: false,
      error: 'Invalid image URL in metadata',
    };
  }

  // Validate attributes if present
  if (metadata.attributes && Array.isArray(metadata.attributes)) {
    for (const attr of metadata.attributes) {
      if (!attr.trait_type || typeof attr.trait_type !== 'string') {
        return {
          isValid: false,
          error: 'Invalid attribute format: trait_type is required',
        };
      }
      if (attr.value === undefined || attr.value === null) {
        return {
          isValid: false,
          error: 'Invalid attribute format: value is required',
        };
      }
    }
  }

  return { isValid: true };
}

// ======================
// WALLET VERIFICATION VALIDATORS
// ======================

/**
 * Validate signature format
 */
export function validateSignature(signature: string): ValidationResult {
  if (!signature) {
    return {
      isValid: false,
      error: 'Signature is required',
      code: BLOCKCHAIN_ERROR_CODES.SIGNATURE_INVALID,
    };
  }

  // Check basic hex format (130 characters including 0x prefix)
  if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) {
    return {
      isValid: false,
      error: 'Invalid signature format',
      code: BLOCKCHAIN_ERROR_CODES.SIGNATURE_INVALID,
    };
  }

  return { isValid: true };
}

/**
 * Validate verification message
 */
export function validateVerificationMessage(message: string): ValidationResult {
  if (!message) {
    return {
      isValid: false,
      error: 'Verification message is required',
      code: BLOCKCHAIN_ERROR_CODES.VERIFICATION_FAILED,
    };
  }

  // Check message includes required elements
  const requiredElements = ['wallet address', 'nonce', 'timestamp'];
  for (const element of requiredElements) {
    if (!message.toLowerCase().includes(element.toLowerCase())) {
      return {
        isValid: false,
        error: `Verification message must include ${element}`,
        code: BLOCKCHAIN_ERROR_CODES.VERIFICATION_FAILED,
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate verification challenge
 */
export function validateVerificationChallenge(
  challenge: {
    message: string;
    nonce: string;
    expiresAt: string;
    challengeId: string;
  }
): ValidationResult {
  if (!challenge.message) {
    return { isValid: false, error: 'Challenge message is required' };
  }

  if (!challenge.nonce || challenge.nonce.length < 16) {
    return { isValid: false, error: 'Invalid challenge nonce' };
  }

  if (!challenge.challengeId) {
    return { isValid: false, error: 'Challenge ID is required' };
  }

  const expiresAt = new Date(challenge.expiresAt);
  if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    return { isValid: false, error: 'Invalid or expired challenge' };
  }

  return { isValid: true };
}

// ======================
// GENERAL VALIDATORS
// ======================

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  if (!PATTERNS.EMAIL.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string, required = false): ValidationResult {
  if (!url) {
    return { 
      isValid: !required, 
      error: required ? 'URL is required' : undefined 
    };
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate IPFS hash
 */
export function validateIPFSHash(hash: string): ValidationResult {
  if (!hash) {
    return { isValid: false, error: 'IPFS hash is required' };
  }

  if (!PATTERNS.IPFS_HASH.test(hash)) {
    return { isValid: false, error: 'Invalid IPFS hash format' };
  }

  return { isValid: true };
}

/**
 * Validate date string
 */
export function validateDateString(dateString: string): ValidationResult {
  if (!dateString) {
    return { isValid: false, error: 'Date is required' };
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }

  return { isValid: true };
}

/**
 * Validate date is in the future
 */
export function validateFutureDate(dateString: string): ValidationResult {
  const dateValidation = validateDateString(dateString);
  if (!dateValidation.isValid) return dateValidation;

  const date = new Date(dateString);
  if (date <= new Date()) {
    return { isValid: false, error: 'Date must be in the future' };
  }

  return { isValid: true };
}

// ======================
// BATCH VALIDATORS
// ======================

/**
 * Validate multiple values and return all errors
 */
export function validateBatch(
  validations: Array<{
    value: any;
    validator: (value: any) => ValidationResult;
    field?: string;
  }>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const { value, validator, field } of validations) {
    const result = validator(value);
    if (!result.isValid) {
      const error = field ? `${field}: ${result.error}` : result.error;
      if (error) errors.push(error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create a validator that checks if value exists in allowed values
 */
export function createEnumValidator<T extends string>(
  allowedValues: readonly T[],
  fieldName: string
) {
  return (value: string): ValidationResult => {
    if (!allowedValues.includes(value as T)) {
      return {
        isValid: false,
        error: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      };
    }
    return { isValid: true };
  };
}

/**
 * Create a validator that checks string length
 */
export function createLengthValidator(
  minLength: number,
  maxLength: number,
  fieldName: string
) {
  return (value: string): ValidationResult => {
    if (!value) {
      return { isValid: false, error: `${fieldName} is required` };
    }

    if (value.length < minLength) {
      return {
        isValid: false,
        error: `${fieldName} must be at least ${minLength} characters`,
      };
    }

    if (value.length > maxLength) {
      return {
        isValid: false,
        error: `${fieldName} cannot exceed ${maxLength} characters`,
      };
    }

    return { isValid: true };
  };
}