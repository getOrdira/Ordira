// src/lib/validation/sanitizers/blockchain.ts
// Blockchain-specific sanitizers aligned with backend validation helpers.

import { sanitizeNumber, sanitizeOptionalString, sanitizeString } from './primitives';

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
const HEX_DATA_REGEX = /^0x[a-fA-F0-9]*$/;

export const sanitizeHex = (value: unknown, field = 'hex'): string => {
  return sanitizeString(value, field, {
    pattern: HEX_DATA_REGEX,
    toLowerCase: true,
    allowEmpty: false
  });
};

export const sanitizeOptionalHex = (value: unknown, field = 'hex'): string | undefined => {
  return sanitizeOptionalString(value, field, {
    pattern: HEX_DATA_REGEX,
    toLowerCase: true
  });
};

export const sanitizeEthereumAddress = (value: unknown, field = 'address'): string => {
  return sanitizeString(value, field, {
    pattern: ETH_ADDRESS_REGEX,
    toLowerCase: true,
    trim: true,
    allowEmpty: false
  });
};

export const sanitizeOptionalEthereumAddress = (value: unknown, field = 'address'): string | undefined => {
  return sanitizeOptionalString(value, field, {
    pattern: ETH_ADDRESS_REGEX,
    toLowerCase: true,
    trim: true
  });
};

export const sanitizeTransactionHash = (value: unknown, field = 'transactionHash'): string => {
  return sanitizeString(value, field, {
    pattern: TX_HASH_REGEX,
    toLowerCase: true,
    trim: true
  });
};

export const sanitizeOptionalTransactionHash = (value: unknown, field = 'transactionHash'): string | undefined => {
  return sanitizeOptionalString(value, field, {
    pattern: TX_HASH_REGEX,
    toLowerCase: true,
    trim: true
  });
};

export const sanitizeChainId = (value: unknown, field = 'chainId'): number => {
  return sanitizeNumber(value, field, {
    integer: true,
    positive: true
  });
};

export const sanitizeOptionalChainId = (value: unknown, field = 'chainId'): number | undefined => {
  return value === undefined || value === null || value === ''
    ? undefined
    : sanitizeChainId(value, field);
};

export const sanitizeGasLimit = (value: unknown, field = 'gasLimit'): number => {
  return sanitizeNumber(value, field, {
    integer: true,
    positive: true
  });
};

export const sanitizeOptionalGasLimit = (value: unknown, field = 'gasLimit'): number | undefined => {
  return value === undefined || value === null || value === ''
    ? undefined
    : sanitizeGasLimit(value, field);
};

export const sanitizePriorityFee = (value: unknown, field = 'priorityFee'): number => {
  return sanitizeNumber(value, field, {
    positive: true
  });
};

export const sanitizeOptionalPriorityFee = (value: unknown, field = 'priorityFee'): number | undefined => {
  return value === undefined || value === null || value === ''
    ? undefined
    : sanitizePriorityFee(value, field);
};

