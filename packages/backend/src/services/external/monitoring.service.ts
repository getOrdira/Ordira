// Deprecated location: src/services/external/monitoring.service.ts
// Re-export the modular monitoring registry service.

export { MonitoringService, monitoringService } from '../infrastructure/observability/core/monitoringRegistry.service';
export type { MetricData, AlertRule, Alert, SystemHealth } from '../infrastructure/observability/utils/types';
