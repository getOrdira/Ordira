//src/types/dashboard.ts
export interface DashboardStats {
  nftCount: number;
  totalYes: number;
  totalNo: number;
  certCount: number;
  votesOpen: number;
  products: number;
  integrations: number;
  domains: number;
}

export interface LatestMint {
  hash: string;
  orderId: string;
  time?: string;
}

export interface LatestVote {
  userId: string;
  txHash: string;
  products: string[];
}

export interface LatestProduct {
  title: string;
  description: string;
  imageUrl: string;
}

export interface VotingOption {
  label: string;
  count: number;
}

export interface Integration {
  type: 'Shopify' | 'WooCommerce' | 'Manufacturer';
  id?: string;
  name?: string;
  date: string;
  profileUrl?: string;
}

export interface Domain {
  name: string;
  created: string;
}

export interface CurrentPlan {
  tier: string;
  nextPayment: string;
  certLimit: number;
  certUsed: number;
  voteLimit: number;
  voteUsed: number;
}
