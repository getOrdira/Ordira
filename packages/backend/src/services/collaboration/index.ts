// src/services/collaboration/index.ts

/**
 * Collaboration Services Barrel Export
 *
 * Exports all collaboration-related services following standard architecture:
 * - core: Core business logic and validation
 * - features: Feature-specific services
 * - utils: Utility functions and helpers
 * - validation: Access control and feature validation
 */

// ====================
// CORE SERVICES
// ====================

export {
  ConnectionValidationService,
  connectionValidationService
} from './core/connectionValidation.service';

export {
  WorkspaceManagementService,
  workspaceManagementService
} from './core/workspaceManagement.service';

export {
  RealTimeCollaborationService,
  realTimeCollaborationService,
  CollaborationEventType
} from './core/realTimeCollaboration.service';

export type {
  ICollaborationEvent,
  ISocketAuthData
} from './core/realTimeCollaboration.service';

export type {
  IConnectionStatus,
  IConnectionValidationResult
} from './core/connectionValidation.service';

// ====================
// FEATURE SERVICES
// ====================

export {
  ProductionUpdatesService,
  productionUpdatesService
} from './features/productionUpdates.service';

export {
  FileManagementService,
  fileManagementService
} from './features/fileManagement.service';

export {
  TaskManagementService,
  taskManagementService
} from './features/taskManagement.service';

// ====================
// VALIDATION SERVICES
// ====================

export {
  FeatureAccessService,
  featureAccessService,
  COLLABORATION_FEATURE_REQUIREMENTS,
  BRAND_PLAN_HIERARCHY,
  MANUFACTURER_PLAN_HIERARCHY
} from './validation/featureAccess.service';

// ====================
// UTILS
// ====================

export {
  CollaborationPermissionsService,
  collaborationPermissionsService
} from './utils/collaborationPermissions.service';

export {
  CollaborationEventEmitterService,
  collaborationEventEmitter
} from './utils/collaborationEventEmitter.service';

export type {
  IPermissionCheckResult
} from './utils/collaborationPermissions.service';
