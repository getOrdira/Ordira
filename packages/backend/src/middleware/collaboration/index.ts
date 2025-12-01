// src/middleware/collaboration/index.ts

/**
 * Collaboration Middleware Barrel Export
 *
 * Exports all collaboration-related middleware
 */

// ====================
// CONNECTION MIDDLEWARE
// ====================

export {
  requireConnection,
  requireWorkspaceMembership,
  requireWorkspaceRole
} from './requireConnection.middleware';

export type {
  ICollaborationRequest
} from './requireConnection.middleware';

// ====================
// FEATURE ACCESS MIDDLEWARE
// ====================

export {
  requireFeature,
  requireAllFeatures,
  requireAnyFeature,
  attachAvailableFeatures
} from './requireFeature.middleware';

export type {
  IFeatureRequest
} from './requireFeature.middleware';
