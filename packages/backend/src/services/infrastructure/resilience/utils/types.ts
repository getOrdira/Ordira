export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number;
  monitoringPeriod: number;
  successThreshold: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export interface MetricsRecorder {
  recordMetric(metric: { name: string; value: number; tags?: Record<string, string> }): void;
}

export interface JobData {
  type: string;
  payload: any;
  userId?: string;
  businessId?: string;
  priority?: number;
  delay?: number;
  attempts?: number;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

export interface JobStats {
  total: number;
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  processing: Record<string, number>;
}

export interface JobExecutionContext {
  id: string;
  data: JobData & Record<string, any>;
  attemptsMade: number;
  progress: (progress: number) => void;
  createdAt: Date;
}

export type JobProcessor = (context: JobExecutionContext) => Promise<any>;

export enum JobType {
  ANALYTICS_GENERATION = 'analytics:generate',
  DATA_EXPORT = 'data:export',
  EMAIL_NOTIFICATION = 'email:send',
  BULK_UPDATE = 'data:bulk_update',
  CACHE_WARMUP = 'cache:warmup',
  DATABASE_MAINTENANCE = 'db:maintenance',
  REPORT_GENERATION = 'report:generate',
  IMAGE_PROCESSING = 'media:process',
  BACKUP_CREATION = 'backup:create'
}

export interface RetryPolicyOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
}

export interface RetryState<T = unknown> {
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  lastError?: T;
}

export interface QueueDashboardSummary {
  updatedAt: Date;
  totals: {
    queued: number;
    active: number;
    failed: number;
    completed: number;
  };
  processingBreakdown: Record<string, number>;
  queues: Array<{
    name: string;
    active: number;
    waiting: number;
    failed: number;
    completed: number;
    delayed?: number;
    throughputPerMinute?: number;
  }>;
}
