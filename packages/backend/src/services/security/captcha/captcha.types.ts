import type { Request } from 'express';
import type { CaptchaRiskLevel } from '../../../config/captcha.config';

export type CaptchaDecision = 'allow' | 'challenge' | 'deny';

export interface CaptchaVerificationContext {
  ip?: string;
  userId?: string;
  userEmail?: string;
  roles?: string[];
  apiKey?: string;
  action?: string;
  bypassToken?: string;
  requestId?: string;
  failureCount?: number;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface CaptchaVerificationResult {
  success: boolean;
  bypassed: boolean;
  tokenValidated: boolean;
  score: number | null;
  riskLevel: CaptchaRiskLevel;
  decision: CaptchaDecision;
  shouldChallenge: boolean;
  shouldBlock: boolean;
  reason?: string;
  action?: string;
  challengeTimestamp?: string;
  hostname?: string;
  errorCodes?: string[];
  raw?: Record<string, unknown>;
  timestamp: string;
}

export interface CaptchaRateLimitAdjustment {
  multiplier: number;
  riskLevel: CaptchaRiskLevel;
  reason?: string;
  minimumScore?: number;
}

export interface CaptchaEvaluation {
  result: CaptchaVerificationResult;
  rateLimit?: CaptchaRateLimitAdjustment;
  enforceChallenge: boolean;
  enforceBlock: boolean;
}

export interface CaptchaRequestExtension {
  captcha?: CaptchaVerificationResult;
}

export type CaptchaAwareRequest<T extends Request = Request> = T & CaptchaRequestExtension;