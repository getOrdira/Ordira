const RATE_LIMIT_WINDOW_MS = 60_000;

export class ThrottlerService {
  private lastSend: Record<string, number> = {};

  canSend(key: string): boolean {
    const now = Date.now();
    const last = this.lastSend[key] || 0;
    if (now - last < RATE_LIMIT_WINDOW_MS) {
      return false;
    }
    this.lastSend[key] = now;
    return true;
  }
}

export const throttlerService = new ThrottlerService();
