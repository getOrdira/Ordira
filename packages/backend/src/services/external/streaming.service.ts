// Deprecated location: src/services/external/streaming.service.ts
// Re-export the modular streaming service.

export {
  StreamingService,
  streamingService,
  type StreamingOptions,
  type ExportProgress,
  type StreamingStats,
  createStreamingEndpoint
} from '../infrastructure/streaming';
