import axios from 'axios';
import crypto from 'crypto';
import { integrationDataService } from '../../core/integrationData.service';
import { ecommerceOAuthService } from '../../core/oauth.service';
import { EcommerceIntegrationError } from '../../core/errors';
import type { EcommerceProvider } from '../../core/types';

const PROVIDER: EcommerceProvider = 'wix';
const AUTHORIZE_URL = 'https://www.wix.com/oauth/authorize';
const TOKEN_URL = 'https://www.wixapis.com/oauth/access';
const DEFAULT_SCOPES = [
  'wix-stores.orders-read',
  'wix-stores.products-read',
  'wix-webhooks.webhooks-write'
];
const APP_URL = process.env.APP_URL ?? '';
const WIX_CLIENT_ID = process.env.WIX_CLIENT_ID ?? '';
const WIX_CLIENT_SECRET = process.env.WIX_CLIENT_SECRET ?? '';
const REDIRECT_PATH = process.env.WIX_REDIRECT_PATH ?? '/api/integrations/wix/callback';

export interface WixInstallUrlOptions {
  scopes?: string[];
  returnUrl?: string;
}

export interface WixInstallUrlResult {
  url: string;
  state: string;
  expiresAt: Date;
}

export interface WixOAuthCallbackParams {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

export class WixAuthService {
  async generateInstallUrl(businessId: string, options: WixInstallUrlOptions = {}): Promise<WixInstallUrlResult> {
    if (!businessId?.trim()) {
      throw new EcommerceIntegrationError('Business identifier is required', {
        provider: PROVIDER,
        code: 'INVALID_BUSINESS_ID',
        statusCode: 400,
        severity: 'medium'
      });
    }

    this.ensureConfig();

    const state = await ecommerceOAuthService.generateStateToken(PROVIDER, businessId, {
      metadata: {
        returnUrl: options.returnUrl
      }
    });

    const scopes = (options.scopes ?? DEFAULT_SCOPES).join(',');
    const redirectUri = this.buildRedirectUri();
    const url = `${AUTHORIZE_URL}?client_id=${encodeURIComponent(WIX_CLIENT_ID)}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scopes)}&response_type=code`;

    return {
      url,
      state,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    };
  }

  async handleOAuthCallback(params: WixOAuthCallbackParams): Promise<void> {
    if (params.error) {
      throw new EcommerceIntegrationError(`Wix OAuth error: ${params.error_description ?? params.error}`, {
        provider: PROVIDER,
        code: 'OAUTH_ERROR',
        statusCode: 400,
        severity: 'medium'
      });
    }

    const { code, state } = params;
    if (!code || !state) {
      throw new EcommerceIntegrationError('Missing OAuth callback parameters', {
        provider: PROVIDER,
        code: 'INVALID_CALLBACK',
        statusCode: 400,
        severity: 'medium'
      });
    }

    this.ensureConfig();

    const statePayload = await ecommerceOAuthService.validateStateToken(PROVIDER, state);
    const tokenResponse = await this.exchangeAuthorizationCode(code);

    const metadata = {
      instanceId: tokenResponse.instanceId,
      scope: tokenResponse.scope,
      connectedAt: tokenResponse.connectedAt.toISOString(),
      returnUrl: statePayload.metadata?.returnUrl
    };

    await integrationDataService.upsertIntegrationCredentials(statePayload.businessId, PROVIDER, {
      domain: tokenResponse.instanceId,
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      metadata
    });
  }

  async refreshAccessToken(businessId: string): Promise<string> {
    this.ensureConfig();

    const record = await integrationDataService.getIntegrationRecord(businessId, PROVIDER, {
      includeSecrets: true
    });

    const refreshToken = (record.metadata?.secrets && typeof record.metadata.secrets === 'object' && 'refreshToken' in record.metadata.secrets) 
      ? record.metadata.secrets.refreshToken as string 
      : undefined;
    if (!refreshToken) {
      throw new EcommerceIntegrationError('Refresh token is not available for Wix integration', {
        provider: PROVIDER,
        businessId,
        code: 'REFRESH_TOKEN_MISSING',
        statusCode: 404,
        severity: 'medium'
      });
    }

    const response = await axios.post(TOKEN_URL, {
      grant_type: 'refresh_token',
      client_id: WIX_CLIENT_ID,
      client_secret: WIX_CLIENT_SECRET,
      refresh_token: refreshToken
    });

    const accessToken: string | undefined = response.data?.access_token;
    const newRefreshToken: string | undefined = response.data?.refresh_token ?? refreshToken;

    if (!accessToken) {
      throw new EcommerceIntegrationError('Wix token refresh response missing access token', {
        provider: PROVIDER,
        businessId,
        code: 'REFRESH_FAILED',
        severity: 'high'
      });
    }

    const metadata = { ...(record.metadata ?? {}) };
    delete metadata?.secrets;
    metadata.lastRefreshedAt = new Date().toISOString();

    await integrationDataService.upsertIntegrationCredentials(businessId, PROVIDER, {
      domain: record.domain,
      accessToken,
      refreshToken: newRefreshToken,
      metadata
    });

    return accessToken;
  }

  verifyWebhookSignature(payload: string | Buffer, signature?: string, secret?: string): boolean {
    if (!signature || !secret) {
      return false;
    }

    const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
    const digest = crypto.createHmac('sha256', secret).update(buffer).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(digest, 'utf8'));
  }

  private async exchangeAuthorizationCode(code: string): Promise<{
    instanceId: string;
    accessToken: string;
    refreshToken?: string;
    scope?: string;
    connectedAt: Date;
  }> {
    try {
      const redirectUri = this.buildRedirectUri();
      const response = await axios.post(TOKEN_URL, {
        grant_type: 'authorization_code',
        client_id: WIX_CLIENT_ID,
        client_secret: WIX_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri
      });

      const accessToken: string | undefined = response.data?.access_token;
      const instanceId: string | undefined = response.data?.instance_id;

      if (!accessToken || !instanceId) {
        throw new EcommerceIntegrationError('Wix OAuth response missing required fields', {
          provider: PROVIDER,
          code: 'INVALID_OAUTH_RESPONSE',
          severity: 'high'
        });
      }

      return {
        instanceId,
        accessToken,
        refreshToken: response.data?.refresh_token,
        scope: response.data?.scope,
        connectedAt: new Date()
      };
    } catch (error) {
      throw new EcommerceIntegrationError('Failed to exchange Wix authorization code', {
        provider: PROVIDER,
        code: 'OAUTH_EXCHANGE_FAILED',
        severity: 'high',
        cause: error as Error
      });
    }
  }

  private buildRedirectUri(): string {
    if (!APP_URL) {
      throw new EcommerceIntegrationError('APP_URL is not configured for Wix integration', {
        provider: PROVIDER,
        code: 'MISSING_APP_URL',
        severity: 'critical'
      });
    }

    const base = APP_URL.endsWith('/') ? APP_URL.slice(0, -1) : APP_URL;
    return `${base}${REDIRECT_PATH.startsWith('/') ? '' : '/'}${REDIRECT_PATH}`;
  }

  private ensureConfig(): void {
    if (!WIX_CLIENT_ID || !WIX_CLIENT_SECRET) {
      throw new EcommerceIntegrationError('Wix OAuth credentials missing from environment', {
        provider: PROVIDER,
        code: 'MISSING_OAUTH_CONFIG',
        severity: 'critical'
      });
    }
  }
}

export const wixAuthService = new WixAuthService();
