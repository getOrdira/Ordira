// src/services/business/manufacturerAccount.service.ts

import { Manufacturer, IManufacturer } from '../../models/manufacturer.model';
import { Media } from '../../models/media.model';
import { Notification } from '../../models/notification.model';
import { MediaService } from './media.service';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

// Enhanced interfaces for comprehensive functionality
export interface VerificationStatus {
  isVerified: boolean;
  status: 'unverified' | 'pending' | 'approved' | 'rejected' | 'expired';
  submittedAt?: Date;
  reviewedAt?: Date;
  expiresAt?: Date;
  reviewer?: string;
  requirements: VerificationRequirement[];
  documents: VerificationDocument[];
  rejectionReasons?: string[];
  nextSteps?: string[];
}

export interface VerificationRequirement {
  type: 'business_license' | 'tax_certificate' | 'facility_photos' | 'certifications' | 'insurance' | 'references';
  name: string;
  description: string;
  required: boolean;
  completed: boolean;
  documentUrl?: string;
  notes?: string;
}

export interface VerificationDocument {
  id: string;
  type: 'business_license' | 'tax_certificate' | 'facility_photos' | 'certifications' | 'insurance' | 'references';
  filename: string;
  url: string;
  uploadedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
}

export interface AccountActivity {
  id: string;
  type: 'login' | 'profile_update' | 'verification_submitted' | 'document_uploaded' | 'password_changed' | 'notification_sent' | 'account_activated' | 'account_deactivated';
  description: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high';
}

export interface NotificationPreferences {
  emailNotifications: {
    invitations: boolean;
    orderUpdates: boolean;
    systemUpdates: boolean;
    marketing: boolean;
  };
  pushNotifications: {
    invitations: boolean;
    orderUpdates: boolean;
    systemUpdates: boolean;
  };
  smsNotifications: {
    criticalUpdates: boolean;
    orderAlerts: boolean;
  };
  frequency: 'immediate' | 'daily' | 'weekly';
  timezone: string;
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
}

export interface VerificationSubmissionResult {
  submissionId: string;
  status: 'submitted' | 'received' | 'under_review';
  estimatedReviewTime: string;
  documentCount: number;
  submittedAt: Date;
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
 * Enhanced manufacturer account management service
 */
export class ManufacturerAccountService {
  private mediaService: MediaService;

  constructor() {
    this.mediaService = new MediaService();
  }

  /**
   * Get manufacturer profile/account details - Enhanced
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
   * Update manufacturer profile/account - Enhanced
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
          (updateData as any)[field] = data[field as keyof IManufacturer];
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
   * Soft delete manufacturer account - NEW METHOD
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
   * Upload profile picture - NEW METHOD
   */
  async uploadProfilePicture(mfgId: string, file: Express.Multer.File): Promise<ProfilePictureUploadResult> {
    try {
      if (!mfgId?.trim()) {
        throw new ManufacturerAccountError('Manufacturer ID is required', 400, 'MISSING_MANUFACTURER_ID');
      }

      if (!file) {
        throw new ManufacturerAccountError('Profile picture file is required', 400, 'MISSING_FILE');
      }

      // Validate file type and size
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new ManufacturerAccountError('Invalid file type. Only JPEG, PNG, and WebP are allowed', 400, 'INVALID_FILE_TYPE');
      }

      const maxFileSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxFileSize) {
        throw new ManufacturerAccountError('File size exceeds 5MB limit', 400, 'FILE_TOO_LARGE');
      }

      // Upload through media service
      const media = await this.mediaService.saveMedia(file, mfgId, {
        category: 'profile',
        description: 'Manufacturer profile picture',
        isPublic: true
      });

      // Update manufacturer profile with new picture URL
      await Manufacturer.findByIdAndUpdate(mfgId, {
        profilePictureUrl: media.url,
        updatedAt: new Date()
      });

      // Log the upload activity
      await this.logActivity(mfgId, 'profile_picture_updated', 'Profile picture uploaded successfully', {
        filename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype
      });

      return {
        profilePictureUrl: media.url,
        uploadedAt: media.createdAt,
        filename: media.filename,
        fileSize: file.size
      };
    } catch (error: any) {
      if (error instanceof ManufacturerAccountError) {
        throw error;
      }
      throw new ManufacturerAccountError(`Failed to upload profile picture: ${error.message}`, 500, 'UPLOAD_ERROR');
    }
  }

  /**
   * Get verification status - NEW METHOD
   */
  async getVerificationStatus(mfgId: string): Promise<VerificationStatus> {
    try {
      const manufacturer = await Manufacturer.findById(mfgId).select(
        'isVerified verifiedAt businessLicense certifications'
      );

      if (!manufacturer) {
        throw new ManufacturerAccountError('Manufacturer not found', 404, 'MANUFACTURER_NOT_FOUND');
      }

      // Define verification requirements
      const requirements: VerificationRequirement[] = [
        {
          type: 'business_license',
          name: 'Business License',
          description: 'Valid business registration or incorporation documents',
          required: true,
          completed: !!manufacturer.businessLicense
        },
        {
          type: 'tax_certificate',
          name: 'Tax Certificate',
          description: 'Tax registration certificate or VAT number',
          required: true,
          completed: false // Add logic based on your model
        },
        {
          type: 'facility_photos',
          name: 'Facility Photos',
          description: 'Photos of manufacturing facilities and equipment',
          required: true,
          completed: false // Add logic based on your model
        },
        {
          type: 'certifications',
          name: 'Industry Certifications',
          description: 'Relevant industry certifications (ISO, etc.)',
          required: false,
          completed: !!(manufacturer.certifications && manufacturer.certifications.length > 0)
        }
      ];

      // Get verification documents from media
      const documents = await Media.find({
        uploadedBy: mfgId,
        category: 'certificate'
      }).select('filename url createdAt metadata');

      const verificationDocuments: VerificationDocument[] = documents.map(doc => ({
        id: doc._id.toString(),
        type: 'certifications', // Determine based on metadata
        filename: doc.filename,
        url: doc.url,
        uploadedAt: doc.createdAt,
        status: 'pending' // Add logic for review status
      }));

      return {
        isVerified: manufacturer.isVerified || false,
        status: manufacturer.isVerified ? 'approved' : 'unverified',
        reviewedAt: manufacturer.verifiedAt,
        requirements,
        documents: verificationDocuments,
        nextSteps: manufacturer.isVerified ? [] : [
          'Upload required business documents',
          'Submit verification application',
          'Wait for review (typically 3-5 business days)'
        ]
      };
    } catch (error: any) {
      if (error instanceof ManufacturerAccountError) {
        throw error;
      }
      throw new ManufacturerAccountError(`Failed to get verification status: ${error.message}`, 500, 'VERIFICATION_STATUS_ERROR');
    }
  }

  /**
   * Submit verification documents - NEW METHOD
   */
  async submitVerificationDocuments(
    mfgId: string, 
    files: Express.Multer.File[]
  ): Promise<VerificationSubmissionResult> {
    try {
      if (!files || files.length === 0) {
        throw new ManufacturerAccountError('Verification documents are required', 400, 'MISSING_DOCUMENTS');
      }

      const submissionId = uuidv4();
      const submittedAt = new Date();

      // Upload documents through media service
      const uploadResults = await this.mediaService.saveMultipleMedia(files, mfgId, {
        category: 'certificate',
        description: 'Verification documents',
        isPublic: false
      });

      if (uploadResults.failed.length > 0) {
        throw new ManufacturerAccountError(
          `Failed to upload some documents: ${uploadResults.failed.map(f => f.error).join(', ')}`,
          400,
          'UPLOAD_FAILED'
        );
      }

      // Update manufacturer verification status
      await Manufacturer.findByIdAndUpdate(mfgId, {
        verificationSubmittedAt: submittedAt,
        verificationSubmissionId: submissionId,
        verificationStatus: 'pending'
      });

      // Log the submission activity
      await this.logActivity(mfgId, 'verification_submitted', 'Verification documents submitted', {
        submissionId,
        documentCount: files.length,
        submittedAt
      });

      return {
        submissionId,
        status: 'submitted',
        estimatedReviewTime: '3-5 business days',
        documentCount: files.length,
        submittedAt
      };
    } catch (error: any) {
      if (error instanceof ManufacturerAccountError) {
        throw error;
      }
      throw new ManufacturerAccountError(`Failed to submit verification documents: ${error.message}`, 500, 'SUBMISSION_ERROR');
    }
  }

  /**
   * Get account activity log - NEW METHOD
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
   * Update notification preferences - NEW METHOD
   */
  async updateNotificationPreferences(
    mfgId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      if (!mfgId?.trim()) {
        throw new ManufacturerAccountError('Manufacturer ID is required', 400, 'MISSING_MANUFACTURER_ID');
      }

      // Default preferences
      const defaultPreferences: NotificationPreferences = {
        emailNotifications: {
          invitations: true,
          orderUpdates: true,
          systemUpdates: true,
          marketing: false
        },
        pushNotifications: {
          invitations: true,
          orderUpdates: true,
          systemUpdates: false
        },
        smsNotifications: {
          criticalUpdates: false,
          orderAlerts: false
        },
        frequency: 'immediate',
        timezone: 'UTC'
      };

      // Merge with existing preferences
      const updatedPreferences = { ...defaultPreferences, ...preferences };

      // Update manufacturer document
      await Manufacturer.findByIdAndUpdate(mfgId, {
        notificationPreferences: updatedPreferences,
        updatedAt: new Date()
      });

      // Log the update
      await this.logActivity(mfgId, 'notification_preferences_updated', 'Notification preferences updated', {
        preferences: updatedPreferences
      });

      return updatedPreferences;
    } catch (error: any) {
      if (error instanceof ManufacturerAccountError) {
        throw error;
      }
      throw new ManufacturerAccountError(`Failed to update notification preferences: ${error.message}`, 500, 'PREFERENCES_ERROR');
    }
  }

  /**
   * Initiate data export (GDPR compliance) - NEW METHOD
   */
  async initiateDataExport(mfgId: string): Promise<DataExportResult> {
    try {
      if (!mfgId?.trim()) {
        throw new ManufacturerAccountError('Manufacturer ID is required', 400, 'MISSING_MANUFACTURER_ID');
      }

      const exportId = uuidv4();
      const now = new Date();
      const estimatedCompletionTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Log the export request
      await this.logActivity(mfgId, 'data_export_requested', 'Data export requested for GDPR compliance', {
        exportId,
        requestedAt: now,
        estimatedCompletionTime,
        expiresAt
      });

      // In a real implementation, you would queue a background job to:
      // 1. Collect all user data from various collections
      // 2. Generate a comprehensive export file (JSON/CSV)
      // 3. Upload to secure storage
      // 4. Send notification when ready

      return {
        exportId,
        status: 'pending',
        estimatedCompletionTime,
        expiresAt,
        format: 'json'
      };
    } catch (error: any) {
      if (error instanceof ManufacturerAccountError) {
        throw error;
      }
      throw new ManufacturerAccountError(`Failed to initiate data export: ${error.message}`, 500, 'EXPORT_ERROR');
    }
  }

  /**
   * Legacy methods - Maintained for backward compatibility
   */
  async getManufacturerBasicInfo(mfgId: string): Promise<Pick<IManufacturer, 'name' | 'profilePictureUrl' | 'industry'>> {
    const manufacturer = await this.getManufacturerAccount(mfgId);
    return {
      name: manufacturer.name,
      profilePictureUrl: manufacturer.profilePictureUrl,
      industry: manufacturer.industry
    };
  }

  async updateContactInfo(mfgId: string, contactEmail: string): Promise<IManufacturer> {
    return this.updateManufacturerAccount(mfgId, { contactEmail });
  }

  async updateServicesOffered(mfgId: string, servicesOffered: string[]): Promise<IManufacturer> {
    return this.updateManufacturerAccount(mfgId, { servicesOffered });
  }

  async updateMinimumOrderQuantity(mfgId: string, moq: number): Promise<IManufacturer> {
    return this.updateManufacturerAccount(mfgId, { moq });
  }

  async getManufacturerStats(mfgId: string): Promise<{
    profileCompleteness: number;
    accountAge: number;
    lastUpdated: Date;
  }> {
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
  }

  async validateManufacturerOwnership(mfgId: string, currentUserId: string): Promise<boolean> {
    return mfgId === currentUserId;
  }

  async deactivateAccount(mfgId: string): Promise<void> {
    await Manufacturer.findByIdAndUpdate(mfgId, { 
      isActive: false,
      deactivatedAt: new Date()
    });
  }

  async reactivateAccount(mfgId: string): Promise<void> {
    await Manufacturer.findByIdAndUpdate(mfgId, { 
      isActive: true,
      $unset: { deactivatedAt: 1 }
    });
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
      console.warn('Failed to log activity:', error);
    }
  }
}
  
