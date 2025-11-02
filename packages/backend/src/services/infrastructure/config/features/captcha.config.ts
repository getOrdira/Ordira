/**
 * CAPTCHA Configuration Service
 * 
 * Manages CAPTCHA configuration for security and bot protection
 */

import { logger } from '../../logging';

export type CaptchaRiskLevel = 'veryHigh' | 'high' | 'medium' | 'low' | 'veryLow';

export interface CaptchaScoreThresholds {
  veryHigh: number;
  high: number;
  medium: number;
  low: number;
  veryLow: number;
}

export interface CaptchaBypassConfig {
  allowInDevelopment: boolean;
  adminRoles: string[];
  adminEmails: string[];
  apiKeys: string[];
  tokens: string[];
  emergencyTokens: string[];
}

export interface CaptchaConfig {
  enabled: boolean;
  environment: string;
  siteKey: string;
  secretKey: string;
  enterprise: boolean;
  verificationUrl: string;
  timeoutMs: number;
  failOpen: boolean;
  scoreThresholds: CaptchaScoreThresholds;
  minimumScore: number;
  bypass: CaptchaBypassConfig;
  requiredActions: string[];
}

export const DEFAULT_CAPTCHA_SCORE_THRESHOLDS: CaptchaScoreThresholds = {
  veryHigh: 0.9,
  high: 0.7,
  medium: 0.5,
  low: 0.3,
  veryLow: 0.1
};

const DEFAULT_VERIFICATION_URL = 'https://www.google.com/recaptcha/api/siteverify';
const DEFAULT_TIMEOUT_MS = 4000;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === null) {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(value.toLowerCase());
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

function sanitizeKey(key: string | undefined): string {
  if (!key) {
    return '';
  }
  if (key.length <= 8) {
    return key;
  }
  return `${key.slice(0, 4)}***${key.slice(-4)}`;
}

export function determineCaptchaRiskLevel(
  score: number | null | undefined,
  thresholds: CaptchaScoreThresholds = DEFAULT_CAPTCHA_SCORE_THRESHOLDS
): CaptchaRiskLevel {
  if (score === null || score === undefined) {
    return 'veryLow';
  }

  if (score >= thresholds.veryHigh) {
    return 'veryHigh';
  }
  if (score >= thresholds.high) {
    return 'high';
  }
  if (score >= thresholds.medium) {
    return 'medium';
  }
  if (score >= thresholds.low) {
    return 'low';
  }
  return 'veryLow';
}

export function getCaptchaConfig(): CaptchaConfig {
  const environment = process.env.NODE_ENV || 'development';
  const siteKey = process.env.CAPTCHA_SITE_KEY || process.env.RECAPTCHA_SITE_KEY || '';
  const secretKey = process.env.CAPTCHA_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY || '';
  const enterprise = parseBoolean(process.env.CAPTCHA_ENTERPRISE, false);

  const scoreThresholds: CaptchaScoreThresholds = {
    veryHigh: parseNumber(process.env.CAPTCHA_SCORE_VERY_HIGH, DEFAULT_CAPTCHA_SCORE_THRESHOLDS.veryHigh),
    high: parseNumber(process.env.CAPTCHA_SCORE_HIGH, DEFAULT_CAPTCHA_SCORE_THRESHOLDS.high),
    medium: parseNumber(process.env.CAPTCHA_SCORE_MEDIUM, DEFAULT_CAPTCHA_SCORE_THRESHOLDS.medium),
    low: parseNumber(process.env.CAPTCHA_SCORE_LOW, DEFAULT_CAPTCHA_SCORE_THRESHOLDS.low),
    veryLow: parseNumber(process.env.CAPTCHA_SCORE_VERY_LOW, DEFAULT_CAPTCHA_SCORE_THRESHOLDS.veryLow)
  };

  const minimumScore = parseNumber(process.env.CAPTCHA_MIN_SCORE, scoreThresholds.medium);

  const bypass: CaptchaBypassConfig = {
    allowInDevelopment: parseBoolean(process.env.CAPTCHA_DEV_BYPASS, environment !== 'production'),
    adminRoles: parseList(process.env.CAPTCHA_ADMIN_ROLES || 'admin,super-admin'),
    adminEmails: parseList(process.env.CAPTCHA_ADMIN_EMAILS),
    apiKeys: parseList(process.env.CAPTCHA_BYPASS_API_KEYS),
    tokens: parseList(process.env.CAPTCHA_BYPASS_TOKENS),
    emergencyTokens: parseList(process.env.CAPTCHA_EMERGENCY_BYPASS_TOKENS)
  };

  const enabledFlag = parseBoolean(process.env.CAPTCHA_ENABLED, true);
  const enabled = enabledFlag && Boolean(siteKey) && Boolean(secretKey);

  if (!enabled && enabledFlag) {
    logger.warn('CAPTCHA is configured but missing site or secret key', {
      environment,
      siteKeySet: Boolean(siteKey),
      secretKeySet: Boolean(secretKey)
    });
  }

  const config: CaptchaConfig = {
    enabled,
    environment,
    siteKey,
    secretKey,
    enterprise,
    verificationUrl: process.env.CAPTCHA_VERIFICATION_URL || DEFAULT_VERIFICATION_URL,
    timeoutMs: parseNumber(process.env.CAPTCHA_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    failOpen: parseBoolean(process.env.CAPTCHA_FAIL_OPEN, true),
    scoreThresholds,
    minimumScore,
    bypass,
    requiredActions: parseList(process.env.CAPTCHA_REQUIRED_ACTIONS)
  };

  logger.debug('CAPTCHA configuration loaded', {
    enabled: config.enabled,
    enterprise: config.enterprise,
    environment: config.environment,
    verificationUrl: config.verificationUrl,
    timeoutMs: config.timeoutMs,
    minimumScore: config.minimumScore,
    scoreThresholds: config.scoreThresholds,
    bypass: {
      allowInDevelopment: config.bypass.allowInDevelopment,
      adminRoles: config.bypass.adminRoles,
      adminEmails: config.bypass.adminEmails.length,
      apiKeys: config.bypass.apiKeys.length,
      tokens: config.bypass.tokens.length,
      emergencyTokens: config.bypass.emergencyTokens.length
    },
    siteKey: sanitizeKey(config.siteKey),
    secretKey: sanitizeKey(config.secretKey)
  });

  return config;
}

