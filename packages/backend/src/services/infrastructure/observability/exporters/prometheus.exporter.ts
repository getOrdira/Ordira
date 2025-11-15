/**
 * Prometheus Exporter
 * 
 * Exports OpenTelemetry metrics to Prometheus format.
 * Provides HTTP endpoint for Prometheus scraping.
 */

import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { logger } from '../../../../utils/logger';
import express, { Application } from 'express';

export interface PrometheusExporterConfig {
  port?: number;
  endpoint?: string;
}

let prometheusExporter: PrometheusExporter | null = null;
let metricsApp: Application | null = null;

/**
 * Get or create Prometheus exporter
 */
export function getPrometheusExporter(config: PrometheusExporterConfig = {}): PrometheusExporter {
  if (prometheusExporter) {
    return prometheusExporter;
  }

  const port = config.port || 9090;
  const endpoint = config.endpoint || '/metrics';

  try {
    // Create Prometheus exporter
    prometheusExporter = new PrometheusExporter(
      {
        port,
        endpoint
      },
      () => {
        logger.info(`📊 Prometheus metrics server started on port ${port}${endpoint}`);
      }
    );

    return prometheusExporter;
  } catch (error: any) {
    logger.error('❌ Failed to create Prometheus exporter:', error);
    throw error;
  }
}

/**
 * Setup Prometheus metrics endpoint on Express app
 */
export function setupPrometheusEndpoint(app: Application, endpoint: string = '/metrics'): void {
  if (!prometheusExporter) {
    logger.warn('Prometheus exporter not initialized, skipping endpoint setup');
    return;
  }

  app.get(endpoint, (req, res) => {
    try {
      // getMetricsRequestHandler expects req and res as arguments
      prometheusExporter!.getMetricsRequestHandler(req, res);
    } catch (error: any) {
      logger.error('Error serving Prometheus metrics:', error);
      res.status(500).send('Error generating metrics');
    }
  });

  logger.info(`✅ Prometheus metrics endpoint configured at ${endpoint}`);
}

/**
 * Get Prometheus exporter instance
 */
export function getPrometheusExporterInstance(): PrometheusExporter | null {
  return prometheusExporter;
}

