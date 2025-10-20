import { Request, Response, NextFunction, RequestHandler } from 'express';
import { asyncHandler, createAppError } from './error.middleware';
import { ResponseHelper } from '../utils/responseUtils';
import { captchaVerifySchema } from '../validation/captcha.validation';
import { captchaService } from '../services/security/captcha/captcha.service';
import type {
  CaptchaAwareRequest,
  CaptchaEvaluation,
  CaptchaVerificationContext,
  CaptchaVerificationResult
} from '../services/security/captcha/captcha.types';

export interface CaptchaMiddlewareOptions {
  extractToken?: (req: Request) => string | undefined;
  buildContext?: (req: Request) => CaptchaVerificationContext;
  respondOnFailure?: boolean;
  attachEvaluation?: boolean;
  allowBypass?: boolean;
  minimumScore?: number;
  skip?: (req: Request) => boolean;
}

const DEFAULT_OPTIONS: CaptchaMiddlewareOptions = {
  respondOnFailure: true,
  attachEvaluation: true,
  allowBypass: true
};

function defaultTokenExtractor(req: Request): string | undefined {
  const bodyToken = (req.body && (req.body.captchaToken || req.body.token)) as string | undefined;
  const headerToken = req.headers['x-captcha-token'] as string | undefined;
  return bodyToken || headerToken;
}

function defaultContextBuilder(req: Request): CaptchaVerificationContext {
  const unifiedReq = req as CaptchaAwareRequest;
  return {
    ip: req.ip,
    userId: (unifiedReq as any).userId,
    userEmail: (unifiedReq as any).tokenPayload?.email,
    roles: (unifiedReq as any).tokenPayload?.roles,
    apiKey: req.headers['x-api-key'] as string | undefined,
    action: req.body?.action,
    bypassToken: req.body?.bypassToken || (req.headers['x-captcha-bypass'] as string | undefined),
    failureCount: typeof req.body?.failureCount === 'number' ? req.body.failureCount : undefined,
    userAgent: req.headers['user-agent'] as string | undefined,
    metadata: req.body?.metadata,
    requestId: req.headers['x-request-id'] as string | undefined
  };
}

export function createCaptchaMiddleware(options: CaptchaMiddlewareOptions = {}): RequestHandler {
  const merged = { ...DEFAULT_OPTIONS, ...options };

  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (merged.skip?.(req)) {
      return next();
    }

    const responseHelper = new ResponseHelper(res);
    const token = (merged.extractToken || defaultTokenExtractor)(req);

    const { error } = captchaVerifySchema.validate(
      {
        token,
        action: req.body?.action,
        bypassToken: req.body?.bypassToken,
        failureCount: req.body?.failureCount,
        metadata: req.body?.metadata
      },
      { abortEarly: false, allowUnknown: true }
    );

    if (error) {
      if (merged.respondOnFailure) {
        responseHelper.validationError('Invalid CAPTCHA payload', error.details.map(detail => detail.message));
        return;
      }
      throw createAppError('Invalid CAPTCHA payload', 400, 'CAPTCHA_PAYLOAD_INVALID', error.details);
    }

    const context = (merged.buildContext || defaultContextBuilder)(req);

    const verification: CaptchaVerificationResult = await captchaService.verifyToken(token, context);
    const evaluation: CaptchaEvaluation = captchaService.evaluate(verification);

    if (merged.attachEvaluation) {
      (req as CaptchaAwareRequest).captcha = verification;
      res.locals.captchaEvaluation = evaluation;
    }

    if (!merged.allowBypass && verification.bypassed) {
      if (merged.respondOnFailure) {
        responseHelper.error('CAPTCHA bypass is not allowed for this endpoint', 403, 'CAPTCHA_BYPASS_FORBIDDEN');
        return;
      }
      throw createAppError('CAPTCHA bypass is not allowed for this endpoint', 403, 'CAPTCHA_BYPASS_FORBIDDEN');
    }

    if (merged.minimumScore && verification.score !== null && verification.score < merged.minimumScore) {
      evaluation.enforceChallenge = true;
    }

    if (evaluation.enforceBlock && merged.respondOnFailure) {
      responseHelper.error('Request blocked by CAPTCHA policy', 403, 'CAPTCHA_BLOCKED', evaluation);
      return;
    }

    if (evaluation.enforceChallenge && merged.respondOnFailure) {
      responseHelper.error('Additional verification required', 403, 'CAPTCHA_CHALLENGE', evaluation);
      return;
    }

    next();
  });
}

export const captchaMiddleware = createCaptchaMiddleware();