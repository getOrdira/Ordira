import axios from 'axios';
import crypto from 'crypto';
import https from 'https';
import { integrationDataService } from '../../core/integrationData.service';
import { EcommerceIntegrationError } from '../../core/errors';
import type { EcommerceProvider } from '../../core/types';

const PROVIDER: EcommerceProvider = 'woocommerce';
const APP_URL = process.env.APP_URL ?? '';

export interface WooCommerceConnectInput {
  domain: string;
  consumerKey: string;
  consumerSecret: string;
  verifySsl?: boolean;
  description?: string;
}

export interface WooCommerceConnectResult {
  domain: string;
  verified: boolean;
  storeName?: string;
  version?: string;
  currency?: string;
  verifySsl: boolean;
}

export class WooCommerceAuthService {
  async connect(businessId: string, input: WooCommerceConnectInput): Promise<WooCommerceConnectResult> {
    if (!businessId?.trim()) {
      throw new EcommerceIntegrationError('Business identifier is required', {
        provider: PROVIDER,
        code: 'INVALID_BUSINESS_ID',
        statusCode: 400,
        severity: 'medium'
      });
    }

    this.ensureCredentials(input);

    const domain = this.normaliseDomain(input.domain);
    const baseUrl = this.buildRestBaseUrl(domain);
    const authHeader = this.buildBasicAuthHeader(input.consumerKey, input.consumerSecret);

    const systemStatus = await this.fetchSystemStatus(baseUrl, authHeader, input.verifySsl ?? true);

    await integrationDataService.upsertIntegrationCredentials(businessId, PROVIDER, {
      domain,
      accessToken: input.consumerKey,
      secret: input.consumerSecret,
      metadata: {
        verifySsl: input.verifySsl ?? true,
        description: input.description,
        storeName: systemStatus?.store?.name,
        currency: systemStatus?.settings?.currency,
        version: systemStatus?.environment?.version,
        connectedAt: new Date().toISOString()
      }
    });

    return {
      domain,
      verified: true,
      storeName: systemStatus?.store?.name,
      version: systemStatus?.environment?.version,
      currency: systemStatus?.settings?.currency,
      verifySsl: input.verifySsl ?? true
    };
  }

  async disconnect(businessId: string): Promise<void> {
    await integrationDataService.clearIntegration(businessId, PROVIDER);
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string | undefined, consumerSecret: string | undefined): boolean {
    if (!signature || !consumerSecret) {
      return false;
    }

    const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
    const digest = crypto.createHmac('sha256', consumerSecret).update(buffer).digest('base64');
    return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(digest, 'utf8'));
  }

  private ensureCredentials(input: WooCommerceConnectInput): void {
    if (!input.consumerKey?.trim() || !input.consumerSecret?.trim()) {
      throw new EcommerceIntegrationError('WooCommerce consumer key and secret are required', {
        provider: PROVIDER,
        code: 'MISSING_CREDENTIALS',
        statusCode: 400,
        severity: 'medium'
      });
    }
  }

  private normaliseDomain(domain: string): string {
    const trimmed = domain.trim();
    if (!trimmed) {
      throw new EcommerceIntegrationError('WooCommerce store domain is required', {
        provider: PROVIDER,
        code: 'INVALID_DOMAIN',
        statusCode: 400,
        severity: 'medium'
      });
    }

    const hasProtocol = /^https?:\/\//i.test(trimmed);
    const withProtocol = hasProtocol ? trimmed : `https://${trimmed}`;
    return withProtocol.replace(/\/+$/, '');
  }

  private buildRestBaseUrl(domain: string): string {
    return `${domain}/wp-json/wc/v3`;
  }

  private buildBasicAuthHeader(consumerKey: string, consumerSecret: string): string {
    const token = Buffer.from(`${consumerKey}:${consumerSecret}`, 'utf8').toString('base64');
    return `Basic ${token}`;
  }

  private async fetchSystemStatus(baseUrl: string, authHeader: string, verifySsl: boolean): Promise<any> {
    try {
      const response = await axios.get(`${baseUrl}/system_status`, {
        headers: {
          Authorization: authHeader,
          'User-Agent': 'Ordira WooCommerce Integration/2025'
        },
        timeout: 10_000,
        httpsAgent: verifySsl ? undefined : new https.Agent({ rejectUnauthorized: false })
      });
      return response.data;
    } catch (error) {
      throw new EcommerceIntegrationError('Failed to verify WooCommerce credentials', {
        provider: PROVIDER,
        code: 'CREDENTIAL_VERIFICATION_FAILED',
        severity: 'high',
        cause: error as Error
      });
    }
  }
}

export const wooAuthService = new WooCommerceAuthService();
