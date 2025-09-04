// src/lib/blockchain/utils/formatters.ts
import { formatUnits, parseUnits } from 'viem';
import type { Address, Hash } from 'viem';
import { PLATFORM_TOKEN_DECIMALS, BLOCK_EXPLORERS, NATIVE_CURRENCIES } from './constants';

// ======================
// ADDRESS FORMATTERS
// ======================

/**
 * Shorten an Ethereum address for display
 * @param address - The address to shorten
 * @param startLength - Number of characters to show at start
 * @param endLength - Number of characters to show at end
 */
export function shortenAddress(
  address: Address,
  startLength: number = 6,
  endLength: number = 4
): string {
  if (!address) return '';
  if (address.length < startLength + endLength + 2) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Format an address for display with ENS name fallback
 */
export function formatAddressWithENS(address: Address, ensName?: string): string {
  if (ensName) return ensName;
  return shortenAddress(address);
}

/**
 * Format an address for display in different contexts
 */
export function formatAddress(
  address: Address,
  format: 'short' | 'medium' | 'long' | 'full' = 'short'
): string {
  if (!address) return '';
  
  switch (format) {
    case 'short':
      return shortenAddress(address, 6, 4);
    case 'medium':
      return shortenAddress(address, 8, 6);
    case 'long':
      return shortenAddress(address, 10, 8);
    case 'full':
      return address;
    default:
      return shortenAddress(address);
  }
}

// ======================
// HASH FORMATTERS
// ======================

/**
 * Shorten a transaction hash for display
 */
export function shortenHash(hash: Hash, length: number = 6): string {
  if (!hash) return '';
  return `${hash.slice(0, length + 2)}...${hash.slice(-length)}`;
}

/**
 * Format hash for different display contexts
 */
export function formatHash(
  hash: Hash,
  format: 'short' | 'medium' | 'long' | 'full' = 'short'
): string {
  if (!hash) return '';
  
  switch (format) {
    case 'short':
      return shortenHash(hash, 6);
    case 'medium':
      return shortenHash(hash, 10);
    case 'long':
      return shortenHash(hash, 16);
    case 'full':
      return hash;
    default:
      return shortenHash(hash);
  }
}

// ======================
// TOKEN FORMATTERS
// ======================

/**
 * Format token balance with proper decimals
 */
export function formatTokenBalance(
  balance: bigint | string,
  decimals: number = PLATFORM_TOKEN_DECIMALS,
  displayDecimals?: number,
  includeSymbol: boolean = false,
  symbol: string = ''
): string {
  const balanceBigInt = typeof balance === 'string' ? BigInt(balance) : balance;
  const formatted = formatUnits(balanceBigInt, decimals);
  const num = parseFloat(formatted);
  
  if (num === 0) return includeSymbol ? `0 ${symbol}` : '0';
  
  // Handle very small numbers
  if (num < 0.0001) {
    return includeSymbol ? `< 0.0001 ${symbol}` : '< 0.0001';
  }
  
  // Determine display decimals if not specified
  const finalDisplayDecimals = displayDecimals ?? (num >= 1 ? 4 : 6);
  
  const formattedNum = num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: finalDisplayDecimals,
  });
  
  return includeSymbol ? `${formattedNum} ${symbol}` : formattedNum;
}

/**
 * Format token balance with compact notation for large numbers
 */
export function formatTokenBalanceCompact(
  balance: bigint | string,
  decimals: number = PLATFORM_TOKEN_DECIMALS,
  symbol: string = ''
): string {
  const balanceBigInt = typeof balance === 'string' ? BigInt(balance) : balance;
  const formatted = formatUnits(balanceBigInt, decimals);
  const num = parseFloat(formatted);
  
  if (num === 0) return symbol ? `0 ${symbol}` : '0';
  if (num < 0.0001) return symbol ? `< 0.0001 ${symbol}` : '< 0.0001';
  
  const compactFormatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  });
  
  const compactNum = compactFormatter.format(num);
  return symbol ? `${compactNum} ${symbol}` : compactNum;
}

/**
 * Parse token amount to Wei/smallest unit
 */
export function parseTokenAmount(amount: string, decimals: number = PLATFORM_TOKEN_DECIMALS): bigint {
  try {
    return parseUnits(amount, decimals);
  } catch (error) {
    throw new Error(`Invalid token amount: ${amount}`);
  }
}

// ======================
// CURRENCY FORMATTERS
// ======================

/**
 * Format USD amount
 */
export function formatUSD(
  amount: number | string,
  options: {
    showCents?: boolean;
    showSymbol?: boolean;
    compact?: boolean;
  } = {}
): string {
  const { showCents = true, showSymbol = true, compact = false } = options;
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) return showSymbol ? '$0.00' : '0.00';
  
  const formatOptions: Intl.NumberFormatOptions = {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  };
  
  if (compact && Math.abs(num) >= 1000) {
    formatOptions.notation = 'compact';
    formatOptions.maximumFractionDigits = 1;
  }
  
  return new Intl.NumberFormat('en-US', formatOptions).format(num);
}

/**
 * Format percentage
 */
export function formatPercentage(
  value: number,
  options: {
    decimals?: number;
    showSign?: boolean;
    showSymbol?: boolean;
  } = {}
): string {
  const { decimals = 1, showSign = false, showSymbol = true } = options;
  
  if (isNaN(value)) return showSymbol ? '0%' : '0';
  
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: showSign ? 'always' : 'auto',
  });
  
  const formatted = formatter.format(value);
  return showSymbol ? `${formatted}%` : formatted;
}

// ======================
// GAS AND ETH FORMATTERS
// ======================

/**
 * Format gas amount
 */
export function formatGas(gasUsed: bigint | string | number): string {
  const gas = typeof gasUsed === 'bigint' ? Number(gasUsed) : typeof gasUsed === 'string' ? parseInt(gasUsed) : gasUsed;
  
  if (gas < 1000) return gas.toString();
  if (gas < 1000000) return `${(gas / 1000).toFixed(1)}K`;
  return `${(gas / 1000000).toFixed(2)}M`;
}

/**
 * Format ETH amount (native currency)
 */
export function formatETH(
  amount: bigint | string,
  options: {
    decimals?: number;
    showSymbol?: boolean;
    compact?: boolean;
  } = {}
): string {
  const { decimals = 6, showSymbol = true, compact = false } = options;
  const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
  const formatted = formatUnits(amountBigInt, 18); // ETH has 18 decimals
  const num = parseFloat(formatted);
  
  if (num === 0) return showSymbol ? '0 ETH' : '0';
  
  let finalDecimals = decimals;
  if (num < 0.000001) finalDecimals = 8; // Show more decimals for very small amounts
  else if (num < 0.001) finalDecimals = 6;
  else if (num >= 1) finalDecimals = 4;
  
  const formatOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: finalDecimals,
  };
  
  if (compact && num >= 1000) {
    formatOptions.notation = 'compact';
    formatOptions.maximumFractionDigits = 2;
  }
  
  const formattedNum = new Intl.NumberFormat('en-US', formatOptions).format(num);
  return showSymbol ? `${formattedNum} ETH` : formattedNum;
}

/**
 * Format gas price in Gwei
 */
export function formatGasPrice(gasPriceWei: bigint | string): string {
  const gasPriceBigInt = typeof gasPriceWei === 'string' ? BigInt(gasPriceWei) : gasPriceWei;
  const gwei = formatUnits(gasPriceBigInt, 9); // Gwei has 9 decimals
  const num = parseFloat(gwei);
  
  if (num < 0.1) return `${num.toFixed(3)} Gwei`;
  if (num < 1) return `${num.toFixed(2)} Gwei`;
  return `${num.toFixed(1)} Gwei`;
}

// ======================
// TIME FORMATTERS
// ======================

/**
 * Format timestamp to relative time (e.g., "2 minutes ago")
 */
export function formatTimeAgo(timestamp: number | string | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // For older dates, show actual date
  return date.toLocaleDateString();
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}

/**
 * Format date for display
 */
export function formatDate(
  date: Date | string | number,
  format: 'short' | 'medium' | 'long' | 'datetime' = 'medium'
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString();
    case 'medium':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    case 'datetime':
      return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    default:
      return dateObj.toLocaleDateString();
  }
}

// ======================
// BLOCKCHAIN SPECIFIC FORMATTERS
// ======================

/**
 * Format block number
 */
export function formatBlockNumber(blockNumber: number | bigint): string {
  const num = typeof blockNumber === 'bigint' ? Number(blockNumber) : blockNumber;
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Generate explorer URL for transaction
 */
export function getTransactionExplorerUrl(txHash: Hash, chainId: number): string {
  const explorerUrl = BLOCK_EXPLORERS[chainId as keyof typeof BLOCK_EXPLORERS];
  return explorerUrl ? `${explorerUrl}/tx/${txHash}` : '';
}

/**
 * Generate explorer URL for address
 */
export function getAddressExplorerUrl(address: Address, chainId: number): string {
  const explorerUrl = BLOCK_EXPLORERS[chainId as keyof typeof BLOCK_EXPLORERS];
  return explorerUrl ? `${explorerUrl}/address/${address}` : '';
}

/**
 * Generate explorer URL for token
 */
export function getTokenExplorerUrl(tokenAddress: Address, chainId: number): string {
  const explorerUrl = BLOCK_EXPLORERS[chainId as keyof typeof BLOCK_EXPLORERS];
  return explorerUrl ? `${explorerUrl}/token/${tokenAddress}` : '';
}

// ======================
// CERTIFICATE FORMATTERS
// ======================

/**
 * Format certificate ID for display
 */
export function formatCertificateId(certificateId: string): string {
  if (certificateId.length <= 12) return certificateId;
  return `${certificateId.slice(0, 8)}...${certificateId.slice(-4)}`;
}

/**
 * Format token ID for display
 */
export function formatTokenId(tokenId: string | bigint): string {
  const id = typeof tokenId === 'bigint' ? tokenId.toString() : tokenId;
  const num = parseInt(id);
  
  if (num < 10000) return `#${id}`;
  return `#${new Intl.NumberFormat('en-US').format(num)}`;
}

/**
 * Format certificate status for display
 */
export function formatCertificateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    minted: 'Minted',
    transferred: 'Transferred',
    delivered: 'Delivered',
    failed: 'Failed',
    revoked: 'Revoked',
  };
  
  return statusMap[status] || status;
}

/**
 * Format certificate ownership status
 */
export function formatOwnershipStatus(status: string): string {
  const statusMap: Record<string, string> = {
    relayer: 'In Relayer Wallet',
    brand: 'In Brand Wallet',
    external: 'External Wallet',
    revoked: 'Revoked',
  };
  
  return statusMap[status] || status;
}

// ======================
// DISCOUNT AND PRICING FORMATTERS
// ======================

/**
 * Format discount amount
 */
export function formatDiscount(
  amount: number | string,
  type: 'percentage' | 'fixed' = 'percentage'
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (type === 'percentage') {
    return `${num}% off`;
  }
  
  return `${num.toFixed(2)} off`;
}

/**
 * Format discount tier for display
 */
export function formatDiscountTier(tier: string): string {
  const tierMap: Record<string, string> = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
  };
  
  return tierMap[tier] || tier;
}

/**
 * Calculate and format savings
 */
export function formatSavings(
  originalAmount: number | string,
  discountedAmount: number | string
): string {
  const original = typeof originalAmount === 'string' ? parseFloat(originalAmount) : originalAmount;
  const discounted = typeof discountedAmount === 'string' ? parseFloat(discountedAmount) : discountedAmount;
  const savings = original - discounted;
  
  return formatUSD(savings, { compact: true });
}

// ======================
// VALIDATION FORMATTERS
// ======================

/**
 * Format validation error message
 */
export function formatValidationError(error: string, field?: string): string {
  if (field) {
    return `${field}: ${error}`;
  }
  return error;
}

/**
 * Format multiple validation errors
 */
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 1) return errors[0];
  if (errors.length === 2) return `${errors[0]} and ${errors[1]}`;
  
  const lastError = errors.pop();
  return `${errors.join(', ')}, and ${lastError}`;
}

// ======================
// NETWORK AND PERFORMANCE FORMATTERS
// ======================

/**
 * Format network latency
 */
export function formatLatency(latencyMs: number): string {
  if (latencyMs < 50) return `${latencyMs}ms (Excellent)`;
  if (latencyMs < 100) return `${latencyMs}ms (Good)`;
  if (latencyMs < 200) return `${latencyMs}ms (Fair)`;
  return `${latencyMs}ms (Poor)`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

/**
 * Format success rate as percentage
 */
export function formatSuccessRate(successful: number, total: number): string {
  if (total === 0) return '0%';
  const rate = (successful / total) * 100;
  return `${rate.toFixed(1)}%`;
}

// ======================
// HELPER FUNCTIONS
// ======================

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert camelCase to Title Case
 */
export function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, match => match.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Format number with proper pluralization
 */
export function formatPlural(count: number, singular: string, plural?: string): string {
  const pluralForm = plural || `${singular}s`;
  const formattedCount = new Intl.NumberFormat('en-US').format(count);
  return `${formattedCount} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Format large numbers with K/M/B suffixes
 */
export function formatLargeNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
  return `${(num / 1000000000).toFixed(1)}B`;
}

/**
 * Format ordinal numbers (1st, 2nd, 3rd, etc.)
 */
export function formatOrdinal(num: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const value = num % 100;
  const suffix = suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];
  return `${num}${suffix}`;
}