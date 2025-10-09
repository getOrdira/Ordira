import { batchingService } from '../features/batching.service';

export class DigestSchedulerService {
  async run(): Promise<void> {
    await batchingService.processDigests(new Date());
  }
}

export const digestSchedulerService = new DigestSchedulerService();
