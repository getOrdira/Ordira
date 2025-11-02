// src/services/manufacturers/core/manufacturerAccount.service.ts

import { Manufacturer, IManufacturer } from '../../../models/manufacturer/manufacturer.model';
import { logger } from '../../../utils/logger';
import { Media } from '../../../models/media/media.model';
import { Notification } from '../../../models/infrastructure/notification.model';

export interface AccountActivity {
  id: string;
  type: 'login' | 'profile_update' | 'verification_submitted' | 'document_uploaded' | 'password_changed' | 'notification_sent' | 'account_activated' | 'account_deactivated' | 'notification_preferences_updated' | 'profile_viewed' | 'profile_picture_updated';
  description: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high';
}

export interface NotificationPreferences {
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
}

export interface DataExportResult {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  estimatedCompletionTime: Date;
  expiresAt: Date;
  fileSize?: number;
  format: 'json' | 'csv' | 'pdf';
}

export interface ProfilePictureUploadResult {
  profilePictureUrl: string;
  uploadedAt: Date;
  filename: string;
  fileSize: number;
  s3Key?: string;
  s3Bucket?: string;
  s3Region?: string;
}

export interface SoftDeleteResult {
  success: boolean;
  deletedAt: Date;
  retentionPeriod: number; // days
  canRestore: boolean;
  dataRetentionNotice: string;
}

export interface ActivityFilters {
  page: number;
  limit: number;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  severity?: 'low' | 'medium' | 'high';
}

/**
 * Custom error class for manufacturer account operations
 */
class ManufacturerAccountError extends Error {
  statusCode: number;
  code?: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = 'ManufacturerAccountError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

/**
 * Core manufacturer account management service
 * Extracted core account functions from original manufacturerAccount.service.ts
 */
export class ManufacturerAccountService {

  /**
   * Get manufacturer account details
   */
  async getManufacturerAccount(mfgId: string): Promise<IManufacturer> {
    try {
      if (!mfgId?.trim()) {
        throw new ManufacturerAccountError('Manufacturer ID is required', 400, 'MISSING_MANUFACTURER_ID');
      }

      const manufacturer = await Manufacturer.findById(mfgId).select(
        'name email profilePictureUrl description servicesOffered moq industry contactEmail socialUrls ' +
        'isActive isVerified verifiedAt businessLicense certifications establishedYear employeeCount ' +
        'headquarters preferredContactMethod timezone lastLoginAt createdAt updatedAt'
      );

      if (!manufacturer) {
        throw new ManufacturerAccountError('Manufacturer not found', 404, 'MANUFACTURER_NOT_FOUND');
      }

      // Update last accessed timestamp
      await this.logActivity(mfgId, 'profile_viewed', 'Profile accessed', { source: 'account_service' });

      return manufacturer;
    } catch (error: any) {
      if (error instanceof ManufacturerAccountError) {
        throw error;
      }
      throw new ManufacturerAccountError(`Failed to get manufacturer account: ${error.message}`, 500, 'GET_ACCOUNT_ERROR');
    }
  }

  /**
   * Update manufacturer account
   */
  async updateManufacturerAccount(
    mfgId: string,
    data: Partial<IManufacturer>
  ): Promise<IManufacturer> {
    try {
      if (!mfgId?.trim()) {
        throw new ManufacturerAccountError('Manufacturer ID is required', 400, 'MISSING_MANUFACTURER_ID');
      }

      if (!data || Object.keys(data).length === 0) {
        throw new ManufacturerAccountError('Update data is required', 400, 'EMPTY_UPDATE_DATA');
      }

      // Validate specific fields
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        throw new ManufacturerAccountError('Invalid email format', 400, 'INVALID_EMAIL');
      }

      if (data.moq && (data.moq < 1 || !Number.isInteger(data.moq))) {
        throw new ManufacturerAccountError('MOQ must be a positive integer', 400, 'INVALID_MOQ');
      }

      // Prepare update data with allowed fields only
      const allowedFields = [
        'name', 'profilePictureUrl', 'description', 'servicesOffered', 'moq',
        'industry', 'contactEmail', 'socialUrls', 'businessLicense', 'certifications',
        'establishedYear', 'employeeCount', 'headquarters', 'preferredContactMethod', 'timezone'
      ];

      const updateData: Partial<IManufacturer> = {};
      allowedFields.forEach(field => {
        if (field in data && data[field as keyof IManufacturer] !== undefined) {
          (updateData as Record<string, any>)[field] = data[field as keyof IManufacturer];
        }
      });

      updateData.updatedAt = new Date();

      const updated = await Manufacturer.findByIdAndUpdate(
        mfgId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updated) {
        throw new ManufacturerAccountError('Manufacturer not found', 404, 'MANUFACTURER_NOT_FOUND');
      }

      // Log the update activity
      await this.logActivity(mfgId, 'profile_update', 'Profile updated successfully', {
        updatedFields: Object.keys(updateData),
        fieldsCount: Object.keys(updateData).length
      });

      return updated;
    } catch (error: any) {
      if (error instanceof ManufacturerAccountError) {
        throw error;
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        throw new ManufacturerAccountError(`Validation failed: ${validationErrors.join(', ')}`, 400, 'VALIDATION_ERROR');
      }

      throw new ManufacturerAccountError(`Failed to update manufacturer account: ${error.message}`, 500, 'UPDATE_ERROR');
    }
  }

  /**
   * Soft delete manufacturer account
   */
  async softDeleteAccount(mfgId: string): Promise<SoftDeleteResult> {
    try {
      if (!mfgId?.trim()) {
        throw new ManufacturerAccountError('Manufacturer ID is required', 400, 'MISSING_MANUFACTURER_ID');
      }

      const manufacturer = await Manufacturer.findById(mfgId);
      if (!manufacturer) {
        throw new ManufacturerAccountError('Manufacturer not found', 404, 'MANUFACTURER_NOT_FOUND');
      }

      const deletedAt = new Date();
      const retentionPeriod = 30; // days

      // Soft delete the account
      await Manufacturer.findByIdAndUpdate(mfgId, {
        isActive: false,
        deactivatedAt: deletedAt,
        $unset: { lastLoginAt: 1 }
      });

      // Log the deletion activity
      await this.logActivity(mfgId, 'account_deactivated', 'Account deactivated by user request', {
        deletedAt,
        retentionPeriod,
        source: 'user_request'
      });

      return {
        success: true,
        deletedAt,
        retentionPeriod,
        canRestore: true,
        dataRetentionNotice: `Account data will be permanently deleted after ${retentionPeriod} days unless restored.`
      };
    } catch (error: any) {
      if (error instanceof ManufacturerAccountError) {
        throw error;
      }
      throw new ManufacturerAccountError(`Failed to delete account: ${error.message}`, 500, 'DELETE_ERROR');
    }
  }

  /**
   * Get account activity log
   */
  async getAccountActivity(
    mfgId: string,
    filters: ActivityFilters
  ): Promise<{
    activities: AccountActivity[];
    total: number;
  }> {
    try {
      // For now, return mock data - implement with actual activity logging system
      const mockActivities: AccountActivity[] = [
        {
          id: '1',
          type: 'login',
          description: 'Successful login from Chrome browser',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          ipAddress: '192.168.1.1',
          userAgent: 'Chrome/91.0',
          severity: 'low'
        },
        {
          id: '2',
          type: 'profile_update',
          description: 'Updated company description',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          severity: 'medium'
        }
      ];

      // Apply filters
      let filteredActivities = mockActivities;

      if (filters.type) {
        filteredActivities = filteredActivities.filter(activity => activity.type === filters.type);
      }

      if (filters.startDate) {
        filteredActivities = filteredActivities.filter(activity => activity.timestamp >= filters.startDate!);
      }

      if (filters.endDate) {
        filteredActivities = filteredActivities.filter(activity => activity.timestamp <= filters.endDate!);
      }

      // Apply pagination
      const offset = (filters.page - 1) * filters.limit;
      const paginatedActivities = filteredActivities.slice(offset, offset + filters.limit);

      return {
        activities: paginatedActivities,
        total: filteredActivities.length
      };
    } catch (error: any) {
      throw new ManufacturerAccountError(`Failed to get account activity: ${error.message}`, 500, 'ACTIVITY_ERROR');
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    mfgId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      if (!mfgId?.trim()) {
        throw new ManufacturerAccountError('Manufacturer ID is required', 400, 'MISSING_MANUFACTURER_ID');
      }

      // Build default preferences
      const defaultPreferences: NotificationPreferences = {
        emailNotifications: {
          invitations: preferences.emailNotifications?.invitations ?? true,
          orderUpdates: preferences.emailNotifications?.orderUpdates ?? true,
          systemUpdates: preferences.emailNotifications?.systemUpdates ?? true,
          marketing: preferences.emailNotifications?.marketing ?? false
        },
        pushNotifications: {
          invitations: preferences.pushNotifications?.invitations ?? true,
          orderUpdates: preferences.pushNotifications?.orderUpdates ?? true,
          systemUpdates: preferences.pushNotifications?.systemUpdates ?? false
        },
        smsNotifications: {
          criticalUpdates: preferences.smsNotifications?.criticalUpdates ?? false,
          orderAlerts: preferences.smsNotifications?.orderAlerts ?? false
        },
        frequency: preferences.frequency ?? 'immediate',
        timezone: preferences.timezone ?? 'UTC'
      };

      // Update manufacturer document
      await Manufacturer.findByIdAndUpdate(mfgId, {
        notificationSettings: {
          email: {
            connectionRequests: defaultPreferences.emailNotifications?.invitations ?? true,
            projectUpdates: defaultPreferences.emailNotifications?.orderUpdates ?? true,
            marketing: defaultPreferences.emailNotifications?.marketing ?? false,
            systemAlerts: defaultPreferences.emailNotifications?.systemUpdates ?? true
          },
          sms: {
            urgentOnly: defaultPreferences.smsNotifications?.criticalUpdates ?? false,
            projectDeadlines: defaultPreferences.smsNotifications?.orderAlerts ?? false
          },
          inApp: {
            all: true,
            mentions: true,
            messages: true
          }
        },
        updatedAt: new Date()
      });

      // Log the update
      await this.logActivity(mfgId, 'notification_preferences_updated', 'Notification preferences updated', {
        preferences: defaultPreferences
      });

      return defaultPreferences;
    } catch (error: any) {
      if (error instanceof ManufacturerAccountError) {
        throw error;
      }
      throw new ManufacturerAccountError(`Failed to update notification preferences: ${error.message}`, 500, 'PREFERENCES_ERROR');
    }
  }

  /**
   * Get manufacturer statistics
   */
  async getManufacturerStats(mfgId: string): Promise<{
    profileCompleteness: number;
    accountAge: number;
    lastUpdated: Date;
  }> {
    try {
      const manufacturer = await this.getManufacturerAccount(mfgId);

      // Calculate profile completeness
      const fields = [
        'name', 'email', 'description', 'industry',
        'servicesOffered', 'moq', 'contactEmail'
      ];
      const completedFields = fields.filter(field => {
        const value = manufacturer[field as keyof IManufacturer];
        return value !== null && value !== undefined && value !== '';
      });

      const profileCompleteness = Math.round((completedFields.length / fields.length) * 100);

      // Calculate account age in days
      const accountAge = Math.floor(
        (Date.now() - manufacturer.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        profileCompleteness,
        accountAge,
        lastUpdated: manufacturer.updatedAt || manufacturer.createdAt
      };
    } catch (error: any) {
      throw new ManufacturerAccountError(`Failed to get manufacturer stats: ${error.message}`, 500, 'STATS_ERROR');
    }
  }

  /**
   * Validate manufacturer ownership
   */
  async validateManufacturerOwnership(mfgId: string, currentUserId: string): Promise<boolean> {
    return mfgId === currentUserId;
  }

  /**
   * Deactivate account
   */
  async deactivateAccount(mfgId: string): Promise<void> {
    try {
      await Manufacturer.findByIdAndUpdate(mfgId, {
        isActive: false,
        deactivatedAt: new Date()
      });

      await this.logActivity(mfgId, 'account_deactivated', 'Account deactivated', {
        source: 'manual_deactivation'
      });
    } catch (error: any) {
      throw new ManufacturerAccountError(`Failed to deactivate account: ${error.message}`, 500, 'DEACTIVATE_ERROR');
    }
  }

  /**
   * Reactivate account
   */
  async reactivateAccount(mfgId: string): Promise<void> {
    try {
      await Manufacturer.findByIdAndUpdate(mfgId, {
        isActive: true,
        $unset: { deactivatedAt: 1 }
      });

      await this.logActivity(mfgId, 'account_activated', 'Account reactivated', {
        source: 'manual_reactivation'
      });
    } catch (error: any) {
      throw new ManufacturerAccountError(`Failed to reactivate account: ${error.message}`, 500, 'REACTIVATE_ERROR');
    }
  }

  // ===== Legacy Support Methods =====

  /**
   * Get basic manufacturer info (legacy support)
   */
  async getManufacturerBasicInfo(mfgId: string): Promise<Pick<IManufacturer, 'name' | 'profilePictureUrl' | 'industry'>> {
    const manufacturer = await this.getManufacturerAccount(mfgId);
    return {
      name: manufacturer.name,
      profilePictureUrl: manufacturer.profilePictureUrl,
      industry: manufacturer.industry
    };
  }

  /**
   * Update contact info (legacy support)
   */
  async updateContactInfo(mfgId: string, contactEmail: string): Promise<IManufacturer> {
    return this.updateManufacturerAccount(mfgId, { contactEmail });
  }

  /**
   * Update services offered (legacy support)
   */
  async updateServicesOffered(mfgId: string, servicesOffered: string[]): Promise<IManufacturer> {
    return this.updateManufacturerAccount(mfgId, { servicesOffered });
  }

  /**
   * Update minimum order quantity (legacy support)
   */
  async updateMinimumOrderQuantity(mfgId: string, moq: number): Promise<IManufacturer> {
    return this.updateManufacturerAccount(mfgId, { moq });
  }

  /**
   * Private helper method to log activities
   */
  private async logActivity(
    mfgId: string,
    type: AccountActivity['type'],
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // In a real implementation, you would save to an ActivityLog collection
      // For now, we'll create a notification entry
      await Notification.create({
        manufacturer: mfgId,
        type: 'system',
        category: 'system',
        title: 'Account Activity',
        message: description,
        priority: 'low',
        data: {
          activityType: type,
          timestamp: new Date(),
          metadata
        },
        read: true // System activities are pre-read
      });
    } catch (error) {
      // Log activity errors shouldn't break the main operation
      logger.warn('Failed to log activity:', error);
    }
  }
}

export const manufacturerAccountCoreService = new ManufacturerAccountService();


