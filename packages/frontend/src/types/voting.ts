 // src/types/voting.ts
 export interface Proposal {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    votes: number;
    txHash?: string;
    createdAt: string;
    updatedAt: string;
    status: 'active' | 'inactive' | 'archived';
    archived?: boolean;
    deleted?: boolean;
    creator: string;
  }
  
  export interface VotingStats {
    totalProposals: number;
    activeProposals: number;
    totalVotes: number;
    votesThisMonth: number;
    topProposal: string;
    avgVotesPerProposal: number;
  }
  
  export interface CreateProposalData {
    name: string;
    description: string;
    imageFile?: File;
    productId?: string;
  }
  
  export interface VotingQueryParams {
    status?: 'all' | 'active' | 'inactive' | 'archived';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }