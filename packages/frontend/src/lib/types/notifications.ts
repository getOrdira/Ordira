// src/lib/types/notifications.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';
import { ApiResponse, PaginatedResponse, TimeRange } from './common';

/**
 * Notification priority types
 * Based on backend INotification model priority field
 */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Notification category types
 * Based on backend INotification model category field
 */
export type NotificationCategory = 'system' | 'billing' | 'certificate' | 'vote' | 'invite' | 'order' | 'security';

/**
 * Delivery status types
 * Based on backend INotification model deliveryStatus field
 */
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed';

/**
 * Delivery channel types
 * Based on backend INotification model deliveryChannels field
 */
export type DeliveryChannel = 'in_app' | 'email' | 'sms' | 'push';

/**
 * Notification interface
 * Based on backend INotification model
 */
export interface Notification {
  _id: string;
  
  // Core recipient fields (mutually exclusive)
  business?: string; // Business ID reference
  manufacturer?: string; // Manufacturer ID reference
  
  // Core notification fields
  type: string;
  message: string;
  data?: any;
  read: boolean;
  
  // Enhanced fields
  priority: NotificationPriority;
  category: NotificationCategory;
  title?: string;
  actionUrl?: string;
  expiresAt?: Date;
  
  // Delivery tracking
  deliveryStatus: DeliveryStatus;
  deliveryChannels?: DeliveryChannel[];
  deliveryAttempts?: number;
  lastDeliveryAttempt?: Date;
  deliveryError?: string;
  
  // Bulk notification tracking
  batchId?: string;
  bulkNotification?: boolean;
  recipientEmail?: string;
  recipientName?: string;
  
  // Archive and management
  archived?: boolean;
  archivedAt?: Date;
  deletedAt?: Date;
  
  // Notification lifecycle tracking
  viewedAt?: Date;
  clickedAt?: Date;
  interactionCount?: number;
  
  // Template and personalization
  templateId?: string;
  templateData?: Record<string, any>;
  personalizedMessage?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification creation request
 * For creating new notifications
 */
export interface CreateNotificationRequest {
  business?: string;
  manufacturer?: string;
  type: string;
  message: string;
  data?: any;
  priority?: NotificationPriority;
  category: NotificationCategory;
  title?: string;
  actionUrl?: string;
  expiresAt?: Date;
  deliveryChannels?: DeliveryChannel[];
  templateId?: string;
  templateData?: Record<string, any>;
  personalizedMessage?: string;
}

/**
 * Notification update request
 * For updating existing notifications
 */
export interface UpdateNotificationRequest {
  read?: boolean;
  archived?: boolean;
  deliveryStatus?: DeliveryStatus;
  deliveryError?: string;
  viewedAt?: Date;
  clickedAt?: Date;
}

/**
 * Bulk notification creation request
 * For creating multiple notifications
 */
export interface BulkCreateNotificationRequest {
  notifications: Array<{
    business?: string;
    manufacturer?: string;
    type: string;
    message: string;
    data?: any;
    priority?: NotificationPriority;
    category: NotificationCategory;
    title?: string;
    actionUrl?: string;
    expiresAt?: Date;
    deliveryChannels?: DeliveryChannel[];
    templateId?: string;
    templateData?: Record<string, any>;
    personalizedMessage?: string;
  }>;
  batchOptions?: {
    priority?: NotificationPriority;
    deliveryChannels?: DeliveryChannel[];
    scheduleDate?: Date;
  };
}

/**
 * Notification list response
 * For paginated notification lists
 */
export interface NotificationListResponse extends PaginatedResponse<Notification> {
  notifications: Notification[];
  analytics: {
    totalNotifications: number;
    unreadCount: number;
    readCount: number;
    archivedCount: number;
    deliveryStats: {
      pending: number;
      sent: number;
      delivered: number;
      failed: number;
    };
  };
}

/**
 * Notification detail response
 * For detailed notification information
 */
export interface NotificationDetailResponse {
  notification: Notification;
  recipient?: {
    _id: string;
    name: string;
    email?: string;
    type: 'business' | 'manufacturer';
  };
  deliveryHistory: Array<{
    status: DeliveryStatus;
    channel: DeliveryChannel;
    timestamp: Date;
    error?: string;
  }>;
  interactions: Array<{
    type: 'view' | 'click' | 'dismiss';
    timestamp: Date;
    metadata?: any;
  }>;
}

/**
 * Notification analytics response
 * For notification analytics and reporting
 */
export interface NotificationAnalyticsResponse {
  overview: {
    totalNotifications: number;
    unreadCount: number;
    readCount: number;
    archivedCount: number;
    averageDeliveryTime: number;
    clickThroughRate: number;
  };
  categoryDistribution: Array<{
    category: NotificationCategory;
    count: number;
    percentage: number;
  }>;
  priorityDistribution: Array<{
    priority: NotificationPriority;
    count: number;
    percentage: number;
  }>;
  deliveryStats: Array<{
    status: DeliveryStatus;
    count: number;
    percentage: number;
  }>;
  channelStats: Array<{
    channel: DeliveryChannel;
    count: number;
    successRate: number;
  }>;
  monthlyStats: Array<{
    month: string;
    sent: number;
    delivered: number;
    failed: number;
    clicked: number;
  }>;
}

/**
 * Notification template interface
 * For notification templates
 */
export interface NotificationTemplate {
  _id: string;
  name: string;
  description?: string;
  type: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  subject?: string;
  message: string;
  htmlTemplate?: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification preferences interface
 * For user notification preferences
 */
export interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
  categories: {
    system: boolean;
    billing: boolean;
    certificate: boolean;
    vote: boolean;
    invite: boolean;
    order: boolean;
    security: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
    timezone: string;
  };
}

/**
 * Notification settings response
 * For notification settings management
 */
export interface NotificationSettingsResponse {
  preferences: NotificationPreferences;
  templates: NotificationTemplate[];
  deliveryChannels: DeliveryChannel[];
  categories: NotificationCategory[];
  priorities: NotificationPriority[];
}

// ===== JOI VALIDATION SCHEMAS =====

/**
 * Notification priority validation schema
 */
export const notificationPrioritySchema = Joi.string()
  .valid('low', 'medium', 'high', 'urgent')
  .default('medium')
  .messages({
    'any.only': 'Priority must be one of: low, medium, high, urgent'
  });

/**
 * Notification category validation schema
 */
export const notificationCategorySchema = Joi.string()
  .valid('system', 'billing', 'certificate', 'vote', 'invite', 'order', 'security')
  .required()
  .messages({
    'any.only': 'Category must be one of: system, billing, certificate, vote, invite, order, security'
  });

/**
 * Delivery status validation schema
 */
export const deliveryStatusSchema = Joi.string()
  .valid('pending', 'sent', 'delivered', 'failed')
  .default('pending')
  .messages({
    'any.only': 'Delivery status must be one of: pending, sent, delivered, failed'
  });

/**
 * Delivery channel validation schema
 */
export const deliveryChannelSchema = Joi.string()
  .valid('in_app', 'email', 'sms', 'push')
  .messages({
    'any.only': 'Delivery channel must be one of: in_app, email, sms, push'
  });

/**
 * Create notification request validation schema
 */
export const createNotificationRequestSchema = Joi.object({
  business: commonSchemas.mongoId.optional(),
  manufacturer: commonSchemas.mongoId.optional(),
  type: Joi.string().min(1).max(100).required(),
  message: Joi.string().min(1).max(1000).required(),
  data: Joi.object().optional(),
  priority: notificationPrioritySchema,
  category: notificationCategorySchema.required(),
  title: Joi.string().max(200).optional(),
  actionUrl: commonSchemas.optionalUrl,
  expiresAt: Joi.date().optional(),
  deliveryChannels: Joi.array().items(deliveryChannelSchema).optional(),
  templateId: Joi.string().optional(),
  templateData: Joi.object().optional(),
  personalizedMessage: Joi.string().max(1000).optional()
}).custom((value, helpers) => {
  // Ensure either business or manufacturer is provided, but not both
  if (!value.business && !value.manufacturer) {
    return helpers.error('custom.missingRecipient');
  }
  if (value.business && value.manufacturer) {
    return helpers.error('custom.bothRecipients');
  }
  return value;
}).messages({
  'custom.missingRecipient': 'Either business or manufacturer must be provided',
  'custom.bothRecipients': 'Cannot specify both business and manufacturer'
});

/**
 * Update notification request validation schema
 */
export const updateNotificationRequestSchema = Joi.object({
  read: Joi.boolean().optional(),
  archived: Joi.boolean().optional(),
  deliveryStatus: deliveryStatusSchema.optional(),
  deliveryError: Joi.string().max(500).optional(),
  viewedAt: Joi.date().optional(),
  clickedAt: Joi.date().optional()
});

/**
 * Bulk create notification request validation schema
 */
export const bulkCreateNotificationRequestSchema = Joi.object({
  notifications: Joi.array().items(
    Joi.object({
      business: commonSchemas.mongoId.optional(),
      manufacturer: commonSchemas.mongoId.optional(),
      type: Joi.string().min(1).max(100).required(),
      message: Joi.string().min(1).max(1000).required(),
      data: Joi.object().optional(),
      priority: notificationPrioritySchema,
      category: notificationCategorySchema.required(),
      title: Joi.string().max(200).optional(),
      actionUrl: commonSchemas.optionalUrl,
      expiresAt: Joi.date().optional(),
      deliveryChannels: Joi.array().items(deliveryChannelSchema).optional(),
      templateId: Joi.string().optional(),
      templateData: Joi.object().optional(),
      personalizedMessage: Joi.string().max(1000).optional()
    })
  ).min(1).max(1000).required(),
  batchOptions: Joi.object({
    priority: notificationPrioritySchema.optional(),
    deliveryChannels: Joi.array().items(deliveryChannelSchema).optional(),
    scheduleDate: Joi.date().optional()
  }).optional()
});

/**
 * Notification query validation schema
 */
export const notificationQuerySchema = Joi.object({
  business: commonSchemas.mongoId.optional(),
  manufacturer: commonSchemas.mongoId.optional(),
  type: Joi.string().optional(),
  category: notificationCategorySchema.optional(),
  priority: notificationPrioritySchema.optional(),
  deliveryStatus: deliveryStatusSchema.optional(),
  read: Joi.boolean().optional(),
  archived: Joi.boolean().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'priority', 'category').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Notification preferences validation schema
 */
export const notificationPreferencesSchema = Joi.object({
  inApp: Joi.boolean().default(true),
  email: Joi.boolean().default(true),
  sms: Joi.boolean().default(false),
  push: Joi.boolean().default(true),
  categories: Joi.object({
    system: Joi.boolean().default(true),
    billing: Joi.boolean().default(true),
    certificate: Joi.boolean().default(true),
    vote: Joi.boolean().default(true),
    invite: Joi.boolean().default(true),
    order: Joi.boolean().default(true),
    security: Joi.boolean().default(true)
  }).required(),
  frequency: Joi.string().valid('immediate', 'hourly', 'daily', 'weekly').default('immediate'),
  quietHours: Joi.object({
    enabled: Joi.boolean().default(false),
    start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    timezone: Joi.string().optional()
  }).optional()
});

/**
 * Export all notification validation schemas
 */
export const notificationValidationSchemas = {
  notificationPriority: notificationPrioritySchema,
  notificationCategory: notificationCategorySchema,
  deliveryStatus: deliveryStatusSchema,
  deliveryChannel: deliveryChannelSchema,
  createNotificationRequest: createNotificationRequestSchema,
  updateNotificationRequest: updateNotificationRequestSchema,
  bulkCreateNotificationRequest: bulkCreateNotificationRequestSchema,
  notificationQuery: notificationQuerySchema,
  notificationPreferences: notificationPreferencesSchema
};
