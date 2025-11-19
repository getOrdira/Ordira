/**
 * Service Registration Service
 * 
 * Registers all services in the DI container before modules are initialized.
 * This bridges the gap between the old ServiceContainer and the new DI container.
 */

import { container, SERVICE_TOKENS } from './diContainer.service';
import { logger } from '../../../../utils/logger';

// Import services
import { enhancedCacheService } from '../../cache/features/enhancedCache.service';
import { userAuthService } from '../../../auth/user/userAuth.service';
import { tenantDataService } from '../../../tenants/core/tenantData.service';
import { storageProviderService } from '../../../media/core/storageProvider.service';
import { securityScanningService } from '../../security';

// Import models (these should already be registered, but we'll ensure they are)
import { User } from '../../../../models/core/user.model';
import { Manufacturer } from '../../../../models/manufacturer/manufacturer.model';
import { Product } from '../../../../models/products/product.model';
import { BrandSettings } from '../../../../models/brands/brandSettings.model';
import { VotingRecord } from '../../../../models/voting/votingRecord.model';
import { Certificate } from '../../../../models/certificates/certificate.model';
import { Media } from '../../../../models/media/media.model';

// Import supply chain services
import { 
  SupplyChainServicesRegistry,
  DeploymentService,
  AssociationService,
  ContractReadService,
  ContractWriteService,
  SupplyChainQrCodeService,
  SupplyChainDashboardService,
  SupplyChainAnalyticsService,
  ProductLifecycleService
} from '../../../supplyChain';

/**
 * Register all services in the DI container
 * This must be called before modules are initialized
 */
export function registerAllDIContainerServices(): void {
  logger.info('📦 Registering services in DI container...');

  try {
    // Register infrastructure services
    if (!container.has(SERVICE_TOKENS.CACHE_SERVICE)) {
      container.registerInstance(SERVICE_TOKENS.CACHE_SERVICE, enhancedCacheService);
      logger.debug('Registered CacheService');
    }

    if (!container.has(SERVICE_TOKENS.S3_SERVICE)) {
      // Use storageProviderService which wraps S3Service
      container.registerInstance(SERVICE_TOKENS.S3_SERVICE, storageProviderService);
      logger.debug('Registered S3Service');
    }

    // Register business services
    if (!container.has(SERVICE_TOKENS.AUTH_SERVICE)) {
      container.registerInstance(SERVICE_TOKENS.AUTH_SERVICE, userAuthService);
      logger.debug('Registered AuthService');
    }

    if (!container.has(SERVICE_TOKENS.TENANT_SERVICE)) {
      container.registerInstance(SERVICE_TOKENS.TENANT_SERVICE, tenantDataService);
      logger.debug('Registered TenantService');
    }

    if (!container.has(SERVICE_TOKENS.SECURITY_SERVICE)) {
      // Use securityScanningService as the main security service
      container.registerInstance(SERVICE_TOKENS.SECURITY_SERVICE, securityScanningService);
      logger.debug('Registered SecurityService');
    }

    // Register models (check if already registered to avoid overwrite errors)
    if (!container.has(SERVICE_TOKENS.USER_MODEL)) {
      try {
        container.registerInstance(SERVICE_TOKENS.USER_MODEL, User);
        logger.debug('Registered UserModel');
      } catch (error) {
        if (error instanceof Error && error.message.includes('Cannot overwrite')) {
          logger.debug('UserModel already compiled, skipping registration');
        } else {
          throw error;
        }
      }
    }

    if (!container.has(SERVICE_TOKENS.MANUFACTURER_MODEL)) {
      container.registerInstance(SERVICE_TOKENS.MANUFACTURER_MODEL, Manufacturer);
      logger.debug('Registered ManufacturerModel');
    }

    if (!container.has(SERVICE_TOKENS.PRODUCT_MODEL)) {
      container.registerInstance(SERVICE_TOKENS.PRODUCT_MODEL, Product);
      logger.debug('Registered ProductModel');
    }

    if (!container.has(SERVICE_TOKENS.BRAND_SETTINGS_MODEL)) {
      container.registerInstance(SERVICE_TOKENS.BRAND_SETTINGS_MODEL, BrandSettings);
      logger.debug('Registered BrandSettingsModel');
    }

    if (!container.has(SERVICE_TOKENS.VOTING_RECORD_MODEL)) {
      container.registerInstance(SERVICE_TOKENS.VOTING_RECORD_MODEL, VotingRecord);
      logger.debug('Registered VotingRecordModel');
    }

    if (!container.has(SERVICE_TOKENS.CERTIFICATE_MODEL)) {
      container.registerInstance(SERVICE_TOKENS.CERTIFICATE_MODEL, Certificate);
      logger.debug('Registered CertificateModel');
    }

    if (!container.has(SERVICE_TOKENS.MEDIA_MODEL)) {
      container.registerInstance(SERVICE_TOKENS.MEDIA_MODEL, Media);
      logger.debug('Registered MediaModel');
    }

    // Register Supply Chain services
    if (!container.has(SERVICE_TOKENS.SUPPLY_CHAIN_REGISTRY)) {
      container.registerInstance(SERVICE_TOKENS.SUPPLY_CHAIN_REGISTRY, SupplyChainServicesRegistry.getInstance());
      logger.debug('Registered SupplyChainServicesRegistry');
    }

    if (!container.has(SERVICE_TOKENS.SUPPLY_CHAIN_DEPLOYMENT_SERVICE)) {
      container.registerInstance(SERVICE_TOKENS.SUPPLY_CHAIN_DEPLOYMENT_SERVICE, DeploymentService.getInstance());
      logger.debug('Registered SupplyChainDeploymentService');
    }

    if (!container.has(SERVICE_TOKENS.SUPPLY_CHAIN_ASSOCIATION_SERVICE)) {
      container.registerInstance(SERVICE_TOKENS.SUPPLY_CHAIN_ASSOCIATION_SERVICE, AssociationService.getInstance());
      logger.debug('Registered SupplyChainAssociationService');
    }

    if (!container.has(SERVICE_TOKENS.SUPPLY_CHAIN_CONTRACT_READ_SERVICE)) {
      container.registerInstance(SERVICE_TOKENS.SUPPLY_CHAIN_CONTRACT_READ_SERVICE, ContractReadService.getInstance());
      logger.debug('Registered SupplyChainContractReadService');
    }

    if (!container.has(SERVICE_TOKENS.SUPPLY_CHAIN_CONTRACT_WRITE_SERVICE)) {
      container.registerInstance(SERVICE_TOKENS.SUPPLY_CHAIN_CONTRACT_WRITE_SERVICE, ContractWriteService.getInstance());
      logger.debug('Registered SupplyChainContractWriteService');
    }

    if (!container.has(SERVICE_TOKENS.SUPPLY_CHAIN_QR_CODE_SERVICE)) {
      container.registerInstance(SERVICE_TOKENS.SUPPLY_CHAIN_QR_CODE_SERVICE, SupplyChainQrCodeService.getInstance());
      logger.debug('Registered SupplyChainQrCodeService');
    }

    if (!container.has(SERVICE_TOKENS.SUPPLY_CHAIN_DASHBOARD_SERVICE)) {
      container.registerInstance(SERVICE_TOKENS.SUPPLY_CHAIN_DASHBOARD_SERVICE, SupplyChainDashboardService.getInstance());
      logger.debug('Registered SupplyChainDashboardService');
    }

    if (!container.has(SERVICE_TOKENS.SUPPLY_CHAIN_ANALYTICS_SERVICE)) {
      container.registerInstance(SERVICE_TOKENS.SUPPLY_CHAIN_ANALYTICS_SERVICE, SupplyChainAnalyticsService.getInstance());
      logger.debug('Registered SupplyChainAnalyticsService');
    }

    if (!container.has(SERVICE_TOKENS.SUPPLY_CHAIN_PRODUCT_LIFECYCLE_SERVICE)) {
      container.registerInstance(SERVICE_TOKENS.SUPPLY_CHAIN_PRODUCT_LIFECYCLE_SERVICE, ProductLifecycleService.getInstance());
      logger.debug('Registered SupplyChainProductLifecycleService');
    }

    logger.info('✅ All services registered in DI container');
  } catch (error) {
    logger.error('❌ Failed to register services in DI container:', error);
    throw error;
  }
}

