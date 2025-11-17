import { Request, Response, NextFunction, RequestHandler } from 'express';
import { createAppError } from '../core';
import { ResponseHelper } from '../../utils/responseUtils';
import { captchaService } from '../../services/security/captcha/captcha.service';
import type {
  CaptchaAwareRequest,
  CaptchaEvaluation,
  CaptchaVerificationResult
} from '../../services/security/captcha/captcha.types';
import type { CaptchaRiskLevel } from '../../config/captcha.config';

export interface CaptchaRateLimitOptions {
  multipliers?: Partial<Record<CaptchaRiskLevel, number>>;
  defaultMultiplier?: number;
  blockOnDeny?: boolean;
  respondOnBlock?: boolean;
  attachEvaluation?: boolean;
}

const DEFAULT_RATE_LIMIT_OPTIONS: CaptchaRateLimitOptions = {
  defaultMultiplier: 1,
  blockOnDeny: true,
  respondOnBlock: true,
  attachEvaluation: true
};

export function createCaptchaRateLimitMiddleware(
  options: CaptchaRateLimitOptions = {}
): RequestHandler {
  const merged = { ...DEFAULT_RATE_LIMIT_OPTIONS, ...options };

  const handler = (req: Request, res: Response, next: NextFunction) => {
    const awareReq = req as CaptchaAwareRequest;
    const responseHelper = new ResponseHelper(res);

    const captchaResult: CaptchaVerificationResult | undefined = awareReq.captcha
      || res.locals.captchaEvaluation?.result;

    if (!captchaResult) {
      res.locals.rateLimitMultiplier = merged.defaultMultiplier ?? 1;
      return next();
    }

    const evaluation: CaptchaEvaluation = res.locals.captchaEvaluation
      || captchaService.evaluate(captchaResult);

    const baseAdjustment = captchaService.getRateLimitAdjustment(captchaResult);
    const overrideMultiplier = merged.multipliers?.[baseAdjustment.riskLevel];
    const multiplier = overrideMultiplier ?? baseAdjustment.multiplier;

    res.locals.rateLimitMultiplier = multiplier;
    res.locals.captchaRateLimit = {
      multiplier,
      riskLevel: baseAdjustment.riskLevel,
      decision: captchaResult.decision
    };

    if (merged.attachEvaluation && !res.locals.captchaEvaluation) {
      res.locals.captchaEvaluation = evaluation;
    }

    if (merged.blockOnDeny && evaluation.enforceBlock) {
      if (merged.respondOnBlock) {
        responseHelper.error('Request blocked due to suspicious activity', 429, 'CAPTCHA_RATE_LIMIT', {
          multiplier,
          evaluation
        });
        return;
      }
      return next(createAppError('Request blocked due to CAPTCHA decision', 429, 'CAPTCHA_RATE_LIMIT'));
    }

    next();
  };
  
  return handler as RequestHandler;
}

export const captchaRateLimitMiddleware = createCaptchaRateLimitMiddleware();

