// src/controllers/features/brands/brandIntegrations.controller.ts
// Brand integrations controller using modular brand services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { getBrandsServices } from '../../../services/container.service';

/**
 * Brand integrations request interfaces
 */
interface TestShopifyConnectionRequest extends BaseRequest {
  validatedBody: {
    shopDomain: string;
    accessToken: string;
  };
}

interface ConfigureShopifyIntegrationRequest extends BaseRequest {
  validatedBody: {
    shopDomain: string;
    accessToken: string;
    webhookSecret?: string;
  };
}

interface ConfigureWooCommerceIntegrationRequest extends BaseRequest {
  validatedBody: {
    wooDomain: string;
    wooConsumerKey: string;
    wooConsumerSecret: string;
  };
}

interface ConfigureWixIntegrationRequest extends BaseRequest {
  validatedBody: {
    wixDomain: string;
    wixApiKey: string;
    wixRefreshToken?: string;
  };
}

interface UpdateIntegrationRequest extends BaseRequest {
  validatedParams: {
    type: string;
  };
  validatedBody: {
    credentials: Record<string, any>;
  };
}

interface RemoveIntegrationRequest extends BaseRequest {
  validatedParams: {
    type: string;
  };
}

interface CheckIntegrationPermissionsRequest extends BaseRequest {
  validatedQuery: {
    integrationType: string;
  };
}

/**
 * Brand integrations controller
 */
export class BrandIntegrationsController extends BaseController {
  private brandServices = getBrandsServices();

  /**
   * Get integration status for all configured integrations
   */
  async getIntegrationStatus(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_INTEGRATION_STATUS');

        const status = await this.brandServices.integrations.getIntegrationStatus(req.businessId!);
        
        this.logAction(req, 'GET_INTEGRATION_STATUS_SUCCESS', {
          businessId: req.businessId,
          integrationCount: Object.keys(status).length
        });

        return { status };
      });
    }, res, 'Integration status retrieved', this.getRequestMeta(req));
  }

  /**
   * Test Shopify connection
   */
  async testShopifyConnection(req: TestShopifyConnectionRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'TEST_SHOPIFY_CONNECTION');

        const data = {
          shopifyDomain: req.validatedBody.shopDomain,
          shopifyAccessToken: req.validatedBody.accessToken
        };

        const result = await this.brandServices.integrations.testShopifyConnection(data);
        
        this.logAction(req, 'TEST_SHOPIFY_CONNECTION_SUCCESS', {
          businessId: req.businessId,
          shopDomain: data.shopifyDomain,
          success: result.success
        });

        return { result };
      });
    }, res, 'Shopify connection tested', this.getRequestMeta(req));
  }

  /**
   * Configure Shopify integration
   */
  async configureShopifyIntegration(req: ConfigureShopifyIntegrationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CONFIGURE_SHOPIFY_INTEGRATION');

        const data = {
          shopifyDomain: req.validatedBody.shopDomain,
          shopifyAccessToken: req.validatedBody.accessToken,
          shopifyWebhookSecret: req.validatedBody.webhookSecret
        };

        const result = await this.brandServices.integrations.configureShopifyIntegration(req.businessId!, data);
        
        this.logAction(req, 'CONFIGURE_SHOPIFY_INTEGRATION_SUCCESS', {
          businessId: req.businessId,
          shopDomain: data.shopifyDomain,
          configured: result.configured
        });

        return { result };
      });
    }, res, 'Shopify integration configured', this.getRequestMeta(req));
  }

  /**
   * Configure WooCommerce integration
   */
  async configureWooCommerceIntegration(req: ConfigureWooCommerceIntegrationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CONFIGURE_WOOCOMMERCE_INTEGRATION');

        const credentials = {
          wooDomain: req.validatedBody.wooDomain,
          wooConsumerKey: req.validatedBody.wooConsumerKey,
          wooConsumerSecret: req.validatedBody.wooConsumerSecret
        };

        await this.brandServices.integrations.updateIntegration(
          req.businessId!,
          'woocommerce',
          credentials
        );
        
        this.logAction(req, 'CONFIGURE_WOOCOMMERCE_INTEGRATION_SUCCESS', {
          businessId: req.businessId,
          wooDomain: credentials.wooDomain
        });

        return { 
          message: 'WooCommerce integration configured successfully',
          domain: credentials.wooDomain
        };
      });
    }, res, 'WooCommerce integration configured', this.getRequestMeta(req));
  }

  /**
   * Configure Wix integration
   */
  async configureWixIntegration(req: ConfigureWixIntegrationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CONFIGURE_WIX_INTEGRATION');

        const credentials = {
          wixDomain: req.validatedBody.wixDomain,
          wixApiKey: req.validatedBody.wixApiKey,
          wixRefreshToken: req.validatedBody.wixRefreshToken
        };

        await this.brandServices.integrations.updateIntegration(
          req.businessId!,
          'wix',
          credentials
        );
        
        this.logAction(req, 'CONFIGURE_WIX_INTEGRATION_SUCCESS', {
          businessId: req.businessId,
          wixDomain: credentials.wixDomain
        });

        return { 
          message: 'Wix integration configured successfully',
          domain: credentials.wixDomain
        };
      });
    }, res, 'Wix integration configured', this.getRequestMeta(req));
  }

  /**
   * Update integration configuration
   */
  async updateIntegration(req: UpdateIntegrationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'UPDATE_INTEGRATION');

        await this.brandServices.integrations.updateIntegration(
          req.businessId!,
          req.validatedParams.type,
          req.validatedBody.credentials
        );
        
        this.logAction(req, 'UPDATE_INTEGRATION_SUCCESS', {
          businessId: req.businessId,
          integrationType: req.validatedParams.type,
          updatedFields: Object.keys(req.validatedBody.credentials)
        });

        return { message: 'Integration updated successfully' };
      });
    }, res, 'Integration updated successfully', this.getRequestMeta(req));
  }

  /**
   * Remove integration
   */
  async removeIntegration(req: RemoveIntegrationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'REMOVE_INTEGRATION');

        const result = await this.brandServices.integrations.removeIntegration(
          req.businessId!,
          req.validatedParams.type
        );
        
        this.logAction(req, 'REMOVE_INTEGRATION_SUCCESS', {
          businessId: req.businessId,
          integrationType: req.validatedParams.type,
          dataRemoved: result.dataRemoved
        });

        return { result };
      });
    }, res, 'Integration removed successfully', this.getRequestMeta(req));
  }

  /**
   * Get configured integrations
   */
  async getConfiguredIntegrations(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_CONFIGURED_INTEGRATIONS');

        const brandSettings = await this.brandServices.settings.getSettings(req.businessId!);
        const configured = this.brandServices.integrations.getConfiguredIntegrations(brandSettings);
        
        this.logAction(req, 'GET_CONFIGURED_INTEGRATIONS_SUCCESS', {
          businessId: req.businessId,
          configuredCount: configured.length
        });

        return { configured };
      });
    }, res, 'Configured integrations retrieved', this.getRequestMeta(req));
  }

  /**
   * Get available integrations for plan
   */
  async getAvailableIntegrations(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_AVAILABLE_INTEGRATIONS');

        const plan = req.query.plan as string || 'foundation';
        const available = this.brandServices.integrations.getAvailableIntegrations(plan);
        
        this.logAction(req, 'GET_AVAILABLE_INTEGRATIONS_SUCCESS', {
          businessId: req.businessId,
          plan,
          availableCount: available.length
        });

        return { available };
      });
    }, res, 'Available integrations retrieved', this.getRequestMeta(req));
  }

  /**
   * Check integration permissions
   */
  async checkIntegrationPermissions(req: CheckIntegrationPermissionsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CHECK_INTEGRATION_PERMISSIONS');

        const userPlan = req.query.userPlan as string || 'foundation';
        const hasPermission = this.brandServices.integrations.checkIntegrationPermissions(
          userPlan,
          req.validatedQuery.integrationType
        );
        
        this.logAction(req, 'CHECK_INTEGRATION_PERMISSIONS_SUCCESS', {
          businessId: req.businessId,
          userPlan,
          integrationType: req.validatedQuery.integrationType,
          hasPermission
        });

        return { hasPermission };
      });
    }, res, 'Integration permissions checked', this.getRequestMeta(req));
  }

  /**
   * Get integration statistics
   */
  async getIntegrationStatistics(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_INTEGRATION_STATISTICS');

        const stats = await this.brandServices.integrations.getIntegrationStatistics();
        
        this.logAction(req, 'GET_INTEGRATION_STATISTICS_SUCCESS', {
          businessId: req.businessId,
          totalIntegrations: stats.totalIntegrations,
          shopifyIntegrations: stats.shopifyIntegrations
        });

        return { stats };
      });
    }, res, 'Integration statistics retrieved', this.getRequestMeta(req));
  }
}

// Export controller instance
export const brandIntegrationsController = new BrandIntegrationsController();