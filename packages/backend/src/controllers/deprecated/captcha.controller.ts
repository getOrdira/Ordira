import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../middleware/deprecated/error.middleware';
import { ValidatedRequest } from '../../middleware/deprecated/validation.middleware';
import { UnifiedAuthRequest } from '../../middleware/deprecated/unifiedAuth.middleware';
import { ResponseHelper } from '../../utils/responseUtils';
import { getCaptchaConfig } from '../../config/captcha.config';
import { captchaValidationService } from '../../services/security/captcha/captchaValidation.service';
import type {
  CaptchaVerificationContext,
  CaptchaVerificationResult
} from '../../services/security/captcha/captcha.types';

interface CaptchaVerifyBody {
  token?: string;
  action?: string;
  bypassToken?: string;
  failureCount?: number;
  metadata?: Record<string, unknown>;
}

interface CaptchaVerifyRequest extends Request, UnifiedAuthRequest, ValidatedRequest {
  validatedBody?: CaptchaVerifyBody;
}

export class CaptchaController {
  verifyCaptcha = asyncHandler(async (
    req: CaptchaVerifyRequest,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const responseHelper = new ResponseHelper(res, req.headers['x-request-id'] as string | undefined);
    const body: CaptchaVerifyBody = req.validatedBody || req.body || {};

    const token = body.token;
    const action = body.action;
    const bypassToken = body.bypassToken;
    const failureCount = body.failureCount;

    const context: CaptchaVerificationContext = {
      ip: req.ip,
      userId: req.userId,
      userEmail: undefined,
      roles: undefined,
      apiKey: (req.headers['x-api-key'] as string | undefined) || undefined,
      action,
      bypassToken,
      failureCount,
      userAgent: req.headers['user-agent'] as string | undefined,
      metadata: body.metadata,
      requestId: req.headers['x-request-id'] as string | undefined
    };

    const verification: CaptchaVerificationResult = await captchaValidationService.verify(token, context);
    const config = getCaptchaConfig();

    const payload = {
      decision: verification.decision,
      riskLevel: verification.riskLevel,
      score: verification.score,
      shouldChallenge: verification.shouldChallenge,
      shouldBlock: verification.shouldBlock,
      bypassed: verification.bypassed,
      tokenValidated: verification.tokenValidated,
      reason: verification.reason,
      action: verification.action,
      challengeTimestamp: verification.challengeTimestamp,
      hostname: verification.hostname,
      errorCodes: verification.errorCodes,
      timestamp: verification.timestamp,
      config: {
        enabled: config.enabled,
        minimumScore: config.minimumScore,
        scoreThresholds: config.scoreThresholds
      }
    };

    if (verification.decision === 'deny') {
      responseHelper.error('CAPTCHA verification failed', 403, 'CAPTCHA_DENIED', payload);
      return;
    }

    const message = verification.decision === 'challenge'
      ? 'Additional verification required'
      : 'CAPTCHA verification successful';

    responseHelper.success(payload, message);
  });

  getCaptchaStatus = asyncHandler(async (
    _req: Request,
    res: Response
  ): Promise<void> => {
    const responseHelper = new ResponseHelper(res);
    const config = getCaptchaConfig();

    responseHelper.success({
      enabled: config.enabled,
      enterprise: config.enterprise,
      environment: config.environment,
      minimumScore: config.minimumScore,
      scoreThresholds: config.scoreThresholds,
      timeoutMs: config.timeoutMs,
      requiredActions: config.requiredActions
    });
  });
}

export const captchaController = new CaptchaController();
