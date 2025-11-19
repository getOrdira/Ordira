import { MonitoringService } from './core/monitoringRegistry.service';
import { CircuitBreakerRegistry } from '../resilience/core/circuitBreakerRegistry.service';
import { MemoryMonitorService, memoryMonitorService } from './features/memoryMonitor.service';
import { PerformanceService } from './features/performanceMonitor.service';
import { jobQueueAdapter } from '../resilience/core/jobQueueAdapter.service';
import { backgroundTaskProcessorService } from '../resilience/features/backgroundTaskProcessor.service';
import { queueDashboardService } from '../resilience/features/queueDashboard.service';
import { metricValidationService } from './validation/metricValidation.service';
import { alertValidationService } from './validation/alertValidation.service';
import { observabilityValidationService } from './validation/observabilityValidation.service';

// OpenTelemetry exports
export { 
  OpenTelemetryService, 
  initializeOpenTelemetry, 
  getOpenTelemetryService,
  shutdownOpenTelemetry,
  type OpenTelemetryConfig 
} from './core/otel.service';
export { 
  getPrometheusExporter, 
  setupPrometheusEndpoint,
  getPrometheusExporterInstance 
} from './exporters/prometheus.exporter';
export { 
  setupExpressInstrumentation,
  getExpressInstrumentation,
  getHttpInstrumentation 
} from './instrumentation/express.instrumentation';

const monitoringService = new MonitoringService();
const circuitBreakerManager = new CircuitBreakerRegistry();
// memoryMonitorService is already instantiated as a singleton in memoryMonitor.service.ts
// No need to create a new instance here - just use the imported one
const performanceService = new PerformanceService();
const jobQueueService = jobQueueAdapter;
jobQueueService.setMetricsRecorder(monitoringService);

export { MonitoringService, monitoringService } from './core/monitoringRegistry.service';
export { CircuitBreaker, CircuitBreakerRegistry as CircuitBreakerManager, circuitBreakerRegistry as circuitBreakerManager, CIRCUIT_BREAKER_CONFIGS } from '../resilience/core/circuitBreakerRegistry.service';
export { MemoryMonitorService, memoryMonitorService } from './features/memoryMonitor.service';
export { PerformanceService, performanceService } from './features/performanceMonitor.service';
export { JobQueueAdapter as JobQueueService, jobQueueAdapter as jobQueueService } from '../resilience/core/jobQueueAdapter.service';
export { JobType } from '../resilience/utils/types';
export { MetricValidationService, metricValidationService, type MetricAggregation } from './validation/metricValidation.service';
export {
  BackgroundTaskProcessorService,
  backgroundTaskProcessorService
} from '../resilience/features/backgroundTaskProcessor.service';
export {
  QueueDashboardService,
  queueDashboardService
} from '../resilience/features/queueDashboard.service';
export { AlertValidationService, alertValidationService } from './validation/alertValidation.service';
export {
  ObservabilityValidationService,
  observabilityValidationService,
  type MetricQueryOptions,
  type MetricQueryConfig,
  type NormalizedMetricQueryOptions
} from './validation/observabilityValidation.service';
export * from './utils/types';

export const observabilityServices = { monitoringService, circuitBreakerManager, memoryMonitorService, performanceService, jobQueueService, backgroundTaskProcessorService, queueDashboardService, metricValidationService, alertValidationService, observabilityValidationService };

export type ObservabilityServices = typeof observabilityServices;






