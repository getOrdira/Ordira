// src/services/connections/index.ts

/**
 * Connections Module - Brand & Manufacturer Connection System
 *
 * This module manages the invitation and connection system between brands and manufacturers.
 * Similar to a social network friend system:
 * - Brands can send invitations to manufacturers
 * - Manufacturers can accept or decline invitations
 * - Accepted invitations create bidirectional connections
 * - Connected parties can share analytics and data in real-time
 */

import { InvitationDataService, invitationDataService } from './core/invitationData.service';
import { ConnectionDataService, connectionDataService } from './core/connectionData.service';
import { InvitationsService, invitationsService } from './features/invitations.service';
import { AnalyticsSharingService } from './features/analyticsSharing.service';
import { CollaborationService } from './features/collaboration.service';
import { PermissionsService } from './features/permissions.service';
import { RecommendationsService } from './features/recommendations.service';
import { InvitationValidationService, invitationValidationService } from './validation/invitationValidation.service';
import { PermissionValidationService } from './validation/permissionValidation.service';
import { ConnectionHelpersService } from './utils/connectionHelpers.service';
import { MatchingEngineService } from './utils/matchingEngine.service';

// ===== CORE SERVICES =====
// Low-level data access and CRUD operations

export {
  InvitationDataService,
  invitationDataService
} from './core/invitationData.service';

export {
  ConnectionDataService,
  connectionDataService
} from './core/connectionData.service';

// ===== FEATURE SERVICES =====
// High-level business logic and orchestration

export {
  InvitationsService,
  invitationsService
} from './features/invitations.service';

export {
  AnalyticsSharingService
} from './features/analyticsSharing.service';

export {
  CollaborationService
} from './features/collaboration.service';

export {
  PermissionsService
} from './features/permissions.service';

export {
  RecommendationsService
} from './features/recommendations.service';

// ===== VALIDATION SERVICES =====
// Data validation and business rule enforcement

export {
  InvitationValidationService,
  invitationValidationService
} from './validation/invitationValidation.service';

export {
  PermissionValidationService
} from './validation/permissionValidation.service';

// ===== UTILITY SERVICES =====
// Helper functions and support utilities

export {
  ConnectionHelpersService
} from './utils/connectionHelpers.service';

export {
  MatchingEngineService
} from './utils/matchingEngine.service';

// ===== TYPE EXPORTS =====
// Export all TypeScript interfaces and types

// Core Types
export type {
  InvitationSummary,
  ConnectionStats,
  BulkInviteResult
} from './features/invitations.service';

// Validation Types
export type {
  InvitationValidationResult,
  TermsValidationResult
} from './validation/invitationValidation.service';

// ===== CONVENIENCE EXPORTS =====
// Pre-configured service instances for immediate use

export const ConnectionServices = {
  // Core Data Services
  invitations: InvitationDataService,
  connections: ConnectionDataService,

  // Feature Services
  invitationsFeature: InvitationsService,

  // Validation Services
  validation: InvitationValidationService
} as const;

// ===== MODULE METADATA =====
export const ConnectionsModuleInfo = {
  version: '1.0.0',
  description: 'Brand-Manufacturer connection and invitation management system',
  services: {
    core: ['InvitationDataService', 'ConnectionDataService'],
    features: [
      'InvitationsService',
      'AnalyticsSharingService',
      'CollaborationService',
      'PermissionsService',
      'RecommendationsService'
    ],
    validation: ['InvitationValidationService', 'PermissionValidationService'],
    utils: ['ConnectionHelpersService', 'MatchingEngineService'],
  },
  capabilities: [
    'Invitation Management',
    'Connection Tracking',
    'Real-time Analytics Sharing',
    'Permission Management',
    'Manufacturer Recommendations',
    'Bulk Invitations',
    'Connection Statistics',
    'Collaboration Features'
  ]
} as const;
