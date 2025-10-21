import { streamingService } from './features/streaming.service';

export {
  StreamingService,
  streamingService,
  type StreamingOptions,
  type ExportProgress,
  type StreamingStats,
  createStreamingEndpoint
} from './features/streaming.service';

export const streamingServices = {
  streamingService
};

export type StreamingServices = typeof streamingServices;
