// Deprecated location: src/services/external/sliding-window-rate-limiter.service.ts
// Re-export the modular sliding window rate limiter.

export {
  SlidingWindowRateLimiter,
  slidingWindowRateLimiter,
  type SlidingWindowConfig,
  type RateLimitInfo,
  type RateLimitResult,
  slidingWindowConfigs,
  createSlidingWindowLimiter,
  slidingWindowMiddleware
} from '../infrastructure/resilience/features/slidingWindowRateLimiter.service';
