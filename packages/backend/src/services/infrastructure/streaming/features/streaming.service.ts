/**
 * Streaming Service for Large Data Exports
 *
 * Provides efficient streaming capabilities for large datasets to prevent
 * memory exhaustion and improve user experience with real-time progress.
 */

import type { Request, Response } from 'express';
import { Transform, Readable } from 'stream';
import { createGzip, createDeflate } from 'zlib';
import mongoose, { type Document, type Model } from 'mongoose';
import { logger } from '../../../../utils/logger';
import {
  monitoringService,
  jobQueueService,
  JobType
} from '../../observability';

export interface StreamingOptions {
  format: 'json' | 'csv' | 'xml' | 'ndjson';
  batchSize?: number;
  compression?: 'gzip' | 'deflate' | 'none';
  filename?: string;
  transform?: (doc: any) => any;
  filter?: (doc: any) => boolean;
  onProgress?: (processed: number, total?: number) => void;
  onError?: (error: Error) => void;
  includeHeaders?: boolean;
}

export interface ExportProgress {
  processed: number;
  total?: number;
  percentage?: number;
  speed: number;
  eta?: number;
  status: 'preparing' | 'streaming' | 'completed' | 'error' | 'cancelled';
  error?: string;
}

export interface StreamingStats {
  totalExports: number;
  activeStreams: number;
  totalBytesStreamed: number;
  avgProcessingSpeed: number;
  errorRate: number;
}

/**
 * Streaming service for large data exports
 */
export class StreamingService {
  private activeStreams = new Map<string, ExportProgress>();
  private stats: StreamingStats = {
    totalExports: 0,
    activeStreams: 0,
    totalBytesStreamed: 0,
    avgProcessingSpeed: 0,
    errorRate: 0
  };

  constructor() {
    this.startStatsCollection();
  }

  async streamToResponse<T extends Document>(
    res: Response,
    model: Model<T>,
    query: Record<string, any> = {},
    options: StreamingOptions
  ): Promise<string> {
    const exportId = this.generateExportId();
    const startTime = Date.now();

    try {
      this.stats.totalExports++;
      this.stats.activeStreams++;

      this.activeStreams.set(exportId, {
        processed: 0,
        speed: 0,
        status: 'preparing'
      });

      this.setResponseHeaders(res, options);

      const totalCount = await model.countDocuments(query);
      this.updateProgress(exportId, { total: totalCount, status: 'streaming' });

      const docStream = this.createDocumentStream(model, query, options.batchSize ?? 1000);
      const formatStream = this.createFormatStream(options);
      const compressionStream = this.createCompressionStream(options.compression);
      const progressStream = this.createProgressStream(exportId, startTime);

      let pipeline: Readable = docStream.pipe(formatStream).pipe(progressStream);

      if (compressionStream) {
        pipeline = pipeline.pipe(compressionStream);
      }

      pipeline.on('error', (error) => {
        logger.error('Stream error:', error);
        this.updateProgress(exportId, { status: 'error', error: error.message });
        this.stats.errorRate++;

        if (!res.headersSent) {
          res.status(500).json({ error: 'Export failed', exportId });
        }
      });

      pipeline.on('end', () => {
        const duration = Date.now() - startTime;
        const progress = this.activeStreams.get(exportId);

        logger.info('Export completed', {
          exportId,
          duration,
          processed: progress?.processed,
          total: progress?.total
        });

        if (progress?.processed && duration > 0) {
          const speed = (progress.processed / duration) * 1000;
          this.stats.avgProcessingSpeed =
            (this.stats.avgProcessingSpeed + speed) / 2 || speed;
        }

        this.updateProgress(exportId, { status: 'completed', percentage: 100 });
        this.stats.activeStreams--;
      });

      pipeline.on('close', () => {
        this.updateProgress(exportId, { status: 'completed', percentage: 100 });
      });

      pipeline.pipe(res);

      return exportId;
    } catch (error) {
      this.stats.errorRate++;
      this.stats.activeStreams--;
      this.updateProgress(exportId, { status: 'error', error: (error as Error).message });
      throw error;
    }
  }

  async exportAsJob<T extends Document>(
    model: Model<T>,
    query: Record<string, any>,
    options: StreamingOptions & { userId?: string; organizationId?: string }
  ): Promise<string> {
    try {
      const jobId = await jobQueueService.addJob({
        type: JobType.DATA_EXPORT,
        payload: {
          model: model.modelName,
          query,
          options
        }
      });

      logger.info('Export job queued', { jobId, model: model.modelName });
      return jobId;
    } catch (error) {
      logger.error('Failed to queue export job:', error);
      throw error;
    }
  }

  private createDocumentStream<T extends Document>(
    model: Model<T>,
    query: Record<string, any>,
    batchSize: number
  ): Readable {
    const stream = new Readable({
      objectMode: true,
      read: () => {}
    });

    void this.fetchDocuments(model, query, batchSize, stream);
    return stream;
  }

  private async fetchDocuments<T extends Document>(
    model: Model<T>,
    query: Record<string, any>,
    batchSize: number,
    stream: Readable
  ): Promise<void> {
    try {
      await model
        .find(query)
        .cursor({ batchSize })
        .eachAsync(
          async (doc) => {
            if (!stream.push(doc)) {
              await new Promise<void>((resolve) => {
                stream.once('drain', resolve);
              });
            }
          },
          { batchSize }
        );
    } catch (error) {
      stream.emit('error', error);
    } finally {
      stream.push(null);
    }
  }

  private createFormatStream(options: StreamingOptions): Transform {
    switch (options.format) {
      case 'json':
        return this.createJsonStream(options.includeHeaders ?? true);
      case 'csv':
        return this.createCsvStream(options);
      case 'xml':
        return this.createXmlStream();
      case 'ndjson':
        return this.createNdjsonStream();
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  private createJsonStream(includeHeaders: boolean): Transform {
    let isFirst = true;

    return new Transform({
      objectMode: true,
      transform: (doc, _encoding, callback) => {
        try {
          const json = JSON.stringify(doc);
          const prefix = isFirst ? (includeHeaders ? '[' : '') : ',';
          isFirst = false;
          callback(null, `${prefix}${json}`);
        } catch (error) {
          callback(error as Error);
        }
      },
      flush: (callback) => {
        callback(null, includeHeaders ? ']' : '');
      }
    });
  }

  private createCsvStream(options: StreamingOptions): Transform {
    let headers: string[] | null = null;

    return new Transform({
      objectMode: true,
      transform: (doc, _encoding, callback) => {
        try {
          const obj = options.transform ? options.transform(doc) : doc;

          if (!headers) {
            headers = Object.keys(obj);
            callback(null, `${headers.join(',')}\n`);
            return;
          }

          const values = headers.map((header) => {
            const value = obj[header];
            if (value == null) return '';
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          });

          callback(null, `${values.join(',')}\n`);
        } catch (error) {
          callback(error as Error);
        }
      }
    });
  }

  private createXmlStream(): Transform {
    return new Transform({
      objectMode: true,
      transform: (doc, _encoding, callback) => {
        try {
          const xmlDoc = this.convertToXml(doc);
          callback(null, `<item>${xmlDoc}</item>\n`);
        } catch (error) {
          callback(error as Error);
        }
      },
      flush: (callback) => {
        callback(null, '');
      }
    });
  }

  private convertToXml(obj: Record<string, any>): string {
    return Object.entries(obj)
      .map(([key, value]) => {
        if (value == null) return '';
        if (typeof value === 'object' && !(value instanceof Date)) {
          return `<${key}>${this.convertToXml(value)}</${key}>`;
        }
        return `<${key}>${value}</${key}>`;
      })
      .join('');
  }

  private createNdjsonStream(): Transform {
    return new Transform({
      objectMode: true,
      transform: (doc, _encoding, callback) => {
        try {
          callback(null, `${JSON.stringify(doc)}\n`);
        } catch (error) {
          callback(error as Error);
        }
      }
    });
  }

  private createCompressionStream(compression: StreamingOptions['compression']): Transform | null {
    switch (compression) {
      case 'gzip':
        return createGzip();
      case 'deflate':
        return createDeflate();
      default:
        return null;
    }
  }

  private createProgressStream(exportId: string, startTime: number): Transform {
    let processed = 0;

    return new Transform({
      objectMode: true,
      transform: (chunk, encoding, callback) => {
        try {
          processed++;
          this.trackProgress(exportId, processed, startTime, chunk);
          callback(null, chunk);
        } catch (error) {
          callback(error as Error);
        }
      }
    });
  }

  private trackProgress(
    exportId: string,
    processed: number,
    startTime: number,
    chunk: any
  ): void {
    const progress = this.activeStreams.get(exportId);
    if (!progress) return;

    const now = Date.now();
    const duration = now - startTime;
    const speed = duration > 0 ? (processed / duration) * 1000 : 0;
    const remaining = progress.total ? progress.total - processed : undefined;
    const eta = remaining && speed > 0 ? remaining / speed : undefined;
    const percentage =
      progress.total && progress.total > 0
        ? Math.min(100, (processed / progress.total) * 100)
        : undefined;

    const dataSize =
      typeof chunk === 'string'
        ? Buffer.byteLength(chunk)
        : chunk instanceof Buffer
          ? chunk.length
          : Buffer.byteLength(JSON.stringify(chunk));

    this.stats.totalBytesStreamed += dataSize;

    const updatedProgress: ExportProgress = {
      ...progress,
      processed,
      speed,
      eta,
      percentage,
      status: progress.status === 'streaming' ? 'streaming' : progress.status
    };

    this.updateProgress(exportId, updatedProgress);

    monitoringService.recordMetric({
      name: 'streaming_progress',
      value: processed,
      tags: { exportId }
    });
  }

  private setResponseHeaders(res: Response, options: StreamingOptions): void {
    const filename = options.filename ?? `export-${Date.now()}.${options.format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    switch (options.format) {
      case 'json':
      case 'ndjson':
        res.setHeader('Content-Type', 'application/json');
        break;
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        break;
      case 'xml':
        res.setHeader('Content-Type', 'application/xml');
        break;
      default:
        res.setHeader('Content-Type', 'application/octet-stream');
    }

    if (options.compression === 'gzip') {
      res.setHeader('Content-Encoding', 'gzip');
    } else if (options.compression === 'deflate') {
      res.setHeader('Content-Encoding', 'deflate');
    }
  }

  private updateProgress(exportId: string, update: Partial<ExportProgress>): void {
    const current = this.activeStreams.get(exportId) ?? {
      processed: 0,
      status: 'preparing',
      speed: 0
    };

    const merged = { ...current, ...update };
    this.activeStreams.set(exportId, merged);
  }

  getProgress(exportId: string): ExportProgress | null {
    return this.activeStreams.get(exportId) ?? null;
  }

  cancelExport(exportId: string): boolean {
    const progress = this.activeStreams.get(exportId);
    if (progress && progress.status === 'streaming') {
      this.updateProgress(exportId, { status: 'cancelled' });
      return true;
    }
    return false;
  }

  getActiveExports(): Record<string, ExportProgress> {
    const exports: Record<string, ExportProgress> = {};
    for (const [id, progress] of this.activeStreams.entries()) {
      exports[id] = progress;
    }
    return exports;
  }

  private generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private startStatsCollection(): void {
    setInterval(() => {
      monitoringService.recordMetric({
        name: 'streaming_active_exports',
        value: this.stats.activeStreams,
        tags: {}
      });

      monitoringService.recordMetric({
        name: 'streaming_total_exports',
        value: this.stats.totalExports,
        tags: {}
      });

      monitoringService.recordMetric({
        name: 'streaming_bytes_total',
        value: this.stats.totalBytesStreamed,
        tags: {}
      });

      this.stats.totalExports = 0;
      this.stats.totalBytesStreamed = 0;
    }, 60000);

    setInterval(() => {
      for (const [id, progress] of this.activeStreams.entries()) {
        if (['completed', 'error', 'cancelled'].includes(progress.status)) {
          this.activeStreams.delete(id);
        }
      }
    }, 5 * 60 * 1000);
  }

  getStats(): StreamingStats {
    return { ...this.stats };
  }
}

export const streamingService = new StreamingService();

export function createStreamingEndpoint<T extends Document>(
  model: Model<T>,
  defaultOptions: Partial<StreamingOptions> = {}
) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        format = 'json',
        compression = 'none',
        filename,
        batchSize = 1000,
        ...filters
      } = req.query;

      const options: StreamingOptions = {
        format: format as StreamingOptions['format'],
        compression: compression as StreamingOptions['compression'],
        filename: filename as string,
        batchSize: parseInt(batchSize as string, 10),
        ...defaultOptions
      };

      const exportId = await streamingService.streamToResponse(res, model, filters, options);

      logger.info('Streaming export started', {
        exportId,
        model: model.collection.name,
        format,
        compression,
        filters: Object.keys(filters ?? {})
      });
    } catch (error) {
      logger.error('Streaming export failed:', error);
      res.status(500).json({
        error: 'Export failed',
        message: (error as Error).message
      });
    }
  };
}
