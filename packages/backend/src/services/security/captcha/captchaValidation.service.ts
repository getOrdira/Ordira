import axios from 'axios';
import { logger } from '../../../utils/logger';
import {
  CaptchaConfig,
  CaptchaRiskLevel,
  determineCaptchaRiskLevel,
  getCaptchaConfig
} from '../../../config/captcha.config';
import {
  CaptchaDecision,
  CaptchaVerificationContext,
  CaptchaVerificationResult
} from './captcha.types';

interface GoogleVerificationResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[] | string;
}

export class CaptchaValidationService {
  async verify(
    token: string | undefined,
    context: CaptchaVerificationContext = {}
  ): Promise<CaptchaVerificationResult> {
    const config = getCaptchaConfig();

    const bypassResult = this.handleBypass(config, token, context);
    if (bypassResult) {
      return bypassResult;
    }

    if (!token || token.length === 0) {
      return this.buildFailureResult('Missing CAPTCHA token');
    }

    try {
      const providerResponse = await this.verifyWithProvider(config, token, context);
      const providerErrorsRaw = providerResponse['error-codes'];
      const providerErrors = Array.isArray(providerErrorsRaw)
        ? providerErrorsRaw
        : providerErrorsRaw
          ? [providerErrorsRaw]
          : [];

      const riskLevel = determineCaptchaRiskLevel(providerResponse.score, config.scoreThresholds);
      const decision = this.resolveDecision(providerResponse.score, riskLevel, config, context);

      const success = providerResponse.success && decision === 'allow';
      const shouldChallenge = decision === 'challenge';
      const shouldBlock = decision === 'deny';

      if (!providerResponse.success) {
        logger.warn('CAPTCHA verification failed', {
          requestId: context.requestId,
          ip: context.ip,
          decision,
          riskLevel,
          action: providerResponse.action,
          errors: providerErrors,
          hostname: providerResponse.hostname
        });
      }

      if (shouldChallenge || shouldBlock) {
        logger.info('CAPTCHA risk threshold triggered', {
          requestId: context.requestId,
          ip: context.ip,
          decision,
          riskLevel,
          score: providerResponse.score,
          action: providerResponse.action,
          failureCount: context.failureCount
        });
      }

      return {
        success,
        bypassed: false,
        tokenValidated: providerResponse.success,
        score: providerResponse.score ?? null,
        riskLevel,
        decision,
        shouldChallenge,
        shouldBlock,
        action: providerResponse.action,
        challengeTimestamp: providerResponse.challenge_ts,
        hostname: providerResponse.hostname,
        errorCodes: providerErrors,
        raw: providerResponse.raw,
        timestamp: new Date().toISOString(),
        reason: providerErrors.length > 0
          ? `CAPTCHA provider returned error: ${providerErrors.join(', ')}`
          : undefined
      };
    } catch (error) {
      const errorMessage = (error as Error).message || 'Unknown CAPTCHA verification error';
      logger.error('CAPTCHA verification error', {
        message: errorMessage,
        requestId: context.requestId,
        ip: context.ip
      });

      if (config.failOpen) {
        logger.warn('Fail-open mode active for CAPTCHA verification');
        return {
          success: true,
          bypassed: true,
          tokenValidated: false,
          score: null,
          riskLevel: 'medium',
          decision: 'allow',
          shouldChallenge: false,
          shouldBlock: false,
          reason: `CAPTCHA verification failed open: ${errorMessage}`,
          timestamp: new Date().toISOString()
        };
      }

      return this.buildFailureResult(errorMessage);
    }
  }

  private handleBypass(
    config: CaptchaConfig,
    token: string | undefined,
    context: CaptchaVerificationContext
  ): CaptchaVerificationResult | null {
    if (!config.enabled) {
      return {
        success: true,
        bypassed: true,
        tokenValidated: false,
        score: null,
        riskLevel: 'veryHigh',
        decision: 'allow',
        shouldChallenge: false,
        shouldBlock: false,
        reason: 'CAPTCHA disabled by configuration',
        timestamp: new Date().toISOString()
      };
    }

    if (config.bypass.allowInDevelopment && config.environment !== 'production') {
      return {
        success: true,
        bypassed: true,
        tokenValidated: false,
        score: null,
        riskLevel: 'veryHigh',
        decision: 'allow',
        shouldChallenge: false,
        shouldBlock: false,
        reason: 'Development bypass enabled',
        timestamp: new Date().toISOString()
      };
    }

    if (context.bypassToken && this.tokenMatches(context.bypassToken, config)) {
      return this.buildBypassResult('Bypass token accepted');
    }

    if (token && this.tokenMatches(token, config)) {
      return this.buildBypassResult('CAPTCHA token matched emergency bypass');
    }

    if (context.roles?.some(role => config.bypass.adminRoles.includes(role))) {
      return this.buildBypassResult('Admin role bypass');
    }

    if (context.userEmail && config.bypass.adminEmails.includes(context.userEmail)) {
      return this.buildBypassResult('Admin email bypass');
    }

    if (context.apiKey && config.bypass.apiKeys.includes(context.apiKey)) {
      return this.buildBypassResult('Trusted API key bypass');
    }

    return null;
  }

  private tokenMatches(token: string, config: CaptchaConfig): boolean {
    const trimmed = token.trim();
    return config.bypass.tokens.includes(trimmed) || config.bypass.emergencyTokens.includes(trimmed);
  }

  private buildBypassResult(reason: string): CaptchaVerificationResult {
    return {
      success: true,
      bypassed: true,
      tokenValidated: false,
      score: null,
      riskLevel: 'veryHigh',
      decision: 'allow',
      shouldChallenge: false,
      shouldBlock: false,
      reason,
      timestamp: new Date().toISOString()
    };
  }

  private buildFailureResult(reason: string): CaptchaVerificationResult {
    return {
      success: false,
      bypassed: false,
      tokenValidated: false,
      score: null,
      riskLevel: 'veryLow',
      decision: 'deny',
      shouldChallenge: false,
      shouldBlock: true,
      reason,
      timestamp: new Date().toISOString()
    };
  }

  private async verifyWithProvider(
    config: CaptchaConfig,
    token: string,
    context: CaptchaVerificationContext
  ): Promise<GoogleVerificationResponse & { raw: Record<string, unknown> }> {
    const params = new URLSearchParams();
    params.append('secret', config.secretKey);
    params.append('response', token);
    if (context.ip) {
      params.append('remoteip', context.ip);
    }

    const axiosResponse = await axios.post<GoogleVerificationResponse>(
      config.verificationUrl,
      params,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: config.timeoutMs
      }
    );

    const data = axiosResponse.data || { success: false };
    const raw: Record<string, unknown> = {
      ...data,
      remoteip: context.ip
    };

    return {
      ...data,
      raw
    };
  }

  private resolveDecision(
    score: number | undefined,
    riskLevel: CaptchaRiskLevel,
    config: CaptchaConfig,
    context: CaptchaVerificationContext
  ): CaptchaDecision {
    if (score === undefined || score === null) {
      return 'challenge';
    }

    if (context.failureCount && context.failureCount >= 3 && score < config.scoreThresholds.high) {
      return 'challenge';
    }

    if (score < config.scoreThresholds.veryLow) {
      return 'deny';
    }

    if (score < config.minimumScore || riskLevel === 'veryLow') {
      return 'deny';
    }

    if (score < config.scoreThresholds.low || riskLevel === 'low') {
      return 'challenge';
    }

    return 'allow';
  }
}

export const captchaValidationService = new CaptchaValidationService();

