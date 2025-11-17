/**
 * OpenTelemetry Service
 * 
 * Centralized OpenTelemetry initialization and configuration.
 * Provides metrics and tracing capabilities using industry-standard OpenTelemetry.
 */

import 'reflect-metadata';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { metrics, Meter, MeterProvider } from '@opentelemetry/api';
import { trace, Tracer, TracerProvider } from '@opentelemetry/api';
import { logger } from '../../logging';
import { getPrometheusExporter } from '../exporters/prometheus.exporter';


export interface OpenTelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  enableMetrics?: boolean;
  enableTracing?: boolean;
  enablePrometheus?: boolean;
  prometheusPort?: number;
  otlpEndpoint?: string;
  jaegerEndpoint?: string;
  zipkinEndpoint?: string;
}

export class OpenTelemetryService {
  private sdk: NodeSDK | null = null;
  private meter: Meter | null = null;
  private tracer: Tracer | null = null;
  private config: OpenTelemetryConfig;
  private initialized = false;

  constructor(config: OpenTelemetryConfig) {
    this.config = {
      enableMetrics: true,
      enableTracing: true,
      enablePrometheus: true,
      prometheusPort: 9090,
      ...config
    };
  }

  /**
   * Initialize OpenTelemetry SDK
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('OpenTelemetry already initialized');
      return;
    }

    try {
      logger.info('🔧 Initializing OpenTelemetry...');

      // Create resource with service information
      const resource = new Resource({
        'service.name': this.config.serviceName,
        'service.version': this.config.serviceVersion,
        'deployment.environment': this.config.environment,
      });

      // Setup instrumentations
      const instrumentations = await this.setupInstrumentation();

      // Configure SDK
      const sdkConfig: any = {
        resource,
        instrumentations
      };

      // Add metrics reader if enabled
      if (this.config.enableMetrics && this.config.enablePrometheus) {
        sdkConfig.metricReader = getPrometheusExporter({ port: this.config.prometheusPort || 9090 });
      }

      // Add trace exporter if enabled
      if (this.config.enableTracing) {
        sdkConfig.traceExporter = this.getTraceExporter();
      }

      // Initialize SDK
      this.sdk = new NodeSDK(sdkConfig);

      // Start SDK
      await this.sdk.start();

      // Get meter and tracer
      if (this.config.enableMetrics) {
        const meterProvider = metrics.getMeterProvider() as MeterProvider;
        this.meter = meterProvider.getMeter(
          this.config.serviceName,
          this.config.serviceVersion
        );
      }

      if (this.config.enableTracing) {
        const tracerProvider = trace.getTracerProvider() as TracerProvider;
        this.tracer = tracerProvider.getTracer(
          this.config.serviceName,
          this.config.serviceVersion
        );
      }

      this.initialized = true;
      logger.info('✅ OpenTelemetry initialized successfully');

      if (this.config.enablePrometheus) {
        logger.info(`📊 Prometheus metrics available at http://localhost:${this.config.prometheusPort}/metrics`);
      }

    } catch (error: any) {
      logger.error('❌ Failed to initialize OpenTelemetry:', error);
      throw error;
    }
  }

  /**
   * Get trace exporter based on configuration
   */
  private getTraceExporter(): any {
    // Priority: OTLP > Jaeger > Zipkin > Console
    if (this.config.otlpEndpoint) {
      const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
      return new OTLPTraceExporter({
        url: this.config.otlpEndpoint
      });
    }

    if (this.config.jaegerEndpoint) {
      const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
      return new JaegerExporter({
        endpoint: this.config.jaegerEndpoint
      });
    }

    if (this.config.zipkinEndpoint) {
      const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
      return new ZipkinExporter({
        url: this.config.zipkinEndpoint
      });
    }

    // Default to console exporter for development
    if (this.config.environment === 'development') {
      const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
      return new ConsoleSpanExporter();
    }

    // Production: use OTLP if available, otherwise console
    const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
    return new ConsoleSpanExporter();
  }

  /**
   * Setup automatic instrumentation
   */
  private async setupInstrumentation(): Promise<any[]> {
    const instrumentations: any[] = [];

    try {
      // HTTP instrumentation (required for Express)
      const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
      instrumentations.push(new HttpInstrumentation({
        ignoreIncomingRequestHook: (req: any) => {
          const url = req.url || '';
          return url === '/health' || url === '/metrics' || url.startsWith('/.well-known');
        }
      }));

      // Express instrumentation
      if (this.config.enableTracing) {
        const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
        instrumentations.push(new ExpressInstrumentation({
          requestHook: (span: any, info: any) => {
            if (info.route) {
              span.setAttribute('express.route', info.route);
            }
            if (info.request?.method) {
              span.setAttribute('express.method', info.request.method);
            }
          }
        }));
      }

      // MongoDB instrumentation (if available)
      try {
        const { MongoDBInstrumentation } = require('@opentelemetry/instrumentation-mongodb');
        instrumentations.push(new MongoDBInstrumentation());
      } catch (error) {
        logger.debug('MongoDB instrumentation not available, skipping...');
      }

      logger.info(`✅ OpenTelemetry instrumentation configured (${instrumentations.length} instrumentations)`);
    } catch (error: any) {
      logger.warn('⚠️ Failed to setup some instrumentation:', error);
    }

    return instrumentations;
  }

  /**
   * Get meter for creating metrics
   */
  getMeter(): Meter | null {
    return this.meter;
  }

  /**
   * Get tracer for creating spans
   */
  getTracer(): Tracer | null {
    return this.tracer;
  }

  /**
   * Shutdown OpenTelemetry SDK
   */
  async shutdown(): Promise<void> {
    if (this.sdk) {
      try {
        await this.sdk.shutdown();
        logger.info('✅ OpenTelemetry shutdown completed');
      } catch (error: any) {
        logger.error('❌ Error shutting down OpenTelemetry:', error);
      }
    }
  }

  /**
   * Check if OpenTelemetry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Global OpenTelemetry service instance
let otelServiceInstance: OpenTelemetryService | null = null;

/**
 * Initialize OpenTelemetry service
 */
export function initializeOpenTelemetry(config: OpenTelemetryConfig): Promise<void> {
  if (!otelServiceInstance) {
    otelServiceInstance = new OpenTelemetryService(config);
  }
  return otelServiceInstance.initialize();
}

/**
 * Get OpenTelemetry service instance
 */
export function getOpenTelemetryService(): OpenTelemetryService | null {
  return otelServiceInstance;
}

/**
 * Shutdown OpenTelemetry service
 */
export async function shutdownOpenTelemetry(): Promise<void> {
  if (otelServiceInstance) {
    await otelServiceInstance.shutdown();
    otelServiceInstance = null;
  }
}

