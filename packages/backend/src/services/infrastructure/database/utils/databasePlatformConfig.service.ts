import type { ConnectOptions } from 'mongoose';
import { configService } from '../../../utils/config.service';

export interface DatabasePlatformConfig {
  uri: string;
  options: ConnectOptions;
  serverApi?: {
    version: '1';
    strict: true;
    deprecationErrors: boolean;
  };
  appName: string;
  workloadIdentity?: string;
  analyticsUris: string[];
  backupsEnabled: boolean;
  // MongoDB Atlas best practices
  multiRegionConfig?: {
    enabled: boolean;
    regions: string[];
    tenantIsolation: boolean;
  };
  queryableEncryption?: {
    enabled: boolean;
    keyVaultUri: string;
    encryptedFields: string[];
  };
  continuousBackups?: {
    enabled: boolean;
    retentionDays: number;
    pointInTimeRecovery: boolean;
  };
  workloadIsolation?: {
    enabled: boolean;
    analyticsClusterUri?: string;
    readOnlyClusterUri?: string;
  };
}

/**
 * Encapsulates MongoDB platform configuration, normalising connection options
 * according to current production guidance (Stable API v1, retryable writes,
 * majority write concern, workload identity metadata, etc).
 */
export class DatabasePlatformConfigService {
  build(): DatabasePlatformConfig {
    const databaseConfig = configService.getDatabase();
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';

    const uri: string = databaseConfig?.mongodb?.uri ?? process.env.MONGODB_URI ?? '';
    if (!uri) {
      throw new Error('MongoDB URI is not configured');
    }

    const tlsOptions = this.buildTlsOptions(databaseConfig?.mongodb?.tls);
    
    // Detect if connection string uses mongodb+srv:// (which handles TLS automatically)
    const usesSrvProtocol = uri.startsWith('mongodb+srv://');
    
    // Enhanced Atlas best practices configuration
    const baseOptions: ConnectOptions = {
      maxPoolSize: isProduction ? 50 : 20,
      minPoolSize: isProduction ? 5 : 1,
      maxIdleTimeMS: 30_000,
      heartbeatFrequencyMS: 10_000,
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 45_000,
      retryReads: true,
      retryWrites: true,
      writeConcern: {
        w: 'majority',
        wtimeout: 5_000,
        journal: true
      },
      readPreference: isProduction ? 'secondaryPreferred' : 'primary',
      readConcern: {
        level: isProduction ? 'majority' : 'local'
      },
      compressors: isProduction ? ['zstd', 'snappy'] : undefined,
      appName: this.resolveAppName(),
      authSource: process.env.MONGODB_AUTH_SOURCE,
      // TLS configuration - only force if not using mongodb+srv:// (which handles TLS automatically)
      // If using mongodb://, force TLS for security. If using mongodb+srv://, let the protocol handle it.
      ...(usesSrvProtocol ? {} : {
        ssl: true, // Force SSL/TLS for non-SRV connections
        tls: true, // Force TLS for non-SRV connections
        tlsInsecure: false,
        tlsAllowInvalidCertificates: false,
        tlsAllowInvalidHostnames: false
      }),
      // TLS certificate options (only if explicitly provided)
      ...(tlsOptions?.caFile ? { tlsCAFile: tlsOptions.caFile } : {}),
      ...(tlsOptions?.keyFile ? { tlsCertificateKeyFile: tlsOptions.keyFile } : {}),
      ...(tlsOptions?.certFile ? { tlsCertificateFile: tlsOptions.certFile } : {}),
      // Connection pooling optimizations for Atlas
      maxConnecting: isProduction ? 10 : 5,
      // Atlas-specific optimizations
      directConnection: false, // Use Atlas connection string routing
      loadBalanced: isProduction, // Enable load balancing for Atlas clusters
    };

    const workloadIdentity = this.resolveWorkloadIdentity();

    return {
      uri,
      options: baseOptions,
      // Stable API - only enable if explicitly requested (some MongoDB instances don't support it)
      serverApi: process.env.MONGODB_ENABLE_STABLE_API === 'true' ? {
        version: '1',
        strict: true,
        deprecationErrors: true
      } : undefined,
      appName: baseOptions.appName ?? 'OrdiraPlatform',
      workloadIdentity,
      analyticsUris: databaseConfig?.mongodb?.analyticsUris ?? [],
      backupsEnabled: databaseConfig?.mongodb?.backupsEnabled ?? false,
      // MongoDB Atlas best practices
      multiRegionConfig: this.buildMultiRegionConfig(),
      queryableEncryption: this.buildQueryableEncryptionConfig(),
      continuousBackups: this.buildContinuousBackupsConfig(),
      workloadIsolation: this.buildWorkloadIsolationConfig()
    };
  }

  private resolveAppName(): string {
    if (process.env.MONGODB_APP_NAME) {
      return process.env.MONGODB_APP_NAME;
    }

    const nodeEnv = process.env.NODE_ENV || 'development';
    return nodeEnv === 'production' ? 'OrdiraPlatform' : `OrdiraPlatform-${nodeEnv}`;
  }

  private resolveWorkloadIdentity(): string | undefined {
    if (process.env.MONGODB_WORKLOAD_NAME) {
      return process.env.MONGODB_WORKLOAD_NAME;
    }

    if (configService.isRender()) {
      return 'render-worker';
    }

    return undefined;
  }

  private buildTlsOptions(
    tlsConfig: { caFile?: string; certFile?: string; keyFile?: string } | null | undefined
  ) {
    if (!tlsConfig?.caFile) {
      return null;
    }

    return {
      caFile: tlsConfig.caFile,
      certFile: tlsConfig.certFile,
      keyFile: tlsConfig.keyFile
    };
  }

  /**
   * Build multi-region configuration for tenant isolation
   */
  private buildMultiRegionConfig() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';

    if (!isProduction) {
      return undefined;
    }

    const regions = process.env.MONGODB_REGIONS?.split(',') || ['us-east-1', 'us-west-2', 'eu-west-1'];
    const tenantIsolation = process.env.MONGODB_TENANT_ISOLATION === 'true';

    return {
      enabled: true,
      regions,
      tenantIsolation
    };
  }

  /**
   * Build queryable encryption configuration for sensitive fields
   */
  private buildQueryableEncryptionConfig() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';

    if (!isProduction) {
      return undefined;
    }

    const keyVaultUri = process.env.MONGODB_KEY_VAULT_URI;
    if (!keyVaultUri) {
      return undefined;
    }

    const encryptedFields = process.env.MONGODB_ENCRYPTED_FIELDS?.split(',') || [
      'email',
      'phone',
      'ssn',
      'creditCard',
      'bankAccount',
      'personalData',
      'address',
      'dob',
      'identityNumber'
    ];

    return {
      enabled: true,
      keyVaultUri,
      encryptedFields
    };
  }

  /**
   * Build continuous backups configuration
   */
  private buildContinuousBackupsConfig() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';

    if (!isProduction) {
      return undefined;
    }

    const retentionDays = parseInt(process.env.MONGODB_BACKUP_RETENTION_DAYS || '30');
    const pointInTimeRecovery = process.env.MONGODB_PITR_ENABLED === 'true';

    return {
      enabled: true,
      retentionDays,
      pointInTimeRecovery
    };
  }

  /**
   * Build workload isolation configuration for analytics clusters
   */
  private buildWorkloadIsolationConfig() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';

    if (!isProduction) {
      return undefined;
    }

    const analyticsClusterUri = process.env.MONGODB_ANALYTICS_CLUSTER_URI;
    const readOnlyClusterUri = process.env.MONGODB_READONLY_CLUSTER_URI;

    if (!analyticsClusterUri && !readOnlyClusterUri) {
      return undefined;
    }

    return {
      enabled: true,
      analyticsClusterUri,
      readOnlyClusterUri
    };
  }

}

export const databasePlatformConfigService = new DatabasePlatformConfigService();
