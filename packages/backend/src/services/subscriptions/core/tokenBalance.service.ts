import { Contract, JsonRpcProvider, formatUnits } from 'ethers';
import erc20Abi from '../../../abi/erc20Minimal.json';
import { SubscriptionError } from '../utils/errors';
import { logger } from '../../../utils/logger';

/**
 * Handles blockchain interactions required for token-based subscription discounts.
 */
export class TokenBalanceService {
  private readonly provider: JsonRpcProvider;
  private readonly contract: Contract;
  private readonly decimals: number;

  constructor(
    provider?: JsonRpcProvider,
    contract?: Contract,
    decimals = 18,
    rpcUrl: string = process.env.BASE_RPC_URL ?? '',
    contractAddress: string = process.env.TOKEN_CONTRACT_ADDRESS ?? ''
  ) {
    if (!provider) {
      if (!rpcUrl) {
        throw new SubscriptionError('BASE_RPC_URL is not configured', 500);
      }
      this.provider = new JsonRpcProvider(rpcUrl);
    } else {
      this.provider = provider;
    }

    if (!contract) {
      if (!contractAddress) {
        throw new SubscriptionError('TOKEN_CONTRACT_ADDRESS is not configured', 500);
      }
      this.contract = new Contract(contractAddress, erc20Abi, this.provider);
    } else {
      this.contract = contract;
    }

    this.decimals = decimals;
  }

  /**
   * Checks whether a wallet address is a valid Ethereum-style address.
   */
  validateWalletAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Returns the token balance for the provided wallet.
   */
  async getWalletBalance(walletAddress: string): Promise<number> {
    if (!this.validateWalletAddress(walletAddress)) {
      throw new SubscriptionError('Invalid wallet address format', 400);
    }

    try {
      const rawBalance = await this.contract.balanceOf(walletAddress);
      return parseFloat(formatUnits(rawBalance, this.decimals));
    } catch (error) {
      logger.error('Failed to fetch wallet balance', { walletAddress, error });
      throw new SubscriptionError('Failed to fetch wallet balance', 502);
    }
  }
}

export const tokenBalanceService = new TokenBalanceService();
