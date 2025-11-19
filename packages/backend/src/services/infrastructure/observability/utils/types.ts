export {
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerStats,
  MetricsRecorder,
  JobData,
  JobResult,
  JobStats,
  JobExecutionContext,
  JobProcessor,
  JobType,
  RetryPolicyOptions,
  RetryState,
  QueueDashboardSummary
} from '../../resilience/utils/types';
export interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  unit?: string;
}

export type AlertCondition = 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  duration: number;
  severity: AlertSeverity;
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  message: string;
  severity: AlertSeverity;
  timestamp: Date;
  resolved?: Date;
  metadata?: Record<string, unknown>;
}

export type ServiceHealthStatus = 'up' | 'down' | 'degraded';
export type OverallHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface SystemHealth {
  status: OverallHealthStatus;
  timestamp: Date;
  services: {
    database: ServiceHealthStatus;
    cache: ServiceHealthStatus;
    storage: ServiceHealthStatus;
    external: ServiceHealthStatus;
  };
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    responseTime: number;
    errorRate: number;
  };
  alerts: Alert[];
  diagnostics?: {
    healthIssues: string[];
    recommendations: string[];
    alertBreakdown: {
      total: number;
      bySeverity: {
        critical: number;
        high: number;
        warning: number;
      };
      byAge: {
        recent: number;
        old: number;
      };
      recentCritical: number;
      recentHigh: number;
    };
    statusReason: string;
  };
}

export interface MemoryStats {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
  timestamp: number;
}

export interface MemoryThresholds {
  warning: number;
  critical: number;
  maxHeapUsage: number;
  gcHint: number;
}

export type MemoryAlertLevel = 'warning' | 'critical' | 'leak_detected';

export interface MemoryAlert {
  level: MemoryAlertLevel;
  message: string;
  currentUsage: number;
  threshold: number;
  timestamp: Date;
  suggestion?: string;
}

export interface LeakDetection {
  isLeakDetected: boolean;
  growthRate: number;
  samples: MemoryStats[];
  duration: number;
}

export interface PerformanceMetrics {
  timestamp: Date;
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  cacheHits: number;
  cacheMisses: number;
  dbQueries: number;
  dbQueryTime: number;
  errorCount: number;
}

export interface PerformanceSystemHealth {
  status: OverallHealthStatus;
  uptime: number;
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  database: {
    connected: boolean;
    latency: number;
    connections: number;
  };
  cache: {
    connected: boolean;
    latency: number;
    hitRate: number;
  };
  errors: {
    count: number;
    rate: number;
  };
}



