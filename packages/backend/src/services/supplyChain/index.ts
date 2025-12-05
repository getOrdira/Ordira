// src/services/supplyChain/index.ts

// ===== TYPE IMPORTS FOR REGISTRY =====
import { DeploymentService } from './core/deployment.service';
import { AssociationService } from './core/association.service';
import { ContractReadService } from './core/contractRead.service';
import { ContractWriteService } from './core/contractWrite.service';
import { SupplyChainQrCodeService } from './features/qrCode.service';
import { SupplyChainDashboardService } from './features/dashboard.service';
import { SupplyChainAnalyticsService } from './features/analytics.service';
import { ProductLifecycleService } from './features/productLifeCycle.service';
import { SupplyChainValidationService } from './validation/supplyChainValidation.service';
import { SupplyChainMappers } from './utils/mappers';
import { LogParsingService } from './utils/logs';

// ===== CORE SERVICES =====
export { DeploymentService } from './core/deployment.service';
export { AssociationService } from './core/association.service';
export { ContractReadService } from './core/contractRead.service';
export { ContractWriteService } from './core/contractWrite.service';

// ===== FEATURE SERVICES =====
export { SupplyChainQrCodeService } from './features/qrCode.service';
export { SupplyChainDashboardService } from './features/dashboard.service';
export { SupplyChainAnalyticsService } from './features/analytics.service';
export { ProductLifecycleService } from './features/productLifeCycle.service';

// ===== VALIDATION SERVICES =====
export { SupplyChainValidationService } from './validation/supplyChainValidation.service';

// ===== UTILITY SERVICES =====
export { SupplyChainMappers } from './utils/mappers';
export { LogParsingService } from './utils/logs';

// ===== TYPES AND INTERFACES =====
export * from './utils/types';

// ===== SERVICE REGISTRY =====

/**
 * Supply Chain Services Registry
 * Provides centralized access to all supply chain services
 */
export class SupplyChainServicesRegistry {
  private static instance: SupplyChainServicesRegistry;
  
  // Core services
  public readonly deploymentService: DeploymentService;
  public readonly associationService: AssociationService;
  public readonly contractReadService: ContractReadService;
  public readonly contractWriteService: ContractWriteService;
  
  // Feature services
  public readonly qrCodeService: SupplyChainQrCodeService;
  public readonly dashboardService: SupplyChainDashboardService;
  public readonly analyticsService: SupplyChainAnalyticsService;
  public readonly productLifecycleService: ProductLifecycleService;
  
  // Validation services
  public readonly validationService: SupplyChainValidationService;
  
  // Utility services
  public readonly mappers: SupplyChainMappers;
  public readonly logParsingService: LogParsingService;

  private constructor() {
    // Initialize core services
    this.deploymentService = DeploymentService.getInstance();
    this.associationService = AssociationService.getInstance();
    this.contractReadService = ContractReadService.getInstance();
    this.contractWriteService = ContractWriteService.getInstance();
    
    // Initialize feature services
    this.qrCodeService = SupplyChainQrCodeService.getInstance();
    this.dashboardService = SupplyChainDashboardService.getInstance();
    this.analyticsService = SupplyChainAnalyticsService.getInstance();
    this.productLifecycleService = ProductLifecycleService.getInstance();
    
    // Initialize validation services
    this.validationService = SupplyChainValidationService.getInstance();
    
    // Initialize utility services
    this.mappers = SupplyChainMappers.getInstance();
    this.logParsingService = LogParsingService.getInstance();

    // Validate all services are initialized
    if (!this.contractReadService) {
      throw new Error('ContractReadService failed to initialize');
    }
    if (!this.contractWriteService) {
      throw new Error('ContractWriteService failed to initialize');
    }
    if (!this.deploymentService) {
      throw new Error('DeploymentService failed to initialize');
    }
    if (!this.associationService) {
      throw new Error('AssociationService failed to initialize');
    }
  }

  public static getInstance(): SupplyChainServicesRegistry {
    if (!SupplyChainServicesRegistry.instance) {
      SupplyChainServicesRegistry.instance = new SupplyChainServicesRegistry();
    }
    return SupplyChainServicesRegistry.instance;
  }

  /**
   * Get all core services
   */
  getCoreServices() {
    return {
      deployment: this.deploymentService,
      association: this.associationService,
      contractRead: this.contractReadService,
      contractWrite: this.contractWriteService
    };
  }

  /**
   * Get all feature services
   */
  getFeatureServices() {
    return {
      qrCode: this.qrCodeService,
      dashboard: this.dashboardService,
      analytics: this.analyticsService,
      productLifecycle: this.productLifecycleService
    };
  }

  /**
   * Get all utility services
   */
  getUtilityServices() {
    return {
      validation: this.validationService,
      mappers: this.mappers,
      logParsing: this.logParsingService
    };
  }

  /**
   * Get all services
   */
  getAllServices() {
    return {
      ...this.getCoreServices(),
      ...this.getFeatureServices(),
      ...this.getUtilityServices()
    };
  }
}

// ===== CONVENIENCE EXPORTS =====

/**
 * Get the supply chain services registry instance
 */
export const getSupplyChainServices = () => SupplyChainServicesRegistry.getInstance();

/**
 * Get core supply chain services
 */
export const getSupplyChainCoreServices = () => getSupplyChainServices().getCoreServices();

/**
 * Get feature supply chain services
 */
export const getSupplyChainFeatureServices = () => getSupplyChainServices().getFeatureServices();

/**
 * Get utility supply chain services
 */
export const getSupplyChainUtilityServices = () => getSupplyChainServices().getUtilityServices();

// ===== LEGACY COMPATIBILITY =====

/**
 * Legacy SupplyChainService wrapper for backward compatibility
 * @deprecated Use individual services from SupplyChainServicesRegistry instead
 */
export class SupplyChainService {
  private static instance: SupplyChainService;
  private services: SupplyChainServicesRegistry;

  private constructor() {
    this.services = SupplyChainServicesRegistry.getInstance();
  }

  public static getInstance(): SupplyChainService {
    if (!SupplyChainService.instance) {
      SupplyChainService.instance = new SupplyChainService();
    }
    return SupplyChainService.instance;
  }

  // ===== DEPLOYMENT METHODS =====
  
  /**
   * Deploy a new SupplyChain contract for a business
   * @deprecated Use DeploymentService.deployContract instead
   */
  async deployContract(businessId: string, manufacturerName: string) {
    return this.services.deploymentService.deployContract(businessId, manufacturerName);
  }

  /**
   * Get deployment status for a business
   * @deprecated Use DeploymentService.getDeploymentStatus instead
   */
  async getDeploymentStatus(businessId: string) {
    return this.services.deploymentService.getDeploymentStatus(businessId);
  }

  // ===== CONTRACT WRITE METHODS =====

  /**
   * Create an endpoint in a SupplyChain contract
   * @deprecated Use ContractWriteService.createEndpoint instead
   */
  async createEndpoint(contractAddress: string, endpointData: any, businessId: string) {
    return this.services.contractWriteService.createEndpoint(contractAddress, endpointData, businessId);
  }

  /**
   * Register a product in a SupplyChain contract
   * @deprecated Use ContractWriteService.registerProduct instead
   */
  async registerProduct(contractAddress: string, productData: any, businessId: string) {
    return this.services.contractWriteService.registerProduct(contractAddress, productData, businessId);
  }

  /**
   * Log a supply chain event
   * @deprecated Use ContractWriteService.logEvent instead
   */
  async logEvent(contractAddress: string, eventData: any, businessId: string) {
    return this.services.contractWriteService.logEvent(contractAddress, eventData, businessId);
  }

  // ===== CONTRACT READ METHODS =====

  /**
   * Get contract statistics
   * @deprecated Use ContractReadService.getContractStats instead
   */
  async getContractStats(contractAddress: string, businessId: string) {
    return this.services.contractReadService.getContractStats(contractAddress, businessId);
  }

  /**
   * Get all endpoints for a contract
   * @deprecated Use ContractReadService.getEndpoints instead
   */
  async getEndpoints(contractAddress: string, businessId: string) {
    return this.services.contractReadService.getEndpoints(contractAddress, businessId);
  }

  /**
   * Get all products for a contract
   * @deprecated Use ContractReadService.getProducts instead
   */
  async getProducts(contractAddress: string, businessId: string) {
    return this.services.contractReadService.getProducts(contractAddress, businessId);
  }

  /**
   * Get events for a specific product
   * @deprecated Use ContractReadService.getProductEvents instead
   */
  async getProductEvents(contractAddress: string, productId: string, businessId: string) {
    return this.services.contractReadService.getProductEvents(contractAddress, productId, businessId);
  }

  // ===== FEATURE METHODS =====

  /**
   * Generate QR code for supply chain tracking
   * @deprecated Use SupplyChainQrCodeService.generateSupplyChainQrCode instead
   */
  async generateSupplyChainQrCode(
    productId: string,
    productName: string,
    manufacturerId: string,
    contractAddress: string,
    businessId: string,
    options?: any
  ) {
    if (!contractAddress?.trim() || !businessId?.trim()) {
      throw new Error('contractAddress and businessId are required when generating supply chain QR codes');
    }

    return this.services.qrCodeService.generateSupplyChainQrCode({
      productId,
      productName,
      manufacturerId,
      contractAddress,
      businessId,
      options
    });
  }

  /**
   * Get dashboard data
   * @deprecated Use SupplyChainDashboardService.getDashboardData instead
   */
  async getDashboardData(businessId: string, contractAddress: string) {
    return this.services.dashboardService.getDashboardData({
      businessId,
      contractAddress
    });
  }

  /**
   * Get analytics data
   * @deprecated Use SupplyChainAnalyticsService.getAnalytics instead
   */
  async getAnalytics(businessId: string, contractAddress: string, startDate?: Date, endDate?: Date) {
    return this.services.analyticsService.getAnalytics({
      businessId,
      contractAddress,
      startDate,
      endDate
    });
  }

  /**
   * Get product lifecycle
   * @deprecated Use ProductLifecycleService.getProductLifecycle instead
   */
  async getProductLifecycle(businessId: string, contractAddress: string, productId: string) {
    return this.services.productLifecycleService.getProductLifecycle({
      businessId,
      contractAddress,
      productId
    });
  }
}

// ===== DEFAULT EXPORT =====

/**
 * Default export for backward compatibility
 * @deprecated Use individual services or SupplyChainServicesRegistry instead
 */
export default SupplyChainService;
