// services/external/tokenDiscount.service.ts
import { JsonRpcProvider, Contract, formatUnits } from 'ethers';
import erc20Abi from '../../abi/erc20Minimal.json';
import { TOKEN_DISCOUNT_TIERS } from '../../constants/tokenDiscounts';

const provider = new JsonRpcProvider(process.env.BASE_RPC_URL);
const tokenContract = new Contract(process.env.TOKEN_CONTRACT_ADDRESS!, erc20Abi, provider);

export class TokenDiscountService {
  async getCouponForWallet(walletAddress: string): Promise<string | undefined> {
    try {
      const raw = await tokenContract.balanceOf(walletAddress);
      const balance = parseFloat(formatUnits(raw, 18));
      return this.getCouponForBalance(balance);
    } catch (error) {
      console.error('Error checking token balance:', error);
      return undefined;
    }
  }

  private getCouponForBalance(balance: number): string | undefined {
    for (const tier of TOKEN_DISCOUNT_TIERS) {
      if (balance >= tier.threshold) {
        return tier.couponId;
      }
    }
    return undefined;
  }

  async getDiscountInfoForWallet(walletAddress: string): Promise<{
    balance: number;
    couponId?: string;
    discountPercentage?: number;
    tierName?: string;
  } | null> {
    try {
      const raw = await tokenContract.balanceOf(walletAddress);
      const balance = parseFloat(formatUnits(raw, 18));
      
      const tier = TOKEN_DISCOUNT_TIERS.find(t => balance >= t.threshold);
      
      return {
        balance,
        couponId: tier?.couponId,
        discountPercentage: tier?.discountPercentage,
        tierName: tier?.name
      };
    } catch (error) {
      console.error('Error getting discount info:', error);
      return null;
    }
  }

  getAvailableTiers(): typeof TOKEN_DISCOUNT_TIERS {
    return TOKEN_DISCOUNT_TIERS;
  }

  validateWalletAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}