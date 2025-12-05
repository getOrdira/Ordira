import { Types } from 'mongoose';
import { BrandSettings } from '../../../../models/brands/brandSettings.model';
import { logger } from '../../../../utils/logger';
import { EcommerceIntegrationError } from './errors';
import type {
  EcommerceProvider,
  IntegrationRecord,
  IntegrationCredentialsInput,
  SyncRecord
} from './types';

type ProviderFieldKey =
  | 'shopifyDomain'
  | 'shopifyAccessToken'
  | 'shopifyWebhookSecret'
  | 'shopifyConnectedAt'
  | 'shopifyLastSync'
  | 'wixDomain'
  | 'wixApiKey'
  | 'wixRefreshToken'
  | 'wixConnectedAt'
  | 'wixLastSync'
  | 'wooDomain'
  | 'wooConsumerKey'
  | 'wooConsumerSecret'
  | 'wooConnectedAt'
  | 'wooLastSync'
  | 'wooUpdatedAt';

interface ProviderFieldConfig {
  domainField: ProviderFieldKey;
  accessTokenField?: ProviderFieldKey;
  refreshTokenField?: ProviderFieldKey;
  secretField?: ProviderFieldKey;
  connectedAtField?: ProviderFieldKey;
  lastSyncField?: ProviderFieldKey;
  updatedAtField?: ProviderFieldKey;
  identifierField: ProviderFieldKey;
}

const PROVIDER_FIELD_MAP: Record<EcommerceProvider, ProviderFieldConfig> = {
  shopify: {
    domainField: 'shopifyDomain',
    accessTokenField: 'shopifyAccessToken',
    secretField: 'shopifyWebhookSecret',
    connectedAtField: 'shopifyConnectedAt',
    lastSyncField: 'shopifyLastSync',
    identifierField: 'shopifyDomain'
  },
  wix: {
    domainField: 'wixDomain',
    accessTokenField: 'wixApiKey',
    refreshTokenField: 'wixRefreshToken',
    connectedAtField: 'wixConnectedAt',
    lastSyncField: 'wixLastSync',
    identifierField: 'wixDomain'
  },
  woocommerce: {
    domainField: 'wooDomain',
    accessTokenField: 'wooConsumerKey',
    secretField: 'wooConsumerSecret',
    connectedAtField: 'wooConnectedAt',
    lastSyncField: 'wooLastSync',
    updatedAtField: 'wooUpdatedAt',
    identifierField: 'wooDomain'
  }
};

interface IntegrationRecordOptions {
  includeSecrets?: boolean;
}

/**
 * Handles persistence and retrieval of ecommerce integration metadata stored against BrandSettings.
 */
export class IntegrationDataService {
  /**
   * Retrieve a normalised integration record for a business/provider combination.
   */
  async getIntegrationRecord(
    businessId: string,
    provider: EcommerceProvider,
    options: IntegrationRecordOptions = {}
  ): Promise<IntegrationRecord> {
    const config = this.getFieldConfig(provider);
    const businessObjectId = this.toObjectId(businessId);

    // Select all fields including those with select: false (like shopifyAccessToken)
    // The + prefix in Mongoose explicitly includes fields that have select: false
    const settings = await BrandSettings.findOne({ business: businessObjectId })
      .select('+shopifyAccessToken +shopifyWebhookSecret +wooConsumerKey +wooConsumerSecret +wixApiKey +wixRefreshToken')
      .lean<{ [key: string]: unknown }>()
      .exec();

    if (!settings) {
      return {
        provider,
        businessId,
        connected: false,
        credentialsPresent: false
      };
    }

    const domain = this.getFieldValue<string>(settings, config.domainField);
    const accessToken = this.getFieldValue<string>(settings, config.accessTokenField);
    const refreshToken = this.getFieldValue<string>(settings, config.refreshTokenField);
    const secret = this.getFieldValue<string>(settings, config.secretField);
    const connectedAt = this.getFieldValue<Date>(settings, config.connectedAtField);
    const lastSync = this.getFieldValue<Date>(settings, config.lastSyncField);
    const lastUpdated = this.getFieldValue<Date>(settings, config.updatedAtField);

    const includeSecrets = options.includeSecrets ?? false;

    const metadata: Record<string, unknown> = {
      hasRefreshToken: Boolean(refreshToken)
    };

    if (includeSecrets) {
      metadata.secrets = {
        accessToken,
        refreshToken,
        secret
      };
    } else {
      metadata.secrets = {
        accessToken: this.maskSecret(accessToken),
        refreshToken: this.maskSecret(refreshToken),
        secret: this.maskSecret(secret)
      };
    }

    const record: IntegrationRecord = {
      provider,
      businessId,
      domain: domain ?? undefined,
      connected: Boolean(accessToken ?? secret ?? refreshToken),
      connectedAt: connectedAt ?? null,
      lastSyncAt: lastSync ?? null,
      lastUpdatedAt: lastUpdated ?? (settings.updatedAt instanceof Date ? settings.updatedAt : null),
      credentialsPresent: Boolean(accessToken ?? secret ?? refreshToken ?? domain),
      metadata
    };

    return record;
  }

  /**
   * Upsert the integration credentials for the supplied provider.
   */
  async upsertIntegrationCredentials(
    businessId: string,
    provider: EcommerceProvider,
    credentials: IntegrationCredentialsInput
  ): Promise<IntegrationRecord> {
    const config = this.getFieldConfig(provider);
    const businessObjectId = this.toObjectId(businessId);

    const $set: Record<string, unknown> = {
      business: businessObjectId,
      updatedAt: new Date()
    };

    if (credentials.domain !== undefined) {
      $set[config.domainField] = credentials.domain?.trim() || null;
    }

    if (credentials.accessToken !== undefined && config.accessTokenField) {
      $set[config.accessTokenField] = credentials.accessToken;
    }

    if (credentials.refreshToken !== undefined && config.refreshTokenField) {
      $set[config.refreshTokenField] = credentials.refreshToken;
    }

    if (credentials.secret !== undefined && config.secretField) {
      $set[config.secretField] = credentials.secret;
    }

    if (config.connectedAtField) {
      let connectedAtValue = credentials.connectedAt;
      if (!connectedAtValue) {
        connectedAtValue = (await this.getExistingDate(businessObjectId, config.connectedAtField)) ?? new Date();
      }
      $set[config.connectedAtField] = connectedAtValue;
    }

    if (credentials.lastSyncAt && config.lastSyncField) {
      $set[config.lastSyncField] = credentials.lastSyncAt;
    }

    if (config.updatedAtField) {
      $set[config.updatedAtField] = new Date();
    }

    const result = await BrandSettings.findOneAndUpdate(
      { business: businessObjectId },
      { $set },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .lean<{ [key: string]: unknown }>()
      .exec();

    logger.info('Updated ecommerce integration credentials', {
      provider,
      businessId,
      hasDomain: Boolean(credentials.domain),
      hasAccessToken: Boolean(credentials.accessToken),
      hasSecret: Boolean(credentials.secret),
      hasRefreshToken: Boolean(credentials.refreshToken)
    });

    if (!result) {
      throw new EcommerceIntegrationError('Failed to persist integration credentials', {
        provider,
        businessId,
        severity: 'high'
      });
    }

    return this.getIntegrationRecord(businessId, provider);
  }

  /**
   * Remove stored credentials for the provider on the supplied business.
   */
  async clearIntegration(businessId: string, provider: EcommerceProvider): Promise<void> {
    const config = this.getFieldConfig(provider);
    const businessObjectId = this.toObjectId(businessId);

    const $unset: Record<string, 1> = {};
    const markUnset = (field?: ProviderFieldKey) => {
      if (field) {
        $unset[field] = 1;
      }
    };

    markUnset(config.domainField);
    markUnset(config.accessTokenField);
    markUnset(config.refreshTokenField);
    markUnset(config.secretField);
    markUnset(config.connectedAtField);
    markUnset(config.lastSyncField);
    markUnset(config.updatedAtField);

    await BrandSettings.updateOne({ business: businessObjectId }, { $unset }).exec();

    logger.info('Cleared ecommerce integration credentials', { provider, businessId });
  }

  /**
   * Persist the date of the latest successful sync.
   */
  async recordSuccessfulSync(
    businessId: string,
    provider: EcommerceProvider,
    metadata?: Record<string, unknown>
  ): Promise<SyncRecord> {
    const config = this.getFieldConfig(provider);
    if (!config.lastSyncField) {
      throw new EcommerceIntegrationError('Provider does not support sync tracking', {
        provider,
        businessId,
        code: 'SYNC_NOT_SUPPORTED',
        severity: 'low'
      });
    }

    const businessObjectId = this.toObjectId(businessId);
    const lastSyncAt = new Date();

    const update: Record<string, unknown> = {
      [config.lastSyncField]: lastSyncAt,
      updatedAt: lastSyncAt
    };

    if (config.updatedAtField) {
      update[config.updatedAtField] = lastSyncAt;
    }

    await BrandSettings.updateOne({ business: businessObjectId }, { $set: update }).exec();

    logger.info('Recorded ecommerce integration sync', {
      provider,
      businessId,
      lastSyncAt: lastSyncAt.toISOString(),
      metadata
    });

    return {
      provider,
      businessId,
      lastSyncAt,
      metadata
    };
  }

  /**
   * Find a business identifier by provider specific domain/identifier.
   */
  async findBusinessByProviderIdentifier(
    provider: EcommerceProvider,
    identifier: string
  ): Promise<string | null> {
    const config = this.getFieldConfig(provider);
    const query = {
      [config.identifierField]: identifier
    } as Record<string, unknown>;

    const settings = await BrandSettings.findOne(query, { business: 1 }).lean().exec();

    return settings?.business ? settings.business.toString() : null;
  }

  /**
   * Retrieve a list of business IDs that currently have the provider connected.
   */
  async listConnectedBusinesses(provider: EcommerceProvider): Promise<string[]> {
    try {
      const config = this.getFieldConfig(provider);

      // Determine which field to check for connection status
      const connectionField = config.accessTokenField ?? config.secretField ?? config.refreshTokenField ?? config.domainField;
      
      if (!connectionField) {
        logger.warn('No connection field found for provider', { provider });
        return [];
      }

      // Use $and to avoid Mongoose casting issues with String fields
      // When a field is defined as String type, Mongoose tries to cast query operators to strings
      const query: Record<string, unknown> = {
        $and: [
          { [connectionField]: { $exists: true } },
          { [connectionField]: { $ne: null } },
          { [connectionField]: { $ne: '' } }
        ]
      };

      // Select fields with select: false to check for connections
      const results = await BrandSettings.find(query)
        .select('+shopifyAccessToken +shopifyWebhookSecret +wooConsumerKey +wooConsumerSecret +wixApiKey +wixRefreshToken business')
        .lean()
        .exec();

      return results
        .filter((doc) => doc.business)
        .map((doc) => doc.business.toString());
    } catch (error: any) {
      logger.error('Failed to list connected businesses', {
        provider,
        error: error.message,
        stack: error.stack
      });
      throw new EcommerceIntegrationError('Failed to list connected businesses', {
        provider,
        code: 'LIST_CONNECTED_ERROR',
        statusCode: 500,
        severity: 'medium'
      });
    }
  }

  private getFieldConfig(provider: EcommerceProvider): ProviderFieldConfig {
    return PROVIDER_FIELD_MAP[provider];
  }

  private toObjectId(businessId: string): Types.ObjectId {
    if (Types.ObjectId.isValid(businessId)) {
      return new Types.ObjectId(businessId);
    }

    throw new EcommerceIntegrationError('Invalid business identifier supplied', {
      businessId,
      code: 'INVALID_BUSINESS_ID',
      statusCode: 400,
      severity: 'low'
    });
  }

  private getFieldValue<T>(settings: Record<string, unknown>, field?: ProviderFieldKey): T | undefined {
    if (!field) {
      return undefined;
    }

    return settings[field] as T | undefined;
  }

  private maskSecret(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }
    return '***REDACTED***';
  }

  private async getExistingDate(businessId: Types.ObjectId, field: ProviderFieldKey): Promise<Date | undefined> {
    const existing = await BrandSettings.findOne({ business: businessId }, { [field]: 1 })
      .lean<{ [key: string]: unknown }>()
      .exec();

    return existing ? (existing[field] as Date | undefined) : undefined;
  }
}

export const integrationDataService = new IntegrationDataService();

