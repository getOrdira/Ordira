// src/lib/api/features/votes/index.ts
// Votes API barrel export

import votesAnalyticsApi from './votesAnalytics.api';
import votesContractApi from './votesContract.api';
import votesDashboardApi from './votesDashboard.api';
import votesDataApi from './votesData.api';
import votesDeploymentApi from './votesDeployment.api';
import votesProposalManagementApi from './votesProposalManagement.api';
import votesProposalsApi from './votesProposals.api';
import votesStatsApi from './votesStats.api';

export * from './votesAnalytics.api';
export * from './votesContract.api';
export * from './votesDashboard.api';
export * from './votesData.api';
export * from './votesDeployment.api';
export * from './votesProposalManagement.api';
export * from './votesProposals.api';
export * from './votesStats.api';

export {
  votesAnalyticsApi,
  votesContractApi,
  votesDashboardApi,
  votesDataApi,
  votesDeploymentApi,
  votesProposalManagementApi,
  votesProposalsApi,
  votesStatsApi
};

export const votesApi = {
  analytics: votesAnalyticsApi,
  contract: votesContractApi,
  dashboard: votesDashboardApi,
  data: votesDataApi,
  deployment: votesDeploymentApi,
  proposalManagement: votesProposalManagementApi,
  proposals: votesProposalsApi,
  stats: votesStatsApi
};

export default votesApi;
