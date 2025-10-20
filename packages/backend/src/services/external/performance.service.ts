// Deprecated location: src/services/external/performance.service.ts
// Re-export the modular performance monitoring service.

export { PerformanceService, performanceService } from '../infrastructure/observability/features/performanceMonitor.service';
export type { PerformanceMetrics, PerformanceSystemHealth } from '../infrastructure/observability/utils/types';
