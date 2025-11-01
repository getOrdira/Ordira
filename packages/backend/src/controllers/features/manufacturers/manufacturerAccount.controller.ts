// src/controllers/features/manufacturers/manufacturerAccount.controller.ts
// Manufacturer account controller using modular manufacturer services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { manufacturerAccountCoreService } from '../../../services/manufacturers/core/manufacturerAccount.service';

/**
 * Manufacturer account request interfaces
 */
interface GetManufacturerAccountRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface UpdateManufacturerAccountRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedBody: {
    name?: string;
    profilePictureUrl?: string;
    description?: string;
    servicesOffered?: string[];
    moq?: number;
    industry?: string;
    contactEmail?: string;
    socialUrls?: string[];
    businessLicense?: string;
    certifications?: Array<{
      name: string;
      issuer: string;
      issueDate: Date;
      expiryDate?: Date;
    }>;
    establishedYear?: number;
    employeeCount?: number;
    headquarters?: {
      country?: string;
      city?: string;
      address?: string;
    };
    preferredContactMethod?: 'email' | 'phone' | 'message';
    timezone?: string;
  };
}

interface SoftDeleteAccountRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface GetAccountActivityRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedQuery?: {
    page?: number;
    limit?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
    severity?: 'low' | 'medium' | 'high';
  };
}

interface UpdateNotificationPreferencesRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedBody: {
    emailNotifications?: {
      invitations?: boolean;
      orderUpdates?: boolean;
      systemUpdates?: boolean;
      marketing?: boolean;
    };
    pushNotifications?: {
      invitations?: boolean;
      orderUpdates?: boolean;
      systemUpdates?: boolean;
    };
    smsNotifications?: {
      criticalUpdates?: boolean;
      orderAlerts?: boolean;
    };
    frequency?: 'immediate' | 'daily' | 'weekly';
    timezone?: string;
  };
}

interface GetManufacturerStatsRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface ValidateOwnershipRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface DeactivateAccountRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface ReactivateAccountRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

/**
 * Manufacturer account controller
 */
export class ManufacturerAccountController extends BaseController {
  private manufacturerAccountService = manufacturerAccountCoreService;

  /**
   * GET /api/manufacturers/:manufacturerId/account
   * Get manufacturer account details
   */
  async getManufacturerAccount(req: GetManufacturerAccountRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_MANUFACTURER_ACCOUNT');

        const account = await this.manufacturerAccountService.getManufacturerAccount(req.validatedParams.manufacturerId);

        this.logAction(req, 'GET_MANUFACTURER_ACCOUNT_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId
        });

        return { account };
      });
    }, res, 'Manufacturer account retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * PUT /api/manufacturers/:manufacturerId/account
   * Update manufacturer account
   */
  async updateManufacturerAccount(req: UpdateManufacturerAccountRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'UPDATE_MANUFACTURER_ACCOUNT');

        const sanitizedData = this.sanitizeInput(req.validatedBody);
        
        const updatedAccount = await this.manufacturerAccountService.updateManufacturerAccount(
          req.validatedParams.manufacturerId,
          sanitizedData
        );

        this.logAction(req, 'UPDATE_MANUFACTURER_ACCOUNT_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          updatedFields: Object.keys(sanitizedData)
        });

        return { account: updatedAccount };
      });
    }, res, 'Manufacturer account updated successfully', this.getRequestMeta(req));
  }

  /**
   * DELETE /api/manufacturers/:manufacturerId/account
   * Soft delete manufacturer account
   */
  async softDeleteAccount(req: SoftDeleteAccountRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'SOFT_DELETE_ACCOUNT');

        const deleteResult = await this.manufacturerAccountService.softDeleteAccount(req.validatedParams.manufacturerId);

        this.logAction(req, 'SOFT_DELETE_ACCOUNT_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          deletedAt: deleteResult.deletedAt
        });

        return { deleteResult };
      });
    }, res, 'Account soft deleted successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/account/activity
   * Get account activity log
   */
  async getAccountActivity(req: GetAccountActivityRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_ACCOUNT_ACTIVITY');

        const filters = {
          page: req.validatedQuery?.page || 1,
          limit: req.validatedQuery?.limit || 20,
          type: req.validatedQuery?.type,
          startDate: req.validatedQuery?.startDate ? new Date(req.validatedQuery.startDate) : undefined,
          endDate: req.validatedQuery?.endDate ? new Date(req.validatedQuery.endDate) : undefined,
          severity: req.validatedQuery?.severity
        };

        const activity = await this.manufacturerAccountService.getAccountActivity(
          req.validatedParams.manufacturerId,
          filters
        );

        this.logAction(req, 'GET_ACCOUNT_ACTIVITY_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          totalActivities: activity.total
        });

        return activity;
      });
    }, res, 'Account activity retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * PUT /api/manufacturers/:manufacturerId/account/notifications
   * Update notification preferences
   */
  async updateNotificationPreferences(req: UpdateNotificationPreferencesRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'UPDATE_NOTIFICATION_PREFERENCES');

        const sanitizedPreferences = this.sanitizeInput(req.validatedBody);
        
        const preferences = await this.manufacturerAccountService.updateNotificationPreferences(
          req.validatedParams.manufacturerId,
          sanitizedPreferences
        );

        this.logAction(req, 'UPDATE_NOTIFICATION_PREFERENCES_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId
        });

        return { preferences };
      });
    }, res, 'Notification preferences updated successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/account/stats
   * Get manufacturer statistics
   */
  async getManufacturerStats(req: GetManufacturerStatsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_MANUFACTURER_STATS');

        const stats = await this.manufacturerAccountService.getManufacturerStats(req.validatedParams.manufacturerId);

        this.logAction(req, 'GET_MANUFACTURER_STATS_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          profileCompleteness: stats.profileCompleteness
        });

        return { stats };
      });
    }, res, 'Manufacturer statistics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/account/validate-ownership
   * Validate manufacturer ownership
   */
  async validateManufacturerOwnership(req: ValidateOwnershipRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'VALIDATE_MANUFACTURER_OWNERSHIP');

        const isValid = await this.manufacturerAccountService.validateManufacturerOwnership(
          req.validatedParams.manufacturerId,
          req.userId!
        );

        this.logAction(req, 'VALIDATE_MANUFACTURER_OWNERSHIP_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          userId: req.userId,
          isValid
        });

        return { isValid };
      });
    }, res, 'Manufacturer ownership validated successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/:manufacturerId/account/deactivate
   * Deactivate account
   */
  async deactivateAccount(req: DeactivateAccountRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'DEACTIVATE_ACCOUNT');

        await this.manufacturerAccountService.deactivateAccount(req.validatedParams.manufacturerId);

        this.logAction(req, 'DEACTIVATE_ACCOUNT_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId
        });

        return { message: 'Account deactivated successfully' };
      });
    }, res, 'Account deactivated successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/:manufacturerId/account/reactivate
   * Reactivate account
   */
  async reactivateAccount(req: ReactivateAccountRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'REACTIVATE_ACCOUNT');

        await this.manufacturerAccountService.reactivateAccount(req.validatedParams.manufacturerId);

        this.logAction(req, 'REACTIVATE_ACCOUNT_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId
        });

        return { message: 'Account reactivated successfully' };
      });
    }, res, 'Account reactivated successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/account/basic-info
   * Get basic manufacturer info (legacy support)
   */
  async getManufacturerBasicInfo(req: GetManufacturerAccountRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_MANUFACTURER_BASIC_INFO');

        const basicInfo = await this.manufacturerAccountService.getManufacturerBasicInfo(req.validatedParams.manufacturerId);

        this.logAction(req, 'GET_MANUFACTURER_BASIC_INFO_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId
        });

        return { basicInfo };
      });
    }, res, 'Manufacturer basic info retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * PUT /api/manufacturers/:manufacturerId/account/contact-info
   * Update contact info (legacy support)
   */
  async updateContactInfo(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const manufacturerId = req.params.manufacturerId;
        const contactEmail = req.body.contactEmail;

        this.recordPerformance(req, 'UPDATE_CONTACT_INFO');

        const updatedAccount = await this.manufacturerAccountService.updateContactInfo(manufacturerId, contactEmail);

        this.logAction(req, 'UPDATE_CONTACT_INFO_SUCCESS', {
          businessId: req.businessId,
          manufacturerId,
          contactEmail
        });

        return { account: updatedAccount };
      });
    }, res, 'Contact info updated successfully', this.getRequestMeta(req));
  }

  /**
   * PUT /api/manufacturers/:manufacturerId/account/services
   * Update services offered (legacy support)
   */
  async updateServicesOffered(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const manufacturerId = req.params.manufacturerId;
        const servicesOffered = req.body.servicesOffered;

        this.recordPerformance(req, 'UPDATE_SERVICES_OFFERED');

        const updatedAccount = await this.manufacturerAccountService.updateServicesOffered(manufacturerId, servicesOffered);

        this.logAction(req, 'UPDATE_SERVICES_OFFERED_SUCCESS', {
          businessId: req.businessId,
          manufacturerId,
          servicesCount: servicesOffered?.length || 0
        });

        return { account: updatedAccount };
      });
    }, res, 'Services offered updated successfully', this.getRequestMeta(req));
  }

  /**
   * PUT /api/manufacturers/:manufacturerId/account/moq
   * Update minimum order quantity (legacy support)
   */
  async updateMinimumOrderQuantity(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const manufacturerId = req.params.manufacturerId;
        const moq = req.body.moq;

        this.recordPerformance(req, 'UPDATE_MINIMUM_ORDER_QUANTITY');

        const updatedAccount = await this.manufacturerAccountService.updateMinimumOrderQuantity(manufacturerId, moq);

        this.logAction(req, 'UPDATE_MINIMUM_ORDER_QUANTITY_SUCCESS', {
          businessId: req.businessId,
          manufacturerId,
          moq
        });

        return { account: updatedAccount };
      });
    }, res, 'Minimum order quantity updated successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const manufacturerAccountController = new ManufacturerAccountController();
