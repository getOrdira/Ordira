// types/blockchain.types.ts

export interface TokenBalance {
  address: string;
  balance: string;
  balanceFormatted: string;
}

export interface TransactionReceipt {
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  status: number;
}

export interface TransferResult {
  transferredAt: Date;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  gasPrice: string;
  verificationUrl: string;
  ownershipProof: string;
  txHash: string;
  from: string;
  to: string;
  tokenId?: string;
  amount?: string;
  contractAddress: string;
  businessId: string;
  tokenType: 'ERC20' | 'ERC721' | 'ERC1155' | 'ETH';
  value?: string;
  valueFormatted?: string;
  gasLimit?: string;
  gasPriceGwei?: string;
  success: boolean;
  error?: string;
}

export interface NetworkInfo {
  chainId: number;
  blockNumber: number;
  gasPrice: string;
  network: string;
}

export interface ContractDeployment {
  address: string;
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  businessId: string;
}

export interface VoteEvent {
  proposalId: string;
  voter: string;
  support: boolean;
  blockNumber: number;
  txHash: string;
  timestamp?: number;
}


export interface NftMintResult {
  tokenId: string;
  txHash: string;
  recipient: string;
  blockNumber: number;
  contractAddress: string;
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  totalCost: string;
  totalCostFormatted: string;
}

export interface BlockInfo {
  number: number;
  hash: string;
  timestamp: number;
  gasUsed: string;
  gasLimit: string;
  baseFeePerGas?: string;
}

export interface ContractCall {
  contractAddress: string;
  abi: any[];
  methodName: string;
  params: any[];
}

export interface BatchCallResult {
  success: boolean;
  result?: any;
  error?: string;
  contractAddress: string;
  methodName: string;
}

export interface WalletInfo {
  address: string;
  ethBalance: string;
  ethBalanceFormatted: string;
  tokenBalance?: TokenBalance;
  nonce: number;
}

export interface ContractInfo {
  address: string;
  isContract: boolean;
  bytecodeHash?: string;
  creator?: string;
  creationTxHash?: string;
}

export interface PendingTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  nonce: number;
  timestamp: number;
}

export interface VotingContractInfo {
  contractAddress: string;
  totalProposals: number;
  totalVotes: number;
  activeProposals: number;
  businessId: string;
}

export interface NftContractInfo {
  contractAddress: string;
  totalSupply: number;
  name: string;
  symbol: string;
  owner: string;
  businessId: string;
}

export interface ProposalInfo {
  id: string;
  title: string;
  description: string;
  startBlock: number;
  endBlock: number;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  status: 'pending' | 'active' | 'succeeded' | 'failed' | 'executed';
  creator: string;
}

export interface TokenTransfer {
  from: string;
  to: string;
  amount: string;
  amountFormatted: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

export interface ContractEvent {
  eventName: string;
  contractAddress: string;
  txHash: string;
  blockNumber: number;
  logIndex: number;
  args: Record<string, any>;
  timestamp?: number;
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}


export type ContractMethodResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  gasUsed?: string;
  txHash?: string;
};


export type TransactionStatus = 'pending' | 'success' | 'failed' | 'not_found';


export type GasPriority = 'slow' | 'standard' | 'fast';


export interface EventFilter {
  contractAddress: string;
  eventName: string;
  fromBlock?: number;
  toBlock?: number;
  topics?: string[];
}

export interface EventLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  txHash: string;
  logIndex: number;
  removed: boolean;
}