// src/lib/types/invitations.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';
import { ApiResponse, PaginatedResponse, TimeRange } from './common';

/**
 * Invitation status types
 * Based on backend IInvitation model status field
 */
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled' | 'disconnected';

/**
 * Invitation type types
 * Based on backend IInvitation model invitationType field
 */
export type InvitationType = 'collaboration' | 'manufacturing' | 'partnership' | 'custom';

/**
 * Invitation terms interface
 * Based on backend IInvitation model terms field
 */
export interface InvitationTerms {
  proposedCommission?: number;
  minimumOrderQuantity?: number;
  deliveryTimeframe?: string;
  specialRequirements?: string[];
}

/**
 * Counter offer interface
 * Based on backend IInvitation model counterOffer field
 */
export interface CounterOffer {
  commission?: number;
  minimumOrderQuantity?: number;
  deliveryTimeframe?: string;
  additionalTerms?: string;
}

/**
 * Invitation interface
 * Based on backend IInvitation model
 */
export interface Invitation {
  _id: string;
  brand: string; // Brand ID reference
  manufacturer: string; // Manufacturer ID reference
  status: InvitationStatus;
  
  // Enhanced fields
  invitationToken?: string;
  message?: string;
  expiresAt: Date;
  respondedAt?: Date;
  
  // Invitation details
  invitationType: InvitationType;
  terms?: InvitationTerms;
  
  // Response data
  responseMessage?: string;
  counterOffer?: CounterOffer;
  
  // Additional references
  manufacturers?: string[]; // Manufacturer ID references
  brands?: string[]; // Brand ID references
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invitation creation request
 * For creating new invitations
 */
export interface CreateInvitationRequest {
  manufacturer: string;
  invitationType: InvitationType;
  message?: string;
  terms?: InvitationTerms;
  expiresAt?: Date;
}

/**
 * Invitation response request
 * For responding to invitations
 */
export interface RespondToInvitationRequest {
  status: 'accepted' | 'declined';
  message?: string;
  counterOffer?: CounterOffer;
}

/**
 * Invitation update request
 * For updating existing invitations
 */
export interface UpdateInvitationRequest {
  message?: string;
  terms?: InvitationTerms;
  expiresAt?: Date;
  counterOffer?: CounterOffer;
}

/**
 * Invitation list response
 * For paginated invitation lists
 */
export interface InvitationListResponse extends PaginatedResponse<Invitation> {
  invitations: Invitation[];
  analytics: {
    totalInvitations: number;
    pendingCount: number;
    acceptedCount: number;
    declinedCount: number;
    expiredCount: number;
    cancelledCount: number;
  };
}

/**
 * Invitation detail response
 * For detailed invitation information
 */
export interface InvitationDetailResponse {
  invitation: Invitation;
  brand: {
    _id: string;
    businessName: string;
    logoUrl?: string;
    description?: string;
  };
  manufacturer: {
    _id: string;
    name: string;
    logoUrl?: string;
    industry?: string;
    description?: string;
  };
  history: Array<{
    action: string;
    timestamp: Date;
    message?: string;
    user: string;
  }>;
}

/**
 * Invitation analytics response
 * For invitation analytics and reporting
 */
export interface InvitationAnalyticsResponse {
  overview: {
    totalInvitations: number;
    pendingCount: number;
    acceptedCount: number;
    declinedCount: number;
    expiredCount: number;
    cancelledCount: number;
    acceptanceRate: number;
    averageResponseTime: number;
  };
  statusDistribution: Array<{
    status: InvitationStatus;
    count: number;
    percentage: number;
  }>;
  typeDistribution: Array<{
    type: InvitationType;
    count: number;
    percentage: number;
  }>;
  monthlyStats: Array<{
    month: string;
    sent: number;
    accepted: number;
    declined: number;
    expired: number;
  }>;
  topBrands: Array<{
    brand: {
      _id: string;
      businessName: string;
    };
    invitationCount: number;
    acceptanceRate: number;
  }>;
  topManufacturers: Array<{
    manufacturer: {
      _id: string;
      name: string;
    };
    invitationCount: number;
    acceptanceRate: number;
  }>;
}

/**
 * Invitation search response
 * For searching invitations
 */
export interface InvitationSearchResponse extends PaginatedResponse<Invitation> {
  invitations: Invitation[];
  filters: {
    statuses: InvitationStatus[];
    types: InvitationType[];
    dateRange: {
      from: Date;
      to: Date;
    };
  };
  searchMetadata: {
    query?: string;
    totalResults: number;
    searchTime: number;
  };
}

/**
 * Invitation template interface
 * For invitation templates
 */
export interface InvitationTemplate {
  _id: string;
  name: string;
  description?: string;
  invitationType: InvitationType;
  subject: string;
  message: string;
  terms: InvitationTerms;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bulk invitation request
 * For sending multiple invitations
 */
export interface BulkInvitationRequest {
  manufacturers: string[];
  invitationType: InvitationType;
  message?: string;
  terms?: InvitationTerms;
  expiresAt?: Date;
  templateId?: string;
}

/**
 * Invitation settings interface
 * For invitation management settings
 */
export interface InvitationSettings {
  autoExpireDays: number;
  allowCounterOffers: boolean;
  requireApproval: boolean;
  defaultTerms: InvitationTerms;
  notificationSettings: {
    sendEmailNotifications: boolean;
    sendInAppNotifications: boolean;
    reminderDays: number[];
  };
}

// ===== JOI VALIDATION SCHEMAS =====

/**
 * Invitation status validation schema
 */
export const invitationStatusSchema = Joi.string()
  .valid('pending', 'accepted', 'declined', 'expired', 'cancelled', 'disconnected')
  .required()
  .messages({
    'any.only': 'Status must be one of: pending, accepted, declined, expired, cancelled, disconnected'
  });

/**
 * Invitation type validation schema
 */
export const invitationTypeSchema = Joi.string()
  .valid('collaboration', 'manufacturing', 'partnership', 'custom')
  .required()
  .messages({
    'any.only': 'Invitation type must be one of: collaboration, manufacturing, partnership, custom'
  });

/**
 * Invitation terms validation schema
 */
export const invitationTermsSchema = Joi.object({
  proposedCommission: Joi.number().min(0).max(100).optional(),
  minimumOrderQuantity: Joi.number().min(1).optional(),
  deliveryTimeframe: Joi.string().max(100).optional(),
  specialRequirements: Joi.array().items(Joi.string().max(200)).optional()
});

/**
 * Counter offer validation schema
 */
export const counterOfferSchema = Joi.object({
  commission: Joi.number().min(0).max(100).optional(),
  minimumOrderQuantity: Joi.number().min(1).optional(),
  deliveryTimeframe: Joi.string().max(100).optional(),
  additionalTerms: Joi.string().max(1000).optional()
});

/**
 * Create invitation request validation schema
 */
export const createInvitationRequestSchema = Joi.object({
  manufacturer: commonSchemas.mongoId.required(),
  invitationType: invitationTypeSchema.required(),
  message: Joi.string().max(1000).optional(),
  terms: invitationTermsSchema.optional(),
  expiresAt: Joi.date().min('now').optional()
});

/**
 * Respond to invitation request validation schema
 */
export const respondToInvitationRequestSchema = Joi.object({
  status: Joi.string().valid('accepted', 'declined').required(),
  message: Joi.string().max(1000).optional(),
  counterOffer: counterOfferSchema.optional()
});

/**
 * Update invitation request validation schema
 */
export const updateInvitationRequestSchema = Joi.object({
  message: Joi.string().max(1000).optional(),
  terms: invitationTermsSchema.optional(),
  expiresAt: Joi.date().min('now').optional(),
  counterOffer: counterOfferSchema.optional()
});

/**
 * Invitation query validation schema
 */
export const invitationQuerySchema = Joi.object({
  brand: commonSchemas.mongoId.optional(),
  manufacturer: commonSchemas.mongoId.optional(),
  status: invitationStatusSchema.optional(),
  invitationType: invitationTypeSchema.optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'expiresAt', 'status').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Bulk invitation request validation schema
 */
export const bulkInvitationRequestSchema = Joi.object({
  manufacturers: Joi.array().items(commonSchemas.mongoId).min(1).max(100).required(),
  invitationType: invitationTypeSchema.required(),
  message: Joi.string().max(1000).optional(),
  terms: invitationTermsSchema.optional(),
  expiresAt: Joi.date().min('now').optional(),
  templateId: Joi.string().optional()
});

/**
 * Invitation settings validation schema
 */
export const invitationSettingsSchema = Joi.object({
  autoExpireDays: Joi.number().min(1).max(365).default(30),
  allowCounterOffers: Joi.boolean().default(true),
  requireApproval: Joi.boolean().default(false),
  defaultTerms: invitationTermsSchema.optional(),
  notificationSettings: Joi.object({
    sendEmailNotifications: Joi.boolean().default(true),
    sendInAppNotifications: Joi.boolean().default(true),
    reminderDays: Joi.array().items(Joi.number().min(1).max(30)).default([3, 7, 14])
  }).required()
});

/**
 * Export all invitation validation schemas
 */
export const invitationValidationSchemas = {
  invitationStatus: invitationStatusSchema,
  invitationType: invitationTypeSchema,
  invitationTerms: invitationTermsSchema,
  counterOffer: counterOfferSchema,
  createInvitationRequest: createInvitationRequestSchema,
  respondToInvitationRequest: respondToInvitationRequestSchema,
  updateInvitationRequest: updateInvitationRequestSchema,
  invitationQuery: invitationQuerySchema,
  bulkInvitationRequest: bulkInvitationRequestSchema,
  invitationSettings: invitationSettingsSchema
};
