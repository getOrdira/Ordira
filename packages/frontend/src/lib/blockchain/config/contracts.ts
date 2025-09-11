// src/lib/blockchain/config/contracts.ts
import { Address } from 'viem';
import { base, baseSepolia, mainnet } from './chains';

// Contract address mapping per chain
export const contractAddresses = {
  // Base Mainnet
  [base.id]: {
    certificateNFT: (process.env.NEXT_PUBLIC_CERTIFICATE_NFT_BASE || '0x0000000000000000000000000000000000000000') as Address,
    votingContract: (process.env.NEXT_PUBLIC_VOTING_CONTRACT_BASE || '0x0000000000000000000000000000000000000000') as Address,
    votingFactory: (process.env.NEXT_PUBLIC_VOTING_FACTORY_BASE || '0x0000000000000000000000000000000000000000') as Address,
    tokenContract: (process.env.NEXT_PUBLIC_TOKEN_CONTRACT_BASE || '0x0000000000000000000000000000000000000000') as Address,
    relayerWallet: (process.env.NEXT_PUBLIC_RELAYER_WALLET_BASE || '0x0000000000000000000000000000000000000000') as Address,
  },
  
  // Base Sepolia Testnet
  [baseSepolia.id]: {
    certificateNFT: (process.env.NEXT_PUBLIC_CERTIFICATE_NFT_BASE_SEPOLIA || '0x0000000000000000000000000000000000000000') as Address,
    votingContract: (process.env.NEXT_PUBLIC_VOTING_CONTRACT_BASE_SEPOLIA || '0x0000000000000000000000000000000000000000') as Address,
    votingFactory: (process.env.NEXT_PUBLIC_VOTING_FACTORY_BASE_SEPOLIA || '0x0000000000000000000000000000000000000000') as Address,
    tokenContract: (process.env.NEXT_PUBLIC_TOKEN_CONTRACT_BASE_SEPOLIA || '0x0000000000000000000000000000000000000000') as Address,
    relayerWallet: (process.env.NEXT_PUBLIC_RELAYER_WALLET_BASE_SEPOLIA || '0x0000000000000000000000000000000000000000') as Address,
  },
  
  // Ethereum Mainnet (for token balance checks)
  [mainnet.id]: {
    certificateNFT: '0x0000000000000000000000000000000000000000' as Address, // Not deployed
    votingContract: '0x0000000000000000000000000000000000000000' as Address, // Not deployed
    votingFactory: '0x0000000000000000000000000000000000000000' as Address, // Not deployed
    tokenContract: (process.env.NEXT_PUBLIC_TOKEN_CONTRACT_MAINNET || '0x0000000000000000000000000000000000000000') as Address,
    relayerWallet: '0x0000000000000000000000000000000000000000' as Address, // Not used
  },
  
} as const;

// Contract ABI definitions (simplified for key functions)
export const certificateNFTABI = [
  // Read functions
  {
    type: 'function',
    name: 'ownerOf',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokenOfOwnerByIndex',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  
  // Events
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true }
    ],
  },
] as const;

export const votingContractABI = [
  // Read functions
  {
    type: 'function',
    name: 'getProposal',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [{ 
      name: '', 
      type: 'tuple',
      components: [
        { name: 'id', type: 'uint256' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'yesVotes', type: 'uint256' },
        { name: 'noVotes', type: 'uint256' },
        { name: 'isActive', type: 'bool' },
        { name: 'endTime', type: 'uint256' }
      ]
    }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'hasVoted',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'voter', type: 'address' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getActiveProposals',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  
  // Events
  {
    type: 'event',
    name: 'ProposalCreated',
    inputs: [
      { name: 'proposalId', type: 'uint256', indexed: true },
      { name: 'title', type: 'string', indexed: false },
      { name: 'endTime', type: 'uint256', indexed: false }
    ],
  },
  {
    type: 'event',
    name: 'VoteCast',
    inputs: [
      { name: 'proposalId', type: 'uint256', indexed: true },
      { name: 'voter', type: 'address', indexed: true },
      { name: 'support', type: 'bool', indexed: false }
    ],
  },
] as const;

export const tokenContractABI = [
  // Standard ERC20 functions
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const;

export const votingFactoryABI = [
  {
    type: 'function',
    name: 'deployVoting',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'VotingDeployed',
    inputs: [
      { name: 'brand', type: 'address', indexed: true },
      { name: 'votingAddress', type: 'address', indexed: true }
    ],
  },
] as const;

// Contract configurations
export const contractConfig = {
  certificateNFT: {
    name: 'Certificate NFT',
    description: 'NFT certificates for manufacturing products',
    abi: certificateNFTABI,
    deployedChains: [base.id, baseSepolia.id],
  },
  votingContract: {
    name: 'Voting Contract',
    description: 'Decentralized voting system for brand decisions',
    abi: votingContractABI,
    deployedChains: [base.id, baseSepolia.id],
  },
  votingFactory: {
    name: 'Voting Factory',
    description: 'Factory contract for deploying new voting instances',
    abi: votingFactoryABI,
    deployedChains: [base.id, baseSepolia.id],
  },
  tokenContract: {
    name: 'Platform Token',
    description: 'ERC20 token for platform benefits and discounts',
    abi: tokenContractABI,
    deployedChains: [base.id, baseSepolia.id, mainnet.id, polygon.id],
  },
} as const;

// Helper functions
export function getContractAddress(chainId: number, contractName: keyof typeof contractAddresses[number]) {
  return contractAddresses[chainId as keyof typeof contractAddresses]?.[contractName];
}

export function getContractABI(contractName: keyof typeof contractConfig) {
  return contractConfig[contractName].abi;
}

export function isContractDeployed(chainId: number, contractName: keyof typeof contractAddresses[number]): boolean {
  const address = getContractAddress(chainId, contractName);
  return address !== '0x0000000000000000000000000000000000000000';
}

export function getDeployedChains(contractName: keyof typeof contractConfig): number[] {
  return contractConfig[contractName].deployedChains;
}

// Contract interaction configurations
export const contractInteractionConfig = {
  // Gas limits for different operations
  gasLimits: {
    tokenBalanceCheck: 50000n,
    ownershipCheck: 100000n,
    voting: 150000n,
    transferCertificate: 200000n, // This happens via relayer, not direct
  },
  
  // Retry configurations
  retryConfig: {
    attempts: 3,
    delay: 1000, // 1 second
    backoff: 2, // exponential backoff multiplier
  },
  
  // Timeout configurations
  timeouts: {
    readOperation: 10000, // 10 seconds
    writeOperation: 30000, // 30 seconds (not used much due to relayer)
  },
} as const;

// Default token configurations for discount checks
export const defaultTokenConfig = {
  minimumBalanceForDiscount: BigInt('1000000000000000000'), // 1 token (18 decimals)
  discountPercentage: 10, // 10% discount
  maxDiscountAmount: BigInt('100000000000000000000'), // 100 tokens max discount
} as const;