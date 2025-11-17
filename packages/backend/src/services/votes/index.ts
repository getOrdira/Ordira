import { votingContractService } from './core/votingContract.service';
import { votingDataService } from './core/votingData.service';
import { votingStatsService } from './features/votingStats.service';
import { votingAnalyticsService } from './features/votingAnalytics.service';
import { votingDashboardService } from './features/votingDashboard.service';
import { votingProposalsService } from './features/votingProposals.service';
import { votingProposalManagementService } from './features/votingProposalManagement.service';
import { votingContractDeploymentService } from './features/votingContractDeployment.service';
import { votingBatchProcessingService } from './features/votingBatchProcessing.service';
import { votingRecordValidationService } from './features/votingRecordValidation.service';
import { votingManagementService } from './features/votingManagement.service';
import { votingValidationService } from './validation/votingValidation.service';

export {
  VotingDataService,
  votingDataService
} from './core/votingData.service';
export {
  VotingContractService,
  votingContractService
} from './core/votingContract.service';
export {
  VotingStatsService,
  votingStatsService
} from './features/votingStats.service';
export {
  VotingAnalyticsService,
  votingAnalyticsService
} from './features/votingAnalytics.service';
export {
  VotingDashboardService,
  votingDashboardService
} from './features/votingDashboard.service';
export {
  VotingProposalsService,
  votingProposalsService
} from './features/votingProposals.service';
export {
  VotingProposalManagementService,
  votingProposalManagementService
} from './features/votingProposalManagement.service';
export {
  VotingContractDeploymentService,
  votingContractDeploymentService
} from './features/votingContractDeployment.service';
export {
  VotingBatchProcessingService,
  votingBatchProcessingService
} from './features/votingBatchProcessing.service';
export {
  VotingRecordValidationService,
  votingRecordValidationService
} from './features/votingRecordValidation.service';
export {
  VotingManagementService,
  votingManagementService
} from './features/votingManagement.service';
export {
  VotingValidationService,
  votingValidationService
} from './validation/votingValidation.service';

export * from './utils/types';

export const votesServices = {
  core: {
    data: votingDataService,
    contract: votingContractService
  },
  features: {
    stats: votingStatsService,
    analytics: votingAnalyticsService,
    dashboard: votingDashboardService,
    proposals: votingProposalsService,
    proposalManagement: votingProposalManagementService,
    contractDeployment: votingContractDeploymentService,
    batchProcessing: votingBatchProcessingService,
    recordValidation: votingRecordValidationService,
    management: votingManagementService
  },
  validation: votingValidationService
};
