// src/controllers/features/brands/brandCustomerAccess.controller.ts
// Brand customer access controller using modular brand services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { getBrandsServices } from '../../../services/container/container.getters';

/**
 * Brand customer access request interfaces
 */
interface CheckEmailAccessRequest extends BaseRequest {
  validatedParams: {
    email: string;
  };
}

interface GrantVotingAccessRequest extends BaseRequest {
  validatedBody: {
    email: string;
  };
}

interface AddCustomersRequest extends BaseRequest {
  validatedBody: {
    customers: Array<{
      email: string;
      name?: string;
      metadata?: Record<string, any>;
    }>;
  };
}

interface ImportFromCSVRequest extends BaseRequest {
  file?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
}

interface GetCustomersRequest extends BaseRequest {
  validatedQuery?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

interface UpdateEmailGatingRequest extends BaseRequest {
  validatedBody: {
    enabled: boolean;
    allowedDomains?: string[];
    blockedDomains?: string[];
    customMessage?: string;
  };
}

interface RevokeAccessRequest extends BaseRequest {
  validatedParams: {
    customerId: string;
  };
}

interface BulkUpdateRequest extends BaseRequest {
  validatedBody: {
    customerIds: string[];
    updates: {
      status?: string;
      metadata?: Record<string, any>;
    };
  };
}

/**
 * Brand customer access controller
 */
export class BrandCustomerAccessController extends BaseController {
  private brandServices = getBrandsServices();

  /**
   * Check if an email is allowed to access the voting platform
   */
  async checkEmailAccess(req: CheckEmailAccessRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CHECK_EMAIL_ACCESS');

        const result = await this.brandServices.customerAccess.isEmailAllowed(
          req.validatedParams.email, 
          req.businessId!
        );
        
        this.logAction(req, 'CHECK_EMAIL_ACCESS_SUCCESS', {
          businessId: req.businessId,
          email: req.validatedParams.email,
          allowed: result.allowed
        });

        return { result };
      });
    }, res, 'Email access check completed', this.getRequestMeta(req));
  }

  /**
   * Grant voting access to a user after email verification
   */
  async grantVotingAccess(req: GrantVotingAccessRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GRANT_VOTING_ACCESS');

        const result = await this.brandServices.customerAccess.grantVotingAccess(
          req.validatedBody.email,
          req.businessId!,
          req.userId!
        );
        
        this.logAction(req, 'GRANT_VOTING_ACCESS_SUCCESS', {
          businessId: req.businessId,
          email: req.validatedBody.email,
          userId: req.userId
        });

        return { result };
      });
    }, res, 'Voting access granted', this.getRequestMeta(req));
  }

  /**
   * Add customers to the brand's customer list
   */
  async addCustomers(req: AddCustomersRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'ADD_CUSTOMERS');

        const result = await this.brandServices.customerAccess.addCustomers(
          req.businessId!,
          req.validatedBody.customers
        );
        
        this.logAction(req, 'ADD_CUSTOMERS_SUCCESS', {
          businessId: req.businessId,
          customerCount: req.validatedBody.customers.length,
          addedCount: result.imported
        });

        return { result };
      });
    }, res, 'Customers added successfully', this.getRequestMeta(req));
  }

  /**
   * Import customers from CSV file
   */
  async importFromCSV(req: ImportFromCSVRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'IMPORT_CUSTOMERS_CSV');

        if (!req.file) {
          throw new Error('CSV file is required');
        }

        const result = await this.brandServices.customerAccess.importFromCSV(
          req.businessId!,
          req.file.buffer.toString()
        );
        
        this.logAction(req, 'IMPORT_CUSTOMERS_CSV_SUCCESS', {
          businessId: req.businessId,
          filename: req.file.originalname,
          processedCount: result.imported,
          successCount: result.imported,
          errorCount: result.errors.length
        });

        return { result };
      });
    }, res, 'Customers imported successfully', this.getRequestMeta(req));
  }

  /**
   * Sync customers from Shopify integration
   */
  async syncFromShopify(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'SYNC_CUSTOMERS_SHOPIFY');

        const result = await this.brandServices.customerAccess.syncFromShopify(req.businessId!);
        
        this.logAction(req, 'SYNC_CUSTOMERS_SHOPIFY_SUCCESS', {
          businessId: req.businessId,
          syncedCount: result.synced,
          updatedCount: result.synced
        });

        return { result };
      });
    }, res, 'Customers synced from Shopify', this.getRequestMeta(req));
  }

  /**
   * Get customers with filtering and pagination
   */
  async getCustomers(req: GetCustomersRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_CUSTOMERS');

        const page = req.validatedQuery?.page || 1;
        const limit = req.validatedQuery?.limit || 20;
        const offset = (page - 1) * limit;

        const filters = {
          offset,
          limit,
          search: req.validatedQuery?.search,
          status: req.validatedQuery?.status as 'pending' | 'active' | 'revoked' | 'deleted' | undefined,
          sortBy: (req.validatedQuery?.sortBy as 'createdAt' | 'lastVotingAccess' | 'totalVotes' | 'email') || 'createdAt',
          sortOrder: req.validatedQuery?.sortOrder || 'desc'
        };

        const result = await this.brandServices.customerAccess.getCustomers(req.businessId!, filters);
        
        this.logAction(req, 'GET_CUSTOMERS_SUCCESS', {
          businessId: req.businessId,
          total: result.total,
          page: result.page,
          limit: filters.limit
        });

        return result;
      });
    }, res, 'Customers retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get email gating settings
   */
  async getEmailGatingSettings(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_EMAIL_GATING_SETTINGS');

        const settings = await this.brandServices.customerAccess.getEmailGatingSettings(req.businessId!);
        
        this.logAction(req, 'GET_EMAIL_GATING_SETTINGS_SUCCESS', {
          businessId: req.businessId,
          enabled: settings.enabled
        });

        return { settings };
      });
    }, res, 'Email gating settings retrieved', this.getRequestMeta(req));
  }

  /**
   * Update email gating settings
   */
  async updateEmailGatingSettings(req: UpdateEmailGatingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'UPDATE_EMAIL_GATING_SETTINGS');

        const updatedSettings = await this.brandServices.customerAccess.updateEmailGatingSettings(
          req.businessId!,
          req.validatedBody
        );
        
        this.logAction(req, 'UPDATE_EMAIL_GATING_SETTINGS_SUCCESS', {
          businessId: req.businessId,
          enabled: updatedSettings.enabled,
          allowedDomainsCount: 0, // Property doesn't exist in EmailGatingSettings
          blockedDomainsCount: 0  // Property doesn't exist in EmailGatingSettings
        });

        return { settings: updatedSettings };
      });
    }, res, 'Email gating settings updated', this.getRequestMeta(req));
  }

  /**
   * Revoke customer access
   */
  async revokeCustomerAccess(req: RevokeAccessRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'REVOKE_CUSTOMER_ACCESS');

        const customer = await this.brandServices.customerAccess.revokeCustomerAccess(
          req.businessId!,
          req.validatedParams.customerId
        );
        
        this.logAction(req, 'REVOKE_CUSTOMER_ACCESS_SUCCESS', {
          businessId: req.businessId,
          customerId: req.validatedParams.customerId,
          customerEmail: customer.email
        });

        return { customer };
      });
    }, res, 'Customer access revoked', this.getRequestMeta(req));
  }

  /**
   * Restore customer access
   */
  async restoreCustomerAccess(req: RevokeAccessRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'RESTORE_CUSTOMER_ACCESS');

        const customer = await this.brandServices.customerAccess.restoreCustomerAccess(
          req.businessId!,
          req.validatedParams.customerId
        );
        
        this.logAction(req, 'RESTORE_CUSTOMER_ACCESS_SUCCESS', {
          businessId: req.businessId,
          customerId: req.validatedParams.customerId,
          customerEmail: customer.email
        });

        return { customer };
      });
    }, res, 'Customer access restored', this.getRequestMeta(req));
  }

  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_CUSTOMER_ANALYTICS');

        const analytics = await this.brandServices.customerAccess.getCustomerAnalytics(req.businessId!);
        
        this.logAction(req, 'GET_CUSTOMER_ANALYTICS_SUCCESS', {
          businessId: req.businessId,
          totalCustomers: analytics.overview?.totalCustomers || 0,
          activeCustomers: analytics.overview?.activeCustomers || 0
        });

        return { analytics };
      });
    }, res, 'Customer analytics retrieved', this.getRequestMeta(req));
  }

  /**
   * Delete customer
   */
  async deleteCustomer(req: RevokeAccessRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'DELETE_CUSTOMER');

        const result = await this.brandServices.customerAccess.deleteCustomer(
          req.businessId!,
          req.validatedParams.customerId
        );
        
        this.logAction(req, 'DELETE_CUSTOMER_SUCCESS', {
          businessId: req.businessId,
          customerId: req.validatedParams.customerId
        });

        return { result };
      });
    }, res, 'Customer deleted successfully', this.getRequestMeta(req));
  }

  /**
   * Bulk update customer access
   */
  async bulkUpdateAccess(req: BulkUpdateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'BULK_UPDATE_CUSTOMER_ACCESS');

        const result = await this.brandServices.customerAccess.bulkUpdateAccess(
          req.businessId!,
          req.validatedBody.customerIds,
          req.validatedBody.updates.status === 'active'
        );
        
        this.logAction(req, 'BULK_UPDATE_CUSTOMER_ACCESS_SUCCESS', {
          businessId: req.businessId,
          customerIds: req.validatedBody.customerIds,
          updatedCount: result.updated
        });

        return { result };
      });
    }, res, 'Customer access updated successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const brandCustomerAccessController = new BrandCustomerAccessController();