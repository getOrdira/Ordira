import { circuitBreakerRegistry } from './core/circuitBreakerRegistry.service';
import { jobQueueAdapter } from './core/jobQueueAdapter.service';
import { backgroundTaskProcessorService } from './features/backgroundTaskProcessor.service';
import { retryPolicyService } from './features/retryPolicy.service';
import { queueDashboardService } from './features/queueDashboard.service';
import { slidingWindowRateLimiter } from './features/slidingWindowRateLimiter.service';

export {
  CircuitBreaker,
  CircuitBreakerRegistry,
  circuitBreakerRegistry,
  CIRCUIT_BREAKER_CONFIGS
} from './core/circuitBreakerRegistry.service';
export { JobQueueAdapter, jobQueueAdapter } from './core/jobQueueAdapter.service';
export { BackgroundTaskProcessorService, backgroundTaskProcessorService } from './features/backgroundTaskProcessor.service';
export { RetryPolicyService, retryPolicyService } from './features/retryPolicy.service';
export { QueueDashboardService, queueDashboardService } from './features/queueDashboard.service';
export {
  SlidingWindowRateLimiter,
  slidingWindowRateLimiter,
  type SlidingWindowConfig,
  type RateLimitInfo,
  type RateLimitResult,
  slidingWindowConfigs,
  createSlidingWindowLimiter,
  slidingWindowMiddleware
} from './features/slidingWindowRateLimiter.service';
export * from './utils/types';

export const resilienceServices = {
  circuitBreakerRegistry,
  jobQueueAdapter,
  backgroundTaskProcessorService,
  retryPolicyService,
  queueDashboardService,
  slidingWindowRateLimiter
};

export type ResilienceServices = typeof resilienceServices;
