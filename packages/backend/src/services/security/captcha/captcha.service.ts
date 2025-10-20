import { logger } from '../../../utils/logger';
import { getCaptchaConfig } from '../../../config/captcha.config';
import {
  captchaValidationService
} from './captchaValidation.service';
import type {
  CaptchaVerificationContext,
  CaptchaVerificationResult,
  CaptchaEvaluation,
  CaptchaRateLimitAdjustment
} from './captcha.types';

const RATE_LIMIT_MULTIPLIERS = {
  veryHigh: 1.5,
  high: 1,
  medium: 0.75,
  low: 0.5,
  veryLow: 0.25
} as const;

export class CaptchaService {
  constructor(private readonly validator = captchaValidationService) {}

  async verifyToken(
    token: string | undefined,
    context: CaptchaVerificationContext = {}
  ): Promise<CaptchaVerificationResult> {
    const result = await this.validator.verify(token, context);

    if (result.bypassed) {
      logger.debug('CAPTCHA bypass applied', {
        requestId: context.requestId,
        reason: result.reason
      });
    }

    return result;
  }

  evaluate(result: CaptchaVerificationResult): CaptchaEvaluation {
    const config = getCaptchaConfig();

    const rateLimit = this.getRateLimitAdjustment(result);

    const enforceBlock = result.decision === 'deny' || result.shouldBlock;
    const enforceChallenge = result.decision === 'challenge' || result.shouldChallenge;

    if (!result.success && !result.bypassed) {
      logger.warn('CAPTCHA result indicates failure', {
        decision: result.decision,
        riskLevel: result.riskLevel,
        reason: result.reason,
        score: result.score
      });
    }

    if (result.score !== null && result.score < config.minimumScore && !enforceBlock) {
      logger.info('CAPTCHA minimum score threshold triggered', {
        score: result.score,
        threshold: config.minimumScore
      });
    }

    return {
      result,
      rateLimit,
      enforceBlock,
      enforceChallenge
    };
  }

  getRateLimitAdjustment(result: CaptchaVerificationResult): CaptchaRateLimitAdjustment {
    const multiplier = RATE_LIMIT_MULTIPLIERS[result.riskLevel] ?? 1;
    return {
      multiplier,
      riskLevel: result.riskLevel,
      reason: result.reason,
      minimumScore: result.score ?? undefined
    };
  }

  isChallengeRequired(result: CaptchaVerificationResult): boolean {
    return result.decision === 'challenge' || result.shouldChallenge;
  }

  isBlocked(result: CaptchaVerificationResult): boolean {
    return result.decision === 'deny' || result.shouldBlock;
  }

  hasValidScore(result: CaptchaVerificationResult): boolean {
    if (result.score === null) {
      return false;
    }
    const config = getCaptchaConfig();
    return result.score >= config.minimumScore;
  }
}

export const captchaService = new CaptchaService();