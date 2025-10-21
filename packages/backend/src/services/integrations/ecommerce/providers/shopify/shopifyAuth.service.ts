import crypto from 'crypto';
import { integrationDataService } from '../../core/integrationData.service';
import { ecommerceOAuthService } from '../../core/oauth.service';
import { httpClientFactoryService } from '../../core/httpClientFactory.service';
import { EcommerceIntegrationError } from '../../core/errors';
import type { EcommerceProvider } from '../../core/types';

const PROVIDER: EcommerceProvider = 'shopify';
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY ?? '';
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET ?? '';
const APP_URL = process.env.APP_URL ?? '';
const SHOPIFY_REDIRECT_URI =
  process.env.SHOPIFY_REDIRECT_URI ?? `${APP_URL.replace(/\/+$/, '')}/api/integrations/shopify/callback`;
const DEFAULT_SCOPES =
  process.env.SHOPIFY_API_SCOPES ??
  [
    'read_orders',
    'write_orders',
    'read_products',
    'read_customers',
    'read_fulfillments',
    'write_fulfillments'
  ].join(',');
const AUTH_VERSION = process.env.SHOPIFY_API_VERSION ?? '2024-10';

export interface GenerateInstallUrlResult {
  url: string;
  state: string;
  expiresAt: Date;
  pkce?: {
    verifier: string;
    challenge: string;
    method: 'S256';
  };
}

interface GenerateInstallOptions {
  scopes?: string[];
  redirectUri?: string;
}

interface OAuthCallbackInput {
  code: string;
  state: string;
  hmac: string;
  shop: string;
  timestamp?: string;
  host?: string;
  [key: string]: string | undefined;
}

interface AuthorizationExchangeResponse {
  access_token: string;
  scope: string;
  expires_in?: number;
}

export class ShopifyAuthService {
  /**
   * Generate a secure installation URL for the merchant to authorise the app.
   */
  async generateInstallUrl(
    businessId: string,
    rawShopDomain: string,
    options: GenerateInstallOptions = {}
  ): Promise<GenerateInstallUrlResult> {
    if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
      throw new EcommerceIntegrationError('Shopify API credentials are not configured', {
        provider: PROVIDER,
        code: 'MISSING_CREDENTIALS',
        severity: 'critical'
      });
    }

    const shopDomain = this.normalizeShopDomain(rawShopDomain);
    const state = await ecommerceOAuthService.generateStateToken(PROVIDER, businessId, {
      metadata: { shopDomain }
    });

    const pkce = ecommerceOAuthService.generatePkcePair();
    const scopes = (options.scopes ?? DEFAULT_SCOPES.split(',')).map((scope) => scope.trim()).filter(Boolean);

    const authorizeUrl = ecommerceOAuthService.buildAuthorizationUrl(
      `https://${shopDomain}/admin/oauth/authorize`,
      {
        client_id: SHOPIFY_API_KEY,
        scope: scopes.join(','),
        redirect_uri: options.redirectUri ?? SHOPIFY_REDIRECT_URI,
        state,
        'grant_options[]': 'per-user',
        response_type: 'code',
        code_challenge: pkce.challenge,
        code_challenge_method: pkce.method
      }
    );

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    return {
      url: authorizeUrl,
      state,
      expiresAt,
      pkce
    };
  }

  /**
   * Handle Shopify OAuth callback and persist credentials.
   */
  async handleOAuthCallback(query: OAuthCallbackInput): Promise<void> {
    const { code, state, hmac, shop } = query;
    if (!code || !state || !hmac || !shop) {
      throw new EcommerceIntegrationError('Missing OAuth callback parameters', {
        provider: PROVIDER,
        code: 'INVALID_CALLBACK',
        statusCode: 400,
        severity: 'medium'
      });
    }

    const shopDomain = this.normalizeShopDomain(shop);
    const payload = await ecommerceOAuthService.validateStateToken(PROVIDER, state);
    this.verifyCallbackHmac(query);

    const tokenResponse = await this.exchangeAuthorizationCode(shopDomain, code);

    await integrationDataService.upsertIntegrationCredentials(payload.businessId, PROVIDER, {
      domain: shopDomain,
      accessToken: tokenResponse.access_token,
      metadata: {
        scope: tokenResponse.scope
      },
      connectedAt: new Date()
    });
  }

  /**
   * Disconnect Shopify integration for the business.
   */
  async disconnect(businessId: string): Promise<void> {
    await integrationDataService.clearIntegration(businessId, PROVIDER);
  }

  /**
   * Validate a webhook signature using the Shopify shared secret.
   */
  verifyWebhookSignature(rawBody: Buffer, hmacHeader: string | undefined): boolean {
    if (!hmacHeader) {
      return false;
    }

    const digest = crypto.createHmac('sha256', SHOPIFY_API_SECRET).update(rawBody).digest('base64');
    return crypto.timingSafeEqual(Buffer.from(hmacHeader, 'utf8'), Buffer.from(digest, 'utf8'));
  }

  /**
   * Verify the callback query signature according to Shopify's HMAC rules.
   */
  private verifyCallbackHmac(query: OAuthCallbackInput): void {
    const receivedHmac = query.hmac;
    const sorted = Object.keys(query)
      .filter((key) => key !== 'hmac' && key !== 'signature')
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');

    const digest = crypto.createHmac('sha256', SHOPIFY_API_SECRET).update(sorted).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(receivedHmac, 'utf8'), Buffer.from(digest, 'utf8'))) {
      throw new EcommerceIntegrationError('Shopify OAuth callback failed HMAC validation', {
        provider: PROVIDER,
        code: 'INVALID_HMAC',
        statusCode: 400,
        severity: 'high'
      });
    }
  }

  private async exchangeAuthorizationCode(
    shopDomain: string,
    code: string
  ): Promise<AuthorizationExchangeResponse> {
    try {
      const client = httpClientFactoryService.createClient({
        provider: PROVIDER,
        baseURL: `https://${shopDomain}`,
        logRequests: false,
        timeoutMs: 10_000
      });

      const response = await client.post<AuthorizationExchangeResponse>(
        '/admin/oauth/access_token',
        {
          client_id: SHOPIFY_API_KEY,
          client_secret: SHOPIFY_API_SECRET,
          code
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data?.access_token) {
        throw new EcommerceIntegrationError('Shopify OAuth response missing access token', {
          provider: PROVIDER,
          code: 'MISSING_ACCESS_TOKEN',
          severity: 'high'
        });
      }

      return response.data;
    } catch (error) {
      throw new EcommerceIntegrationError('Failed to exchange Shopify authorization code', {
        provider: PROVIDER,
        code: 'OAUTH_EXCHANGE_FAILED',
        severity: 'high',
        cause: error as Error
      });
    }
  }

  private normalizeShopDomain(input: string): string {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) {
      throw new EcommerceIntegrationError('Shop domain is required', {
        provider: PROVIDER,
        code: 'INVALID_SHOP_DOMAIN',
        statusCode: 400,
        severity: 'medium'
      });
    }

    if (trimmed.endsWith('.myshopify.com')) {
      return trimmed;
    }

    const sanitised = trimmed.replace(/[^a-z0-9-]/gi, '');
    if (!sanitised) {
      throw new EcommerceIntegrationError('Shop domain is invalid', {
        provider: PROVIDER,
        code: 'INVALID_SHOP_DOMAIN',
        statusCode: 400,
        severity: 'medium'
      });
    }

    return `${sanitised}.myshopify.com`;
  }
}

export const shopifyAuthService = new ShopifyAuthService();
