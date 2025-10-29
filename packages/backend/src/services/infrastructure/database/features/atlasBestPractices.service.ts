/**
 * MongoDB Atlas Best Practices Service
 * 
 * Implements MongoDB Atlas operational best practices including:
 * - Multi-region cluster management for tenant isolation
 * - TLS Everywhere enforcement
 * - Continuous backups and point-in-time recovery
 * - Queryable encryption for sensitive fields
 * - Workload-isolated secondary clusters for analytics
 */

import { logger } from '../../../../utils/logger';
import { monitoringService } from '../../../external/monitoring.service';
import { databasePlatformConfigService, DatabasePlatformConfig } from '../utils/databasePlatformConfig.service';
import mongoose from 'mongoose';

export interface AtlasHealthStatus {
  multiRegionEnabled: boolean;
  tlsEnforced: boolean;
  backupsEnabled: boolean;
  queryableEncryptionEnabled: boolean;
  workloadIsolationEnabled: boolean;
  lastHealthCheck: Date;
  recommendations: string[];
}

export interface TenantIsolationConfig {
  tenantId: string;
  region: string;
  clusterUri: string;
  readPreference: 'primary' | 'secondary' | 'primaryPreferred' | 'secondaryPreferred' | 'nearest';
}

export interface BackupStatus {
  enabled: boolean;
  lastBackup: Date | null;
  retentionDays: number;
  pointInTimeRecovery: boolean;
  nextScheduledBackup: Date | null;
}

export interface EncryptionStatus {
  enabled: boolean;
  keyVaultUri: string | null;
  encryptedFields: string[];
  keyRotationEnabled: boolean;
  lastKeyRotation: Date | null;
}

export class AtlasBestPracticesService {
  private config: DatabasePlatformConfig;
  private healthStatus: AtlasHealthStatus | null = null;

  constructor() {
    this.config = databasePlatformConfigService.build();
  }

  /**
   * Initialize Atlas best practices monitoring
   */
  async initialize(): Promise<void> {
    try {
      await this.enforceTlsEverywhere();
      await this.validateMultiRegionConfig();
      await this.validateBackupConfiguration();
      await this.validateQueryableEncryption();
      await this.validateWorkloadIsolation();

      logger.info('MongoDB Atlas best practices initialized successfully');
      
      monitoringService.recordMetric({
        name: 'atlas_best_practices_initialized',
        value: 1,
        tags: { status: 'success' }
      });

    } catch (error) {
      logger.error('Failed to initialize Atlas best practices:', error);
      
      monitoringService.recordMetric({
        name: 'atlas_best_practices_initialized',
        value: 0,
        tags: { status: 'failed', error: error instanceof Error ? error.message : 'unknown' }
      });

      throw error;
    }
  }

  /**
   * Enforce TLS everywhere - Atlas security best practice
   */
  private async enforceTlsEverywhere(): Promise<void> {
    const connection = mongoose.connection;
    
    if (!this.config.options.tls) {
      throw new Error('TLS is not enabled - Atlas best practice violation');
    }

    if (this.config.options.tlsInsecure) {
      throw new Error('TLS insecure mode is enabled - Atlas security violation');
    }

    if (this.config.options.tlsAllowInvalidCertificates) {
      throw new Error('Invalid certificates are allowed - Atlas security violation');
    }

    logger.info('TLS Everywhere enforcement verified');
  }

  /**
   * Validate multi-region configuration for tenant isolation
   */
  private async validateMultiRegionConfig(): Promise<void> {
    if (!this.config.multiRegionConfig?.enabled) {
      logger.warn('Multi-region configuration not enabled - consider enabling for production');
      return;
    }

    const { regions, tenantIsolation } = this.config.multiRegionConfig;

    if (regions.length < 2) {
      throw new Error('Multi-region configuration requires at least 2 regions');
    }

    if (tenantIsolation && !this.validateTenantIsolationSetup()) {
      throw new Error('Tenant isolation is enabled but not properly configured');
    }

    logger.info('Multi-region configuration validated', { regions, tenantIsolation });
  }

  /**
   * Validate tenant isolation setup
   */
  private validateTenantIsolationSetup(): boolean {
    // Check if tenant-specific connection strings are configured
    const tenantRegions = process.env.MONGODB_TENANT_REGIONS;
    return !!tenantRegions;
  }

  /**
   * Validate backup configuration
   */
  private async validateBackupConfiguration(): Promise<void> {
    if (!this.config.continuousBackups?.enabled) {
      logger.warn('Continuous backups not enabled - consider enabling for production');
      return;
    }

    const { retentionDays, pointInTimeRecovery } = this.config.continuousBackups;

    if (retentionDays < 7) {
      logger.warn('Backup retention period is less than 7 days - consider increasing for production');
    }

    if (!pointInTimeRecovery) {
      logger.warn('Point-in-time recovery not enabled - consider enabling for production');
    }

    logger.info('Backup configuration validated', { retentionDays, pointInTimeRecovery });
  }

  /**
   * Validate queryable encryption configuration
   */
  private async validateQueryableEncryption(): Promise<void> {
    if (!this.config.queryableEncryption?.enabled) {
      logger.info('Queryable encryption not enabled - acceptable for non-sensitive data');
      return;
    }

    const { keyVaultUri, encryptedFields } = this.config.queryableEncryption;

    if (!keyVaultUri) {
      throw new Error('Queryable encryption enabled but key vault URI not configured');
    }

    if (encryptedFields.length === 0) {
      logger.warn('Queryable encryption enabled but no encrypted fields specified');
    }

    logger.info('Queryable encryption configuration validated', { 
      keyVaultUri: keyVaultUri.substring(0, 20) + '...', 
      encryptedFieldsCount: encryptedFields.length 
    });
  }

  /**
   * Validate workload isolation configuration
   */
  private async validateWorkloadIsolation(): Promise<void> {
    if (!this.config.workloadIsolation?.enabled) {
      logger.info('Workload isolation not enabled - acceptable for single workload');
      return;
    }

    const { analyticsClusterUri, readOnlyClusterUri } = this.config.workloadIsolation;

    if (!analyticsClusterUri && !readOnlyClusterUri) {
      throw new Error('Workload isolation enabled but no secondary cluster URIs configured');
    }

    logger.info('Workload isolation configuration validated', {
      hasAnalyticsCluster: !!analyticsClusterUri,
      hasReadOnlyCluster: !!readOnlyClusterUri
    });
  }

  /**
   * Get tenant isolation configuration for a specific tenant
   */
  async getTenantIsolationConfig(tenantId: string): Promise<TenantIsolationConfig | null> {
    if (!this.config.multiRegionConfig?.tenantIsolation) {
      return null;
    }

    const tenantRegions = process.env.MONGODB_TENANT_REGIONS;
    if (!tenantRegions) {
      return null;
    }

    try {
      const regionMap = JSON.parse(tenantRegions);
      const tenantConfig = regionMap[tenantId];

      if (!tenantConfig) {
        logger.warn(`No tenant isolation config found for tenant: ${tenantId}`);
        return null;
      }

      return {
        tenantId,
        region: tenantConfig.region,
        clusterUri: tenantConfig.clusterUri,
        readPreference: tenantConfig.readPreference || 'secondaryPreferred'
      };

    } catch (error) {
      logger.error('Failed to parse tenant regions configuration:', error);
      return null;
    }
  }

  /**
   * Get backup status and information
   */
  async getBackupStatus(): Promise<BackupStatus> {
    if (!this.config.continuousBackups?.enabled) {
      return {
        enabled: false,
        lastBackup: null,
        retentionDays: 0,
        pointInTimeRecovery: false,
        nextScheduledBackup: null
      };
    }

    // In a real implementation, you would query Atlas API for backup status
    // For now, return configuration-based status
    return {
      enabled: true,
      lastBackup: new Date(), // Would be fetched from Atlas API
      retentionDays: this.config.continuousBackups.retentionDays,
      pointInTimeRecovery: this.config.continuousBackups.pointInTimeRecovery,
      nextScheduledBackup: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next day
    };
  }

  /**
   * Get encryption status and information
   */
  async getEncryptionStatus(): Promise<EncryptionStatus> {
    if (!this.config.queryableEncryption?.enabled) {
      return {
        enabled: false,
        keyVaultUri: null,
        encryptedFields: [],
        keyRotationEnabled: false,
        lastKeyRotation: null
      };
    }

    return {
      enabled: true,
      keyVaultUri: this.config.queryableEncryption.keyVaultUri,
      encryptedFields: this.config.queryableEncryption.encryptedFields,
      keyRotationEnabled: process.env.MONGODB_KEY_ROTATION_ENABLED === 'true',
      lastKeyRotation: null // Would be fetched from key vault
    };
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<AtlasHealthStatus> {
    const recommendations: string[] = [];

    try {
      // Check TLS enforcement
      const tlsEnforced = this.config.options.tls && !this.config.options.tlsInsecure;

      // Check multi-region
      const multiRegionEnabled = this.config.multiRegionConfig?.enabled || false;

      // Check backups
      const backupsEnabled = this.config.continuousBackups?.enabled || false;

      // Check encryption
      const queryableEncryptionEnabled = this.config.queryableEncryption?.enabled || false;

      // Check workload isolation
      const workloadIsolationEnabled = this.config.workloadIsolation?.enabled || false;

      // Generate recommendations
      if (!tlsEnforced) {
        recommendations.push('Enable TLS everywhere for secure connections');
      }

      if (!multiRegionEnabled) {
        recommendations.push('Consider enabling multi-region clusters for high availability');
      }

      if (!backupsEnabled) {
        recommendations.push('Enable continuous backups for data protection');
      }

      if (!queryableEncryptionEnabled) {
        recommendations.push('Consider enabling queryable encryption for sensitive data');
      }

      if (!workloadIsolationEnabled) {
        recommendations.push('Consider enabling workload isolation for analytics workloads');
      }

      this.healthStatus = {
        multiRegionEnabled,
        tlsEnforced,
        backupsEnabled,
        queryableEncryptionEnabled,
        workloadIsolationEnabled,
        lastHealthCheck: new Date(),
        recommendations
      };

      // Record metrics
      monitoringService.recordMetric({
        name: 'atlas_health_check',
        value: recommendations.length === 0 ? 1 : 0,
        tags: {
          multiRegion: multiRegionEnabled.toString(),
          tls: tlsEnforced.toString(),
          backups: backupsEnabled.toString(),
          encryption: queryableEncryptionEnabled.toString(),
          isolation: workloadIsolationEnabled.toString()
        }
      });

      return this.healthStatus;

    } catch (error) {
      logger.error('Atlas health check failed:', error);
      
      monitoringService.recordMetric({
        name: 'atlas_health_check_error',
        value: 1,
        tags: { error: error instanceof Error ? error.message : 'unknown' }
      });

      throw error;
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus(): AtlasHealthStatus | null {
    return this.healthStatus;
  }

  /**
   * Generate Atlas configuration recommendations
   */
  generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (!this.config.multiRegionConfig?.enabled) {
      recommendations.push('Enable multi-region clusters for tenant isolation and high availability');
    }

    if (!this.config.continuousBackups?.enabled) {
      recommendations.push('Enable continuous backups with point-in-time recovery');
    }

    if (!this.config.queryableEncryption?.enabled) {
      recommendations.push('Enable queryable encryption for sensitive fields like PII');
    }

    if (!this.config.workloadIsolation?.enabled) {
      recommendations.push('Enable workload isolation with dedicated analytics clusters');
    }

    if (this.config.options.maxPoolSize < 50) {
      recommendations.push('Consider increasing connection pool size for production workloads');
    }

    return recommendations;
  }
}

export const atlasBestPracticesService = new AtlasBestPracticesService();
