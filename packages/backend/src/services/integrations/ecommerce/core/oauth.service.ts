import crypto from 'crypto';
import { cacheStoreService } from '../../../infrastructure/cache/core/cacheStore.service';
import { logger } from '../../../../utils/logger';
import { EcommerceIntegrationError } from './errors';
import type { EcommerceProvider, OAuthStatePayload, PkcePair } from './types';

const STATE_CACHE_PREFIX = 'ecommerce:oauth:state';
const DEFAULT_STATE_TTL_SECONDS = 10 * 60; // 10 minutes

interface GenerateStateOptions {
  ttlSeconds?: number;
  metadata?: Record<string, unknown>;
}

interface ValidateStateOptions {
  consume?: boolean;
}

/**
 * Provides reusable OAuth helpers across all ecommerce integrations.
 */
export class EcommerceOAuthService {
  /**
   * Generates a cryptographically secure state token and caches it for validation.
   */
  async generateStateToken(
    provider: EcommerceProvider,
    businessId: string,
    options: GenerateStateOptions = {}
  ): Promise<string> {
    const random = crypto.randomBytes(32).toString('base64url');
    const state = `${provider}-${random}`;
    const payload: OAuthStatePayload = {
      provider,
      businessId,
      metadata: options.metadata,
      createdAt: new Date().toISOString()
    };

    const cacheKey = this.buildCacheKey(state);
    const stored = await cacheStoreService.set(cacheKey, payload, {
      ttl: options.ttlSeconds ?? DEFAULT_STATE_TTL_SECONDS,
      serialize: true,
      prefix: STATE_CACHE_PREFIX
    });

    if (!stored) {
      throw new EcommerceIntegrationError('Failed to persist OAuth state token', {
        provider,
        businessId,
        code: 'STATE_PERSISTENCE_FAILED',
        severity: 'high'
      });
    }

    logger.info('Generated OAuth state token', { provider, businessId });
    return state;
  }

  /**
   * Validates an OAuth state token. Optionally consumes (deletes) the token to enforce single use.
   */
  async validateStateToken(
    provider: EcommerceProvider,
    state: string,
    options: ValidateStateOptions = {}
  ): Promise<OAuthStatePayload> {
    const cacheKey = this.buildCacheKey(state);
    const payload = await cacheStoreService.get<OAuthStatePayload>(cacheKey, {
      serialize: true,
      prefix: STATE_CACHE_PREFIX
    });

    if (!payload) {
      throw new EcommerceIntegrationError('OAuth state token is invalid or has expired', {
        provider,
        code: 'INVALID_STATE',
        statusCode: 400,
        severity: 'medium'
      });
    }

    if (payload.provider !== provider) {
      throw new EcommerceIntegrationError('OAuth state token does not match provider', {
        provider,
        businessId: payload.businessId,
        code: 'STATE_PROVIDER_MISMATCH',
        statusCode: 400,
        severity: 'medium'
      });
    }

    const consume = options.consume ?? true;
    if (consume) {
      await cacheStoreService.delete(cacheKey, STATE_CACHE_PREFIX);
    }

    logger.info('Validated OAuth state token', {
      provider,
      businessId: payload.businessId,
      consume
    });

    return payload;
  }

  /**
   * Explicitly invalidates a cached state token without throwing if it has already been consumed.
   */
  async invalidateStateToken(state: string): Promise<void> {
    await cacheStoreService.delete(this.buildCacheKey(state), STATE_CACHE_PREFIX);
  }

  /**
   * Generates a PKCE verifier/challenge pair as mandated by modern OAuth best practices.
   */
  generatePkcePair(): PkcePair {
    const verifier = crypto.randomBytes(64).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

    return {
      verifier,
      challenge,
      method: 'S256'
    };
  }

  /**
   * Builds a provider authorization URL while ensuring query parameters are safely encoded.
   */
  buildAuthorizationUrl(baseAuthorizeUrl: string, params: Record<string, string | number | undefined>): string {
    const url = new URL(baseAuthorizeUrl);

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      url.searchParams.set(key, String(value));
    });

    return url.toString();
  }

  private buildCacheKey(state: string): string {
    const digest = crypto.createHash('sha256').update(state).digest('hex');
    return `state:${digest}`;
  }
}

export const ecommerceOAuthService = new EcommerceOAuthService();
