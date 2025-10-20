// Deprecated location: src/services/external/circuit-breaker.service.ts
// Re-export the modular circuit breaker services.

export {
  CircuitBreaker,
  CircuitBreakerRegistry as CircuitBreakerManager,
  circuitBreakerRegistry as circuitBreakerManager,
  CIRCUIT_BREAKER_CONFIGS
} from '../infrastructure/resilience/core/circuitBreakerRegistry.service';
export { CircuitState, CircuitBreakerConfig, CircuitBreakerStats } from '../infrastructure/resilience/utils/types';

