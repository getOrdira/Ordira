import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import axios from 'axios';

// ===== TYPES =====

type NftStatus = 'draft' | 'minting' | 'minted' | 'listed' | 'sold' | 'burned' | 'error';
type NftStandard = 'ERC-721' | 'ERC-1155';
type BlockchainNetwork = 'ethereum' | 'polygon' | 'base' | 'arbitrum' | 'optimism';
type UtilityType = 'access' | 'discount' | 'reward' | 'membership' | 'experience' | 'physical_redemption';
type UtilityStatus = 'active' | 'inactive' | 'expired' | 'redeemed';

interface NftMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  animation_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: 'number' | 'boost_percentage' | 'boost_number' | 'date';
    max_value?: number;
  }>;
  properties?: Record<string, any>;
}

interface Nft {
  id: string;
  tokenId?: string;
  contractAddress?: string;
  standard: NftStandard;
  network: BlockchainNetwork;
  status: NftStatus;
  metadata: NftMetadata;
  owner?: {
    address: string;
    displayName?: string;
    avatar?: string;
  };
  creator: {
    address: string;
    displayName: string;
    avatar?: string;
  };
  collection?: {
    id: string;
    name: string;
    symbol: string;
    contractAddress: string;
    floorPrice?: number;
    totalSupply: number;
  };
  pricing: {
    mintPrice?: number;
    currentPrice?: number;
    lastSalePrice?: number;
    currency: string;
    priceHistory: Array<{
      price: number;
      currency: string;
      timestamp: string;
      marketplace?: string;
    }>;
  };
  rarity: {
    rank?: number;
    score?: number;
    totalSupply: number;
    rarityTier?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  };
  blockchain: {
    transactionHash?: string;
    blockNumber?: number;
    gasUsed?: number;
    timestamp?: string;
    confirmations: number;
  };
  utilities: Array<{
    id: string;
    type: UtilityType;
    title: string;
    description: string;
    status: UtilityStatus;
    value?: number;
    currency?: string;
    expiresAt?: string;
    redemptionCount: number;
    maxRedemptions?: number;
    conditions?: Record<string, any>;
  }>;
  marketplaceListings: Array<{
    marketplace: string;
    price: number;
    currency: string;
    listingUrl: string;
    expiresAt?: string;
  }>;
  provenance: Array<{
    event: 'minted' | 'transfer' | 'sale' | 'listing' | 'offer';
    from?: string;
    to: string;
    price?: number;
    currency?: string;
    timestamp: string;
    transactionHash: string;
  }>;
  analytics: {
    views: number;
    favorites: number;
    shares: number;
    offers: number;
    lastActivity?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface NftCollection {
  id: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  bannerImage?: string;
  contractAddress: string;
  network: BlockchainNetwork;
  standard: NftStandard;
  totalSupply: number;
  maxSupply?: number;
  mintedCount: number;
  floorPrice?: number;
  currency: string;
  volume: {
    total: number;
    '24h': number;
    '7d': number;
    '30d': number;
  };
  owners: {
    total: number;
    uniqueOwners: number;
  };
  royalties: {
    percentage: number;
    recipient: string;
  };
  traits: Array<{
    name: string;
    values: Array<{
      value: string;
      count: number;
      rarity: number;
    }>;
  }>;
  verification: {
    verified: boolean;
    verifiedBy?: string;
    badges: string[];
  };
  social: {
    website?: string;
    discord?: string;
    twitter?: string;
    telegram?: string;
  };
  creator: {
    address: string;
    displayName: string;
    avatar?: string;
    verified: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface CreateNftRequest {
  name: string;
  description: string;
  image: string;
  animation_url?: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
    max_value?: number;
  }>;
  collectionId?: string;
  mintPrice?: number;
  royaltyPercentage?: number;
  maxSupply?: number;
  utilities?: Array<{
    type: UtilityType;
    title: string;
    description: string;
    value?: number;
    currency?: string;
    expiresAt?: string;
    maxRedemptions?: number;
    conditions?: Record<string, any>;
  }>;
}

interface CreateCollectionRequest {
  name: string;
  symbol: string;
  description: string;
  image: string;
  bannerImage?: string;
  maxSupply?: number;
  royaltyPercentage: number;
  network: BlockchainNetwork;
  standard: NftStandard;
  social?: {
    website?: string;
    discord?: string;
    twitter?: string;
    telegram?: string;
  };
}

interface NftListQuery {
  page?: number;
  limit?: number;
  status?: NftStatus;
  collectionId?: string;
  owner?: string;
  creator?: string;
  network?: BlockchainNetwork;
  minPrice?: number;
  maxPrice?: number;
  traits?: Record<string, string[]>;
  sortBy?: 'createdAt' | 'price' | 'rarity' | 'lastSale' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

interface NftListResponse {
  nfts: Nft[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    collections: Array<{ id: string; name: string; count: number }>;
    traits: Record<string, Array<{ value: string; count: number }>>;
    priceRanges: Array<{ min: number; max: number; count: number }>;
    networks: Array<{ network: BlockchainNetwork; count: number }>;
  };
  analytics: {
    totalValue: number;
    averagePrice: number;
    floorPrice: number;
    volumeChange: number;
  };
}

interface NftUtility {
  id: string;
  nftId: string;
  type: UtilityType;
  title: string;
  description: string;
  status: UtilityStatus;
  value?: number;
  currency?: string;
  expiresAt?: string;
  redemptionCount: number;
  maxRedemptions?: number;
  conditions?: Record<string, any>;
  redemptionHistory: Array<{
    id: string;
    redeemedBy: string;
    redeemedAt: string;
    value?: number;
    notes?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface MarketplaceListing {
  id: string;
  nftId: string;
  marketplace: string;
  price: number;
  currency: string;
  listingUrl: string;
  status: 'active' | 'sold' | 'cancelled' | 'expired';
  seller: {
    address: string;
    displayName?: string;
  };
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface NftAnalytics {
  overview: {
    totalNfts: number;
    totalValue: number;
    totalSales: number;
    averagePrice: number;
    uniqueOwners: number;
  };
  performance: {
    topPerforming: Array<{
      nftId: string;
      name: string;
      sales: number;
      volume: number;
      priceChange: number;
    }>;
    recentSales: Array<{
      nftId: string;
      name: string;
      price: number;
      buyer: string;
      timestamp: string;
    }>;
  };
  market: {
    floorPrice: number;
    ceiling: number;
    averageHoldTime: number;
    liquidityScore: number;
    marketCap: number;
  };
  trends: Array<{
    date: string;
    volume: number;
    sales: number;
    averagePrice: number;
    uniqueTraders: number;
  }>;
  utilities: {
    totalUtilities: number;
    activeUtilities: number;
    redemptionRate: number;
    popularUtilityTypes: Array<{
      type: UtilityType;
      count: number;
      redemptionRate: number;
    }>;
  };
}

// ===== API FUNCTIONS =====

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const nftsApi = {
  // NFT CRUD operations
  getNfts: (params?: NftListQuery): Promise<NftListResponse> =>
    api.get('/nfts', { params }).then(res => res.data),

  getNftById: (nftId: string): Promise<Nft> =>
    api.get(`/nfts/${nftId}`).then(res => res.data),

  createNft: (data: CreateNftRequest): Promise<Nft> =>
    api.post('/nfts', data).then(res => res.data),

  updateNft: (nftId: string, data: Partial<CreateNftRequest>): Promise<Nft> =>
    api.put(`/nfts/${nftId}`, data).then(res => res.data),

  deleteNft: (nftId: string): Promise<{ success: boolean; message: string }> =>
    api.delete(`/nfts/${nftId}`).then(res => res.data),

  // Minting operations
  mintNft: (nftId: string, recipient?: string): Promise<{
    success: boolean;
    transactionHash: string;
    tokenId: string;
  }> =>
    api.post(`/nfts/${nftId}/mint`, { recipient }).then(res => res.data),

  batchMint: (nftIds: string[], recipients?: string[]): Promise<{
    success: boolean;
    results: Array<{ nftId: string; success: boolean; transactionHash?: string; error?: string }>;
  }> =>
    api.post('/nfts/batch-mint', { nftIds, recipients }).then(res => res.data),

  // Blockchain operations
  getBlockchainInfo: (nftId: string): Promise<{
    network: BlockchainNetwork;
    contractAddress: string;
    tokenId: string;
    owner: string;
    transactionHash: string;
    blockNumber: number;
    gasUsed: number;
    confirmations: number;
  }> =>
    api.get(`/nfts/${nftId}/blockchain-info`).then(res => res.data),

  refreshBlockchainData: (nftId: string): Promise<{ success: boolean; data: any }> =>
    api.post(`/nfts/${nftId}/refresh-blockchain`).then(res => res.data),

  getTransactions: (nftId: string, params?: { page?: number; limit?: number }): Promise<{
    transactions: Array<{
      hash: string;
      type: string;
      from: string;
      to: string;
      value: number;
      timestamp: string;
      status: 'success' | 'failed' | 'pending';
    }>;
    pagination: any;
  }> =>
    api.get(`/nfts/${nftId}/transactions`, { params }).then(res => res.data),

  // Verification operations
  verifyNft: (nftId: string, options?: { deep?: boolean }): Promise<{
    verified: boolean;
    authenticity: {
      contractVerified: boolean;
      metadataMatch: boolean;
      ownershipValid: boolean;
      provenanceIntact: boolean;
    };
    blockchainData: any;
    timestamp: string;
  }> =>
    api.post(`/nfts/${nftId}/verify`, { options }).then(res => res.data),

  verifyOnBlockchain: (nftId: string): Promise<{
    verified: boolean;
    onChainData: any;
    lastVerified: string;
  }> =>
    api.post(`/nfts/${nftId}/verify/blockchain`).then(res => res.data),

  getProvenance: (nftId: string): Promise<{
    provenance: Nft['provenance'];
    verified: boolean;
    creationBlock: number;
  }> =>
    api.get(`/nfts/${nftId}/provenance`).then(res => res.data),

  verifyProvenance: (nftId: string): Promise<{
    verified: boolean;
    integrity: boolean;
    issues: string[];
  }> =>
    api.post(`/nfts/${nftId}/provenance/verify`).then(res => res.data),

  // Utility management
  getNftUtilities: (nftId: string): Promise<{ utilities: NftUtility[] }> =>
    api.get(`/nfts/${nftId}/utilities`).then(res => res.data),

  addNftUtility: (nftId: string, data: {
    type: UtilityType;
    title: string;
    description: string;
    value?: number;
    currency?: string;
    expiresAt?: string;
    maxRedemptions?: number;
    conditions?: Record<string, any>;
  }): Promise<NftUtility> =>
    api.post(`/nfts/${nftId}/utilities/add`, data).then(res => res.data),

  updateNftUtility: (nftId: string, utilityId: string, data: any): Promise<NftUtility> =>
    api.put(`/nfts/${nftId}/utilities/${utilityId}`, data).then(res => res.data),

  removeNftUtility: (nftId: string, utilityId: string): Promise<{ success: boolean; message: string }> =>
    api.delete(`/nfts/${nftId}/utilities/${utilityId}`).then(res => res.data),

  redeemUtility: (nftId: string, utilityId: string, data?: { notes?: string }): Promise<{
    success: boolean;
    redemptionId: string;
    remainingRedemptions?: number;
  }> =>
    api.post(`/nfts/${nftId}/utilities/${utilityId}/redeem`, data).then(res => res.data),

  getUtilityRedemptionHistory: (nftId: string, utilityId: string, params?: { page?: number; limit?: number }): Promise<{
    history: NftUtility['redemptionHistory'];
    pagination: any;
  }> =>
    api.get(`/nfts/${nftId}/utilities/${utilityId}/redemption-history`, { params }).then(res => res.data),

  // Rarity and traits
  getNftRarity: (nftId: string): Promise<{
    rank: number;
    score: number;
    tier: string;
    totalSupply: number;
    percentile: number;
  }> =>
    api.get(`/nfts/${nftId}/rarity`).then(res => res.data),

  getRarityScore: (nftId: string): Promise<{
    overallScore: number;
    traitScores: Array<{
      trait: string;
      value: string;
      rarity: number;
      score: number;
    }>;
    ranking: {
      overall: number;
      percentile: number;
    };
  }> =>
    api.get(`/nfts/${nftId}/rarity-score`).then(res => res.data),

  getTraitsAnalysis: (nftId: string): Promise<{
    traits: Array<{
      name: string;
      value: string;
      rarity: number;
      floorPrice: number;
      count: number;
    }>;
    similarNfts: Array<{ id: string; name: string; similarity: number }>;
  }> =>
    api.get(`/nfts/${nftId}/traits-analysis`).then(res => res.data),

  getSimilarNfts: (nftId: string, params?: { limit?: number; minSimilarity?: number }): Promise<{
    similar: Array<{
      id: string;
      name: string;
      image: string;
      similarity: number;
      price?: number;
      matchingTraits: string[];
    }>;
  }> =>
    api.get(`/nfts/${nftId}/similar`, { params }).then(res => res.data),

  // Marketplace operations
  getMarketplaceListings: (nftId: string): Promise<{ listings: MarketplaceListing[] }> =>
    api.get(`/nfts/${nftId}/marketplace-listings`).then(res => res.data),

  listNftForSale: (nftId: string, data: {
    price: number;
    currency: string;
    marketplace: string;
    duration?: number;
  }): Promise<MarketplaceListing> =>
    api.post(`/nfts/${nftId}/list`, data).then(res => res.data),

  cancelListing: (nftId: string, listingId: string): Promise<{ success: boolean; message: string }> =>
    api.delete(`/nfts/${nftId}/list/${listingId}`).then(res => res.data),

  updateListing: (nftId: string, listingId: string, data: { price?: number; duration?: number }): Promise<MarketplaceListing> =>
    api.put(`/nfts/${nftId}/list/${listingId}`, data).then(res => res.data),

  // Analytics
  getNftAnalytics: (nftId: string, params?: { timeframe?: string; metrics?: string[] }): Promise<{
    performance: any;
    market: any;
    engagement: any;
    utilities: any;
  }> =>
    api.get(`/nfts/${nftId}/analytics`, { params }).then(res => res.data),

  getNftPerformance: (nftId: string, params?: { timeframe?: string }): Promise<{
    sales: number;
    volume: number;
    priceChange: number;
    holders: number;
    transfers: number;
  }> =>
    api.get(`/nfts/${nftId}/analytics/performance`, { params }).then(res => res.data),

  getMarketAnalytics: (nftId: string, params?: { timeframe?: string }): Promise<{
    marketCap: number;
    floorPrice: number;
    volume: number;
    sales: number;
    uniqueTraders: number;
  }> =>
    api.get(`/nfts/${nftId}/analytics/market`, { params }).then(res => res.data),

  getPriceHistory: (nftId: string, params?: { timeframe?: string; interval?: string }): Promise<{
    history: Array<{
      timestamp: string;
      price: number;
      currency: string;
      marketplace?: string;
    }>;
    statistics: {
      min: number;
      max: number;
      average: number;
      volatility: number;
    };
  }> =>
    api.get(`/nfts/${nftId}/price-history`, { params }).then(res => res.data),

  getValuation: (nftId: string): Promise<{
    estimatedValue: number;
    currency: string;
    confidence: number;
    factors: Array<{
      factor: string;
      weight: number;
      impact: 'positive' | 'negative' | 'neutral';
    }>;
    comparables: Array<{
      id: string;
      name: string;
      price: number;
      similarity: number;
    }>;
  }> =>
    api.get(`/nfts/${nftId}/valuation`).then(res => res.data),

  // Collection operations
  getCollections: (params?: { page?: number; limit?: number; search?: string; network?: BlockchainNetwork }): Promise<{
    collections: NftCollection[];
    pagination: any;
  }> =>
    api.get('/nfts/collections', { params }).then(res => res.data),

  getCollectionById: (collectionId: string): Promise<NftCollection> =>
    api.get(`/nfts/collections/${collectionId}`).then(res => res.data),

  createCollection: (data: CreateCollectionRequest): Promise<NftCollection> =>
    api.post('/nfts/collections', data).then(res => res.data),

  updateCollection: (collectionId: string, data: Partial<CreateCollectionRequest>): Promise<NftCollection> =>
    api.put(`/nfts/collections/${collectionId}`, data).then(res => res.data),

  getCollectionNfts: (collectionId: string, params?: NftListQuery): Promise<NftListResponse> =>
    api.get(`/nfts/collections/${collectionId}/nfts`, { params }).then(res => res.data),

  getCollectionAnalytics: (collectionId: string, params?: { timeframe?: string }): Promise<NftAnalytics> =>
    api.get(`/nfts/collections/${collectionId}/analytics`, { params }).then(res => res.data),

  // Bulk operations
  bulkUpdateNfts: (nftIds: string[], updates: Partial<CreateNftRequest>): Promise<{
    success: boolean;
    results: Array<{ nftId: string; success: boolean; error?: string }>;
  }> =>
    api.post('/nfts/bulk-update', { nftIds, updates }).then(res => res.data),

  bulkTransfer: (transfers: Array<{ nftId: string; to: string }>): Promise<{
    success: boolean;
    results: Array<{ nftId: string; success: boolean; transactionHash?: string; error?: string }>;
  }> =>
    api.post('/nfts/bulk-transfer', { transfers }).then(res => res.data),

  // Import/Export
  exportNftMetadata: (nftIds: string[], format: 'json' | 'csv' | 'xlsx' = 'json'): Promise<Blob> =>
    api.post('/nfts/export', { nftIds, format }, { responseType: 'blob' }).then(res => res.data),

  importNftMetadata: (file: File, collectionId?: string): Promise<{
    success: boolean;
    imported: number;
    errors: Array<{ row: number; error: string }>;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (collectionId) formData.append('collectionId', collectionId);
    
    return api.post('/nfts/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
};

// ===== HOOKS =====

/**
 * Get paginated list of NFTs
 */
export function useNfts(params?: NftListQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['nfts', 'list', params],
    queryFn: () => nftsApi.getNfts(params),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Infinite scroll NFTs list
 */
export function useInfiniteNfts(
  baseParams?: Omit<NftListQuery, 'page'>,
  options?: { enabled?: boolean }
) {
  return useInfiniteQuery({
    queryKey: ['nfts', 'infinite', baseParams],
    queryFn: ({ pageParam = 1 }) => nftsApi.getNfts({ ...baseParams, page: pageParam as number }),
    enabled: options?.enabled ?? true,
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => 
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get specific NFT by ID
 */
export function useNftById(nftId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['nfts', nftId],
    queryFn: () => nftsApi.getNftById(nftId!),
    enabled: (options?.enabled ?? true) && !!nftId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create new NFT
 */
export function useCreateNft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: nftsApi.createNft,
    onSuccess: (newNft) => {
      // Invalidate NFTs list
      queryClient.invalidateQueries({ queryKey: ['nfts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['nfts', 'infinite'] });
      
      // Add to cache
      queryClient.setQueryData(['nfts', newNft.id], newNft);
      
      // Update collection cache if applicable
      if (newNft.collection) {
        queryClient.invalidateQueries({ queryKey: ['nfts', 'collections', newNft.collection.id] });
      }
    },
    onError: (error) => {
      console.error('NFT creation failed:', error);
    },
  });
}

/**
 * Update NFT
 */
export function useUpdateNft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nftId, data }: { nftId: string; data: Partial<CreateNftRequest> }) =>
      nftsApi.updateNft(nftId, data),
    onSuccess: (updatedNft) => {
      // Update specific NFT cache
      queryClient.setQueryData(['nfts', updatedNft.id], updatedNft);
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: ['nfts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['nfts', 'infinite'] });
    },
    onError: (error) => {
      console.error('NFT update failed:', error);
    },
  });
}

/**
 * Delete NFT
 */
export function useDeleteNft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: nftsApi.deleteNft,
    onSuccess: (_, nftId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['nfts', nftId] });
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: ['nfts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['nfts', 'infinite'] });
    },
    onError: (error) => {
      console.error('NFT deletion failed:', error);
    },
  });
}

/**
 * Mint NFT
 */
export function useMintNft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nftId, recipient }: { nftId: string; recipient?: string }) =>
      nftsApi.mintNft(nftId, recipient),
    onSuccess: (_, variables) => {
      // Refresh NFT data to get updated blockchain info
      queryClient.invalidateQueries({ queryKey: ['nfts', variables.nftId] });
      queryClient.invalidateQueries({ queryKey: ['nfts', variables.nftId, 'blockchain'] });
    },
    onError: (error) => {
      console.error('NFT minting failed:', error);
    },
  });
}

/**
 * Batch mint NFTs
 */
export function useBatchMint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nftIds, recipients }: { nftIds: string[]; recipients?: string[] }) =>
      nftsApi.batchMint(nftIds, recipients),
    onSuccess: (_, variables) => {
      // Invalidate all affected NFTs
      variables.nftIds.forEach(nftId => {
        queryClient.invalidateQueries({ queryKey: ['nfts', nftId] });
      });
      queryClient.invalidateQueries({ queryKey: ['nfts', 'list'] });
    },
    onError: (error) => {
      console.error('Batch minting failed:', error);
    },
  });
}

/**
 * Get blockchain info for NFT
 */
export function useNftBlockchainInfo(nftId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['nfts', nftId, 'blockchain'],
    queryFn: () => nftsApi.getBlockchainInfo(nftId!),
    enabled: (options?.enabled ?? true) && !!nftId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Refresh blockchain data
 */
export function useRefreshBlockchainData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: nftsApi.refreshBlockchainData,
    onSuccess: (_, nftId) => {
      queryClient.invalidateQueries({ queryKey: ['nfts', nftId, 'blockchain'] });
      queryClient.invalidateQueries({ queryKey: ['nfts', nftId] });
    },
    onError: (error) => {
      console.error('Blockchain data refresh failed:', error);
    },
  });
}

/**
 * Get NFT transactions
 */
export function useNftTransactions(
  nftId: string | null | undefined,
  params?: { page?: number; limit?: number },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['nfts', nftId, 'transactions', params],
    queryFn: () => nftsApi.getTransactions(nftId!, params),
    enabled: (options?.enabled ?? true) && !!nftId,
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Verify NFT
 */
export function useVerifyNft() {
  return useMutation({
    mutationFn: ({ nftId, options }: { nftId: string; options?: { deep?: boolean } }) =>
      nftsApi.verifyNft(nftId, options),
    onError: (error) => {
      console.error('NFT verification failed:', error);
    },
  });
}

/**
 * Verify NFT on blockchain
 */
export function useVerifyNftOnBlockchain() {
  return useMutation({
    mutationFn: nftsApi.verifyOnBlockchain,
    onError: (error) => {
      console.error('Blockchain verification failed:', error);
    },
  });
}

/**
 * Get NFT provenance
 */
export function useNftProvenance(nftId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['nfts', nftId, 'provenance'],
    queryFn: () => nftsApi.getProvenance(nftId!),
    enabled: (options?.enabled ?? true) && !!nftId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Verify provenance
 */
export function useVerifyProvenance() {
  return useMutation({
    mutationFn: nftsApi.verifyProvenance,
    onError: (error) => {
      console.error('Provenance verification failed:', error);
    },
  });
}

/**
 * Get NFT utilities
 */
export function useNftUtilities(nftId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['nfts', nftId, 'utilities'],
    queryFn: () => nftsApi.getNftUtilities(nftId!),
    enabled: (options?.enabled ?? true) && !!nftId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Add NFT utility
 */
export function useAddNftUtility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nftId, data }: { nftId: string; data: any }) =>
      nftsApi.addNftUtility(nftId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nfts', variables.nftId, 'utilities'] });
      queryClient.invalidateQueries({ queryKey: ['nfts', variables.nftId] });
    },
    onError: (error) => {
      console.error('Add utility failed:', error);
    },
  });
}

/**
 * Update NFT utility
 */
export function useUpdateNftUtility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nftId, utilityId, data }: { nftId: string; utilityId: string; data: any }) =>
      nftsApi.updateNftUtility(nftId, utilityId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nfts', variables.nftId, 'utilities'] });
      queryClient.invalidateQueries({ queryKey: ['nfts', variables.nftId] });
    },
    onError: (error) => {
      console.error('Update utility failed:', error);
    },
  });
}

/**
 * Remove NFT utility
 */
export function useRemoveNftUtility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nftId, utilityId }: { nftId: string; utilityId: string }) =>
      nftsApi.removeNftUtility(nftId, utilityId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nfts', variables.nftId, 'utilities'] });
      queryClient.invalidateQueries({ queryKey: ['nfts', variables.nftId] });
    },
    onError: (error) => {
      console.error('Remove utility failed:', error);
    },
  });
}

/**
 * Redeem NFT utility
 */
export function useRedeemUtility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nftId, utilityId, data }: { nftId: string; utilityId: string; data?: { notes?: string } }) =>
      nftsApi.redeemUtility(nftId, utilityId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nfts', variables.nftId, 'utilities'] });
      queryClient.invalidateQueries({ queryKey: ['nfts', variables.nftId, 'utilities', variables.utilityId, 'history'] });
    },
    onError: (error) => {
      console.error('Utility redemption failed:', error);
    },
  });
}

/**
 * Get utility redemption history
 */
export function useUtilityRedemptionHistory(
  nftId: string | null | undefined,
  utilityId: string | null | undefined,
  params?: { page?: number; limit?: number },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['nfts', nftId, 'utilities', utilityId, 'history', params],
    queryFn: () => nftsApi.getUtilityRedemptionHistory(nftId!, utilityId!, params),
    enabled: (options?.enabled ?? true) && !!nftId && !!utilityId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Get NFT rarity
 */
export function useNftRarity(nftId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['nfts', nftId, 'rarity'],
    queryFn: () => nftsApi.getNftRarity(nftId!),
    enabled: (options?.enabled ?? true) && !!nftId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Get rarity score breakdown
 */
export function useRarityScore(nftId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['nfts', nftId, 'rarity-score'],
    queryFn: () => nftsApi.getRarityScore(nftId!),
    enabled: (options?.enabled ?? true) && !!nftId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Get traits analysis
 */
export function useTraitsAnalysis(nftId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['nfts', nftId, 'traits'],
    queryFn: () => nftsApi.getTraitsAnalysis(nftId!),
    enabled: (options?.enabled ?? true) && !!nftId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get similar NFTs
 */
export function useSimilarNfts(
  nftId: string | null | undefined,
  params?: { limit?: number; minSimilarity?: number },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['nfts', nftId, 'similar', params],
    queryFn: () => nftsApi.getSimilarNfts(nftId!, params),
    enabled: (options?.enabled ?? true) && !!nftId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get marketplace listings
 */
export function useMarketplaceListings(nftId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['nfts', nftId, 'listings'],
    queryFn: () => nftsApi.getMarketplaceListings(nftId!),
    enabled: (options?.enabled ?? true) && !!nftId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * List NFT for sale
 */
export function useListNftForSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nftId, data }: { nftId: string; data: any }) =>
      nftsApi.listNftForSale(nftId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nfts', variables.nftId, 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['nfts', variables.nftId] });
    },
    onError: (error) => {
      console.error('List for sale failed:', error);
    },
  });
}

/**
 * Cancel marketplace listing
 */
export function useCancelListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nftId, listingId }: { nftId: string; listingId: string }) =>
      nftsApi.cancelListing(nftId, listingId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nfts', variables.nftId, 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['nfts', variables.nftId] });
    },
    onError: (error) => {
      console.error('Cancel listing failed:', error);
    },
  });
}

/**
 * Get NFT analytics
 */
export function useNftAnalytics(
  nftId: string | null | undefined,
  params?: { timeframe?: string; metrics?: string[] },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['nfts', nftId, 'analytics', params],
    queryFn: () => nftsApi.getNftAnalytics(nftId!, params),
    enabled: (options?.enabled ?? true) && !!nftId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get NFT performance metrics
 */
export function useNftPerformance(
  nftId: string | null | undefined,
  params?: { timeframe?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['nfts', nftId, 'performance', params],
    queryFn: () => nftsApi.getNftPerformance(nftId!, params),
    enabled: (options?.enabled ?? true) && !!nftId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get price history
 */
export function usePriceHistory(
  nftId: string | null | undefined,
  params?: { timeframe?: string; interval?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['nfts', nftId, 'price-history', params],
    queryFn: () => nftsApi.getPriceHistory(nftId!, params),
    enabled: (options?.enabled ?? true) && !!nftId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Get NFT valuation
 */
export function useNftValuation(nftId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['nfts', nftId, 'valuation'],
    queryFn: () => nftsApi.getValuation(nftId!),
    enabled: (options?.enabled ?? true) && !!nftId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get NFT collections
 */
export function useNftCollections(
  params?: { page?: number; limit?: number; search?: string; network?: BlockchainNetwork },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['nfts', 'collections', params],
    queryFn: () => nftsApi.getCollections(params),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Get collection by ID
 */
export function useNftCollection(collectionId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['nfts', 'collections', collectionId],
    queryFn: () => nftsApi.getCollectionById(collectionId!),
    enabled: (options?.enabled ?? true) && !!collectionId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Create NFT collection
 */
export function useCreateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: nftsApi.createCollection,
    onSuccess: (newCollection) => {
      // Invalidate collections list
      queryClient.invalidateQueries({ queryKey: ['nfts', 'collections'] });
      
      // Add to cache
      queryClient.setQueryData(['nfts', 'collections', newCollection.id], newCollection);
    },
    onError: (error) => {
      console.error('Collection creation failed:', error);
    },
  });
}

/**
 * Update collection
 */
export function useUpdateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ collectionId, data }: { collectionId: string; data: Partial<CreateCollectionRequest> }) =>
      nftsApi.updateCollection(collectionId, data),
    onSuccess: (updatedCollection) => {
      // Update collection cache
      queryClient.setQueryData(['nfts', 'collections', updatedCollection.id], updatedCollection);
      
      // Invalidate collections list
      queryClient.invalidateQueries({ queryKey: ['nfts', 'collections'] });
    },
    onError: (error) => {
      console.error('Collection update failed:', error);
    },
  });
}

/**
 * Get collection NFTs
 */
export function useCollectionNfts(
  collectionId: string | null | undefined,
  params?: NftListQuery,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['nfts', 'collections', collectionId, 'nfts', params],
    queryFn: () => nftsApi.getCollectionNfts(collectionId!, params),
    enabled: (options?.enabled ?? true) && !!collectionId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Get collection analytics
 */
export function useCollectionAnalytics(
  collectionId: string | null | undefined,
  params?: { timeframe?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['nfts', 'collections', collectionId, 'analytics', params],
    queryFn: () => nftsApi.getCollectionAnalytics(collectionId!, params),
    enabled: (options?.enabled ?? true) && !!collectionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Bulk update NFTs
 */
export function useBulkUpdateNfts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nftIds, updates }: { nftIds: string[]; updates: Partial<CreateNftRequest> }) =>
      nftsApi.bulkUpdateNfts(nftIds, updates),
    onSuccess: (_, variables) => {
      // Invalidate all affected NFTs
      variables.nftIds.forEach(nftId => {
        queryClient.invalidateQueries({ queryKey: ['nfts', nftId] });
      });
      queryClient.invalidateQueries({ queryKey: ['nfts', 'list'] });
    },
    onError: (error) => {
      console.error('Bulk update failed:', error);
    },
  });
}

/**
 * Bulk transfer NFTs
 */
export function useBulkTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: nftsApi.bulkTransfer,
    onSuccess: (_, transfers) => {
      // Invalidate all affected NFTs
      transfers.forEach(transfer => {
        queryClient.invalidateQueries({ queryKey: ['nfts', transfer.nftId] });
      });
      queryClient.invalidateQueries({ queryKey: ['nfts', 'list'] });
    },
    onError: (error) => {
      console.error('Bulk transfer failed:', error);
    },
  });
}

/**
 * Export NFT metadata
 */
export function useExportNftMetadata() {
  return useMutation({
    mutationFn: ({ nftIds, format }: { nftIds: string[]; format?: 'json' | 'csv' | 'xlsx' }) =>
      nftsApi.exportNftMetadata(nftIds, format),
    onSuccess: (data, variables) => {
      // Create download link
      const format = variables.format || 'json';
      const mimeType = {
        json: 'application/json',
        csv: 'text/csv',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }[format];

      const blob = new Blob([data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nft-metadata-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      console.error('Metadata export failed:', error);
    },
  });
}

/**
 * Import NFT metadata
 */
export function useImportNftMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, collectionId }: { file: File; collectionId?: string }) =>
      nftsApi.importNftMetadata(file, collectionId),
    onSuccess: (_, variables) => {
      // Invalidate NFTs list and collection if specified
      queryClient.invalidateQueries({ queryKey: ['nfts', 'list'] });
      if (variables.collectionId) {
        queryClient.invalidateQueries({ queryKey: ['nfts', 'collections', variables.collectionId] });
      }
    },
    onError: (error) => {
      console.error('Metadata import failed:', error);
    },
  });
}

/**
 * Real-time NFT price tracking
 */
export function useRealtimeNftPrices(nftIds: string[], enabled: boolean = false) {
  return useQuery({
    queryKey: ['nfts', 'realtime-prices', nftIds],
    queryFn: async () => {
      const prices = await Promise.all(
        nftIds.map(async (id) => {
          const pricing = await nftsApi.getNftById(id).then(nft => nft.pricing);
          return { id, ...pricing };
        })
      );
      return prices;
    },
    enabled: enabled && nftIds.length > 0,
    refetchInterval: enabled ? 30 * 1000 : false, // 30 seconds
    refetchIntervalInBackground: true,
  });
}

/**
 * NFT portfolio overview
 */
export function useNftPortfolioOverview(
  params?: { timeframe?: string; includeAnalytics?: boolean },
  options?: { enabled?: boolean }
) {
  const nfts = useNfts({ limit: 100 }, { enabled: options?.enabled });
  
  return useQuery({
    queryKey: ['nfts', 'portfolio', 'overview', params],
    queryFn: async () => {
      if (!nfts.data?.nfts) return null;

      const nftsList = nfts.data.nfts;
      const portfolio = {
        totalNfts: nftsList.length,
        totalValue: nftsList.reduce((sum: number, nft: any) => sum + (nft.pricing.currentPrice || 0), 0),
        collections: [...new Set(nftsList.map((nft: any) => nft.collection?.name).filter(Boolean))].length,
        networks: [...new Set(nftsList.map((nft: any) => nft.network))],
        topPerformers: nftsList
          .sort((a: any, b: any) => (b.pricing.currentPrice || 0) - (a.pricing.currentPrice || 0))
          .slice(0, 5),
        recentActivity: nftsList
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 10),
        utilities: {
          total: nftsList.reduce((sum: number, nft: any) => sum + nft.utilities.length, 0),
          active: nftsList.reduce((sum: number, nft: any) => 
            sum + nft.utilities.filter((u: any) => u.status === 'active').length, 0
          ),
        },
      };

      return portfolio;
    },
    enabled: (options?.enabled ?? true) && !!nfts.data,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}