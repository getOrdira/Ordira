// src/controllers/integrations/ecommerce/ecommerceOAuth.controller.ts
// Controller exposing ecommerce OAuth helper endpoints

import { Response } from 'express';
import { EcommerceBaseController, EcommerceBaseRequest } from './ecommerceBase.controller';
import type { EcommerceProvider } from '../../../services/integrations/ecommerce';

interface GenerateStateRequest extends EcommerceBaseRequest {
  validatedParams?: {
    businessId?: string;
    provider?: string;
  };
  validatedBody?: {
    ttlSeconds?: number;
    metadata?: Record<string, unknown>;
  };
  validatedQuery?: {
    ttlSeconds?: number;
  };
}

interface ValidateStateRequest extends EcommerceBaseRequest {
  validatedParams?: {
    provider?: string;
  };
  validatedQuery?: {
    state?: string;
    consume?: boolean;
  };
}

interface InvalidateStateRequest extends EcommerceBaseRequest {
  validatedQuery?: {
    state?: string;
  };
}

interface AuthorizationUrlRequest extends EcommerceBaseRequest {
  validatedParams?: {
    provider?: string;
  };
  validatedBody?: {
    baseAuthorizeUrl?: string;
    params?: Record<string, string | number | undefined>;
  };
}

export class EcommerceOAuthController extends EcommerceBaseController {
  /**
   * Generate a new OAuth state token (and optional metadata) for a provider.
   */
  async generateStateToken(req: GenerateStateRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_OAUTH_STATE_GENERATE');

      const businessId = this.requireBusinessId(req);
      const provider = this.requireProvider(req);
      const body = this.sanitizeInput(
        (req.validatedBody ?? (req.body as Record<string, unknown>) ?? {}) as Record<string, unknown>
      );

      const ttlSeconds = this.parseOptionalNumber(
        body.ttlSeconds ?? req.validatedQuery?.ttlSeconds ?? (req.query as any)?.ttlSeconds,
        { min: 30, max: 60 * 30 }
      );
      const metadata = (body.metadata as Record<string, unknown> | undefined) ?? undefined;

      try {
        const state = await this.ecommerceOAuthService.generateStateToken(provider, businessId, {
          ttlSeconds,
          metadata
        });

        const pkce = this.ecommerceOAuthService.generatePkcePair();

        this.logAction(req, 'INTEGRATIONS_ECOM_OAUTH_STATE_GENERATE_SUCCESS', {
          provider,
          businessId,
          ttlSeconds
        });

        return {
          provider,
          businessId,
          state,
          ttlSeconds: ttlSeconds ?? undefined,
          pkce
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'OAuth state token generated successfully', this.getRequestMeta(req));
  }

  /**
   * Validate an incoming OAuth callback state token.
   */
  async validateStateToken(req: ValidateStateRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_OAUTH_STATE_VALIDATE');

      const provider = this.requireProvider(req);
      const state =
        this.parseString(req.validatedQuery?.state) ??
        this.parseString((req.query as any)?.state);

      if (!state) {
        throw { statusCode: 400, message: 'State token is required for validation' };
      }

      const consume =
        req.validatedQuery?.consume ??
        this.parseOptionalBoolean((req.query as any)?.consume) ??
        true;

      try {
        const payload = await this.ecommerceOAuthService.validateStateToken(provider, state, { consume });

        this.logAction(req, 'INTEGRATIONS_ECOM_OAUTH_STATE_VALIDATE_SUCCESS', {
          provider,
          stateConsumed: consume,
          businessId: payload.businessId
        });

        return {
          provider,
          state,
          payload
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'OAuth state token validated successfully', this.getRequestMeta(req));
  }

  /**
   * Explicitly invalidate a state token (useful for abort flows).
   */
  async invalidateStateToken(req: InvalidateStateRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_OAUTH_STATE_INVALIDATE');

      const state =
        this.parseString(req.validatedQuery?.state) ??
        this.parseString((req.query as any)?.state);

      if (!state) {
        throw { statusCode: 400, message: 'State token is required for invalidation' };
      }

      try {
        await this.ecommerceOAuthService.invalidateStateToken(state);

        this.logAction(req, 'INTEGRATIONS_ECOM_OAUTH_STATE_INVALIDATE_SUCCESS', {
          state
        });

        return {
          state,
          invalidated: true,
          invalidatedAt: new Date().toISOString()
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'OAuth state token invalidated', this.getRequestMeta(req));
  }

  /**
   * Build a provider authorisation URL using provided query parameters.
   */
  async buildAuthorizationUrl(req: AuthorizationUrlRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_OAUTH_AUTHORIZE_URL');

      const provider = this.requireProvider(req);
      const body = this.sanitizeInput(
        (req.validatedBody ?? (req.body as Record<string, unknown>) ?? {}) as Record<string, unknown>
      );

      const baseAuthorizeUrl = this.parseString(body.baseAuthorizeUrl);
      if (!baseAuthorizeUrl) {
        throw { statusCode: 400, message: 'baseAuthorizeUrl is required' };
      }

      const params = (body.params as Record<string, string | number | undefined> | undefined) ?? {};

      try {
        const url = this.ecommerceOAuthService.buildAuthorizationUrl(baseAuthorizeUrl, params);

        this.logAction(req, 'INTEGRATIONS_ECOM_OAUTH_AUTHORIZE_URL_SUCCESS', {
          provider,
          baseAuthorizeUrl
        });

        return {
          provider,
          url
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'Authorization URL generated successfully', this.getRequestMeta(req));
  }
}

export const ecommerceOAuthController = new EcommerceOAuthController();

