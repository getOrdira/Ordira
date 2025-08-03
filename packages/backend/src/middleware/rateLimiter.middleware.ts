import rateLimit from 'express-rate-limit';
import { BrandSettings } from '../models/brandSettings.model';
import { PlanKey } from '../constants/plans';
import { AuthRequest } from './auth.middleware';
import { Response, NextFunction } from 'express';

// define per-plan qps limits
const PLAN_RATE_LIMITS: Record<PlanKey, number> = {
  foundation: 30,    // requests per minute
  growth:  75,
  premium: 150,
  enterprise: 750
};

// dynamic rate limiter factory
export function dynamicRateLimiter() {
  return rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100,                // limit each key to 100 requests per window

    // Generate a key per userId (set by authenticate) or fallback to IP.
    // We use `any` for req here so TS won't complain about missing props.
    keyGenerator: (req: any) => {
      return (req.userId as string) || req.ip;
    },

    // Custom handler when the limit is exceeded.
    handler: (req: any, res: Response, next: NextFunction) => {
      res.status(429).json({ error: 'Too many requests, please try again later.' });
    }
  });
}
