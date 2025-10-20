// Deprecated location: src/services/external/job-queue.service.ts
// Re-export the modular job queue service.

export {
  JobQueueAdapter as JobQueueService,
  jobQueueAdapter as jobQueueService
} from '../infrastructure/resilience/core/jobQueueAdapter.service';
export { JobType } from '../infrastructure/resilience/utils/types';
export type { JobData, JobResult, JobStats } from '../infrastructure/resilience/utils/types';

