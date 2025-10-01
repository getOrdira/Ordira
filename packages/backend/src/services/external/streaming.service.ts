/**
 * Streaming Service for Large Data Exports
 *
 * Provides efficient streaming capabilities for large datasets to prevent
 * memory exhaustion and improve user experience with real-time progress.
 */

import { Request, Response } from 'express';
import { Transform, Readable } from 'stream';
import { createGzip, createDeflate } from 'zlib';
import mongoose, { Model, Document } from 'mongoose';
import { logger } from '../../utils/logger';
import { monitoringService } from './monitoring.service';
import { jobQueueService, JobType } from './job-queue.service';

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
  speed: number; // docs per second
  eta?: number; // estimated time remaining in seconds
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

  /**
   * Stream large dataset to response
   */
  async streamToResponse<T extends Document>(
    res: Response,
    model: Model<T>,
    query: any = {},
    options: StreamingOptions
  ): Promise<string> {
    const exportId = this.generateExportId();
    const startTime = Date.now();

    try {
      this.stats.totalExports++;
      this.stats.activeStreams++;

      // Initialize progress tracking
      this.activeStreams.set(exportId, {
        processed: 0,
        speed: 0,
        status: 'preparing'
      });

      // Set response headers
      this.setResponseHeaders(res, options);

      // Get total count for progress tracking
      const totalCount = await model.countDocuments(query);
      this.updateProgress(exportId, { total: totalCount, status: 'streaming' });

      // Create document stream
      const docStream = this.createDocumentStream(model, query, options.batchSize || 1000);

      // Create transform stream for format conversion
      const formatStream = this.createFormatStream(options);

      // Create compression stream if needed
      const compressionStream = this.createCompressionStream(options.compression);

      // Create progress tracking stream
      const progressStream = this.createProgressStream(exportId, startTime);

      // Pipe streams together
      let pipeline = docStream.pipe(formatStream).pipe(progressStream);

      if (compressionStream) {
        pipeline = pipeline.pipe(compressionStream);
      }

      // Handle stream events
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
          processed: progress?.processed || 0,
          format: options.format
        });

        this.updateProgress(exportId, { status: 'completed' });
        this.stats.activeStreams--;

        // Record metrics
        monitoringService.recordMetric({
          name: 'export_completed',
          value: 1,
          tags: {
            format: options.format,
            model: model.collection.name,
            duration: duration.toString()
          }
        });
      });

      // Start streaming
      pipeline.pipe(res);

      return exportId;

    } catch (error) {
      this.stats.activeStreams--;
      this.stats.errorRate++;
      this.updateProgress(exportId, { status: 'error', error: error.message });

      logger.error('Failed to start stream:', error);
      throw error;
    }
  }

  /**
   * Stream to file with background processing
   */
  async streamToFile<T extends Document>(
    model: Model<T>,
    query: any = {},
    filePath: string,
    options: StreamingOptions
  ): Promise<string> {
    const exportId = this.generateExportId();

    try {
      // Queue as background job for large exports
      const jobId = await jobQueueService.addJob({
        type: JobType.DATA_EXPORT,
        payload: {
          exportId,
          model: model.collection.name,
          query,
          filePath,
          options
        },
        priority: 1
      });

      logger.info('File export queued', { exportId, jobId, filePath });

      return exportId;

    } catch (error) {
      logger.error('Failed to queue file export:', error);
      throw error;
    }
  }

  /**
   * Stream aggregation results
   */
  async streamAggregation(
    res: Response,
    model: Model<any>,
    pipeline: any[],
    options: StreamingOptions
  ): Promise<string> {
    const exportId = this.generateExportId();
    const startTime = Date.now();

    try {
      this.stats.totalExports++;
      this.stats.activeStreams++;

      this.setResponseHeaders(res, options);

      // Initialize progress
      this.activeStreams.set(exportId, {
        processed: 0,
        speed: 0,
        status: 'streaming'
      });

      // Create aggregation cursor
      const cursor = model.aggregate(pipeline).cursor({ batchSize: options.batchSize || 1000 });

      // Create transform streams
      const formatStream = this.createFormatStream(options);
      const progressStream = this.createProgressStream(exportId, startTime);
      const compressionStream = this.createCompressionStream(options.compression);

      // Convert cursor to readable stream
      const aggregationStream = new Readable({
        objectMode: true,
        read() {
          cursor.next()
            .then((doc) => {
              if (doc) {
                this.push(doc);
              } else {
                this.push(null); // End stream
              }
            })
            .catch((error) => {
              this.emit('error', error);
            });
        }
      });

      // Build pipeline
      let pipeline_stream = aggregationStream.pipe(formatStream).pipe(progressStream);

      if (compressionStream) {
        pipeline_stream = pipeline_stream.pipe(compressionStream);
      }

      // Handle events
      pipeline_stream.on('error', (error) => {
        logger.error('Aggregation stream error:', error);
        this.updateProgress(exportId, { status: 'error', error: error.message });
        cursor.close();
      });

      pipeline_stream.on('end', () => {
        this.updateProgress(exportId, { status: 'completed' });
        this.stats.activeStreams--;
        cursor.close();
      });

      pipeline_stream.pipe(res);

      return exportId;

    } catch (error) {
      this.stats.activeStreams--;
      this.updateProgress(exportId, { status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Create document stream with cursor
   */
  private createDocumentStream<T extends Document>(
    model: Model<T>,
    query: any,
    batchSize: number
  ): Readable {
    const cursor = model.find(query).lean().cursor({ batchSize });

    return new Readable({
      objectMode: true,
      read() {
        cursor.next()
          .then((doc) => {
            if (doc) {
              this.push(doc);
            } else {
              this.push(null);
            }
          })
          .catch((error) => {
            this.emit('error', error);
          });
      }
    });
  }

  /**
   * Create format transformation stream
   */
  private createFormatStream(options: StreamingOptions): Transform {
    let isFirstDoc = true;

    return new Transform({
      objectMode: true,
      transform(doc: any, encoding, callback) {
        try {
          let output = '';

          // Apply custom transform if provided
          if (options.transform) {
            doc = options.transform(doc);
          }

          // Apply filter if provided
          if (options.filter && !options.filter(doc)) {
            return callback();
          }

          switch (options.format) {
            case 'json':
              if (isFirstDoc) {
                output = '[\n' + JSON.stringify(doc, null, 2);
                isFirstDoc = false;
              } else {
                output = ',\n' + JSON.stringify(doc, null, 2);
              }
              break;

            case 'ndjson':
              output = JSON.stringify(doc) + '\n';
              break;

            case 'csv':
              if (isFirstDoc && options.includeHeaders !== false) {
                const headers = Object.keys(doc).join(',');
                output = headers + '\n';
                isFirstDoc = false;
              }
              const values = Object.values(doc).map(val =>
                typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
              ).join(',');
              output += values + '\n';
              break;

            case 'xml':
              if (isFirstDoc && options.includeHeaders !== false) {
                output = '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n';
                isFirstDoc = false;
              }
              output += this.objectToXml(doc, 'item') + '\n';
              break;

            default:
              output = JSON.stringify(doc) + '\n';
          }

          callback(null, output);

        } catch (error) {
          callback(error);
        }
      },

      flush(callback) {
        let output = '';

        switch (options.format) {
          case 'json':
            output = '\n]';
            break;
          case 'xml':
            output = '</root>';
            break;
        }

        if (output) {
          this.push(output);
        }

        callback();
      }
    });
  }

  /**
   * Create compression stream
   */
  private createCompressionStream(compression?: string): Transform | null {
    switch (compression) {
      case 'gzip':
        return createGzip();
      case 'deflate':
        return createDeflate();
      default:
        return null;
    }
  }

  /**
   * Create progress tracking stream
   */
  private createProgressStream(exportId: string, startTime: number): Transform {
    let processed = 0;

    return new Transform({
      transform(chunk, encoding, callback) {
        processed++;

        // Update progress every 100 documents
        if (processed % 100 === 0) {
          const elapsed = Date.now() - startTime;
          const speed = processed / (elapsed / 1000);

          this.updateProgress(exportId, {
            processed,
            speed: Math.round(speed)
          });

          this.stats.totalBytesStreamed += Buffer.byteLength(chunk.toString());
        }

        callback(null, chunk);
      }.bind(this)
    });
  }

  /**
   * Set response headers for streaming
   */
  private setResponseHeaders(res: Response, options: StreamingOptions): void {
    const { format, compression, filename } = options;

    // Set content type
    const contentTypes = {
      json: 'application/json',
      csv: 'text/csv',
      xml: 'application/xml',
      ndjson: 'application/x-ndjson'
    };

    res.setHeader('Content-Type', contentTypes[format] || 'application/octet-stream');

    // Set compression headers
    if (compression === 'gzip') {
      res.setHeader('Content-Encoding', 'gzip');
    } else if (compression === 'deflate') {
      res.setHeader('Content-Encoding', 'deflate');
    }

    // Set download headers
    if (filename) {
      const ext = format === 'ndjson' ? 'jsonl' : format;
      const fullFilename = `${filename}.${ext}${compression === 'gzip' ? '.gz' : ''}`;
      res.setHeader('Content-Disposition', `attachment; filename="${fullFilename}"`);
    }

    // Set streaming headers
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  }

  /**
   * Convert object to XML
   */
  private objectToXml(obj: any, rootName: string = 'item'): string {
    let xml = `<${rootName}>`;

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        xml += `<${key}/>`;
      } else if (typeof value === 'object') {
        xml += `<${key}>${this.objectToXml(value)}</${key}>`;
      } else {
        xml += `<${key}>${String(value).replace(/[<>&'"]/g, (char) => {
          const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' };
          return entities[char as keyof typeof entities];
        })}</${key}>`;
      }
    }

    xml += `</${rootName}>`;
    return xml;
  }

  /**
   * Update progress for an export
   */
  private updateProgress(exportId: string, update: Partial<ExportProgress>): void {
    const current = this.activeStreams.get(exportId);
    if (current) {
      const updated = { ...current, ...update };

      // Calculate percentage if total is known
      if (updated.total && updated.processed) {
        updated.percentage = Math.round((updated.processed / updated.total) * 100);
      }

      // Calculate ETA if speed is known
      if (updated.total && updated.processed && updated.speed > 0) {
        const remaining = updated.total - updated.processed;
        updated.eta = Math.round(remaining / updated.speed);
      }

      this.activeStreams.set(exportId, updated);
    }
  }

  /**
   * Get export progress
   */
  getProgress(exportId: string): ExportProgress | null {
    return this.activeStreams.get(exportId) || null;
  }

  /**
   * Cancel export
   */
  cancelExport(exportId: string): boolean {
    const progress = this.activeStreams.get(exportId);
    if (progress && progress.status === 'streaming') {
      this.updateProgress(exportId, { status: 'cancelled' });
      return true;
    }
    return false;
  }

  /**
   * Get all active exports
   */
  getActiveExports(): Record<string, ExportProgress> {
    const exports: Record<string, ExportProgress> = {};
    for (const [id, progress] of this.activeStreams.entries()) {
      exports[id] = progress;
    }
    return exports;
  }

  /**
   * Generate unique export ID
   */
  private generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start statistics collection
   */
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

      // Reset counters
      this.stats.totalExports = 0;
      this.stats.totalBytesStreamed = 0;

    }, 60000); // Every minute

    // Cleanup completed exports every 5 minutes
    setInterval(() => {
      for (const [id, progress] of this.activeStreams.entries()) {
        if (['completed', 'error', 'cancelled'].includes(progress.status)) {
          this.activeStreams.delete(id);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Get streaming statistics
   */
  getStats(): StreamingStats {
    return { ...this.stats };
  }
}

// Singleton instance
export const streamingService = new StreamingService();

/**
 * Express middleware for streaming exports
 */
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
        format: format as any,
        compression: compression as any,
        filename: filename as string,
        batchSize: parseInt(batchSize as string),
        ...defaultOptions
      };

      const exportId = await streamingService.streamToResponse(res, model, filters, options);

      logger.info('Streaming export started', {
        exportId,
        model: model.collection.name,
        format,
        compression,
        filters: Object.keys(filters)
      });

    } catch (error) {
      logger.error('Streaming export failed:', error);
      res.status(500).json({
        error: 'Export failed',
        message: error.message
      });
    }
  };
}