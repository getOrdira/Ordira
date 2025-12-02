// src/middleware/collaboration/requireConnection.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { connectionValidationService } from '../../services/collaboration/core/connectionValidation.service';

/**
 * Extended Request with collaboration context
 */
export interface ICollaborationRequest extends Request {
  collaboration?: {
    brandId: Types.ObjectId;
    manufacturerId: Types.ObjectId;
    userId: Types.ObjectId;
    userType: 'brand' | 'manufacturer';
    workspaceId?: Types.ObjectId;
  };
  params: {
    workspaceId?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Middleware to require an active connection between brand and manufacturer
 *
 * Usage:
 * router.post('/workspaces', requireConnection, createWorkspace);
 *
 * Prerequisites:
 * - Request must have req.collaboration.brandId
 * - Request must have req.collaboration.manufacturerId
 */
export const requireConnection = async (
  req: ICollaborationRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Try to get brandId and manufacturerId from multiple sources
    const collaborationBrandId = req.collaboration?.brandId;
    const collaborationManufacturerId = req.collaboration?.manufacturerId;
    
    // Also check validatedBody (set by route validation) and body
    const bodyBrandId = (req as any).validatedBody?.brandId || (req as any).body?.brandId;
    const bodyManufacturerId = (req as any).validatedBody?.manufacturerId || (req as any).body?.manufacturerId;
    
    // Also check query params (for GET requests)
    const queryBrandId = (req as any).validatedQuery?.brandId || (req as any).query?.brandId;
    const queryManufacturerId = (req as any).validatedQuery?.manufacturerId || (req as any).query?.manufacturerId;
    
    // Also check from user context (businessId for brand, manufacturerId for manufacturer)
    const userBrandId = (req as any).businessId;
    const userManufacturerId = (req as any).manufacturerId;
    
    // Resolve brandId and manufacturerId from available sources
    const brandId = collaborationBrandId || bodyBrandId || queryBrandId || userBrandId;
    const manufacturerId = collaborationManufacturerId || bodyManufacturerId || queryManufacturerId || userManufacturerId;

    if (!brandId || !manufacturerId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARTIES',
          message: 'Both brandId and manufacturerId are required for collaboration features'
        }
      });
      return;
    }

    // Ensure they are ObjectIds
    const brandIdObj = brandId instanceof Types.ObjectId ? brandId : new Types.ObjectId(brandId);
    const manufacturerIdObj = manufacturerId instanceof Types.ObjectId ? manufacturerId : new Types.ObjectId(manufacturerId);
    
    // Populate req.collaboration if not already set
    if (!req.collaboration) {
      req.collaboration = {
        brandId: brandIdObj,
        manufacturerId: manufacturerIdObj,
        userId: new Types.ObjectId((req as any).userId || (req as any).validatedBody?.createdBy),
        userType: ((req as any).userType === 'business' ? 'brand' : 'manufacturer') as 'brand' | 'manufacturer'
      };
    }

    const connectionStatus = await connectionValidationService.validateConnection(
      brandIdObj,
      manufacturerIdObj
    );

    if (!connectionStatus.isConnected) {
      res.status(403).json({
        success: false,
        error: {
          code: 'CONNECTION_REQUIRED',
          message: connectionStatus.message || 'An active connection is required',
          details: {
            brandId: brandIdObj.toString(),
            manufacturerId: manufacturerIdObj.toString()
          }
        }
      });
      return;
    }

    if (connectionStatus.status !== 'active') {
      res.status(403).json({
        success: false,
        error: {
          code: 'INACTIVE_CONNECTION',
          message: `Connection must be active (current status: ${connectionStatus.status})`,
          details: {
            connectionStatus: connectionStatus.status,
            brandId: brandIdObj.toString(),
            manufacturerId: manufacturerIdObj.toString()
          }
        }
      });
      return;
    }

    // Connection is valid, proceed
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CONNECTION_VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to validate connection'
      }
    });
  }
};

/**
 * Middleware to require workspace membership
 *
 * Usage:
 * router.get('/workspaces/:workspaceId', requireWorkspaceMembership, getWorkspace);
 *
 * Prerequisites:
 * - Request must have req.collaboration.userId
 * - Request must have req.collaboration.userType
 * - Request must have req.params.workspaceId or req.collaboration.workspaceId
 */
export const requireWorkspaceMembership = async (
  req: ICollaborationRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId, userType, workspaceId: contextWorkspaceId } = req.collaboration || {};
    const workspaceId = contextWorkspaceId || req.params.workspaceId;

    if (!userId || !userType) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_USER_CONTEXT',
          message: 'User context (userId and userType) is required'
        }
      });
      return;
    }

    if (!workspaceId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_WORKSPACE_ID',
          message: 'Workspace ID is required'
        }
      });
      return;
    }

    const accessResult = await connectionValidationService.validateWorkspaceAccess(
      userId,
      workspaceId,
      userType
    );

    if (!accessResult.hasAccess) {
      res.status(403).json({
        success: false,
        error: {
          code: 'WORKSPACE_ACCESS_DENIED',
          message: accessResult.reason || 'You do not have access to this workspace',
          details: {
            workspaceId: workspaceId.toString(),
            userId: userId.toString()
          }
        }
      });
      return;
    }

    // Add workspace access info to request
    if (req.collaboration) {
      req.collaboration.workspaceId = new Types.ObjectId(workspaceId);
    }

    // Workspace access is valid, proceed
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'WORKSPACE_ACCESS_VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to validate workspace access'
      }
    });
  }
};

/**
 * Middleware to check workspace role permissions
 *
 * Usage:
 * router.delete('/workspaces/:workspaceId', requireWorkspaceRole(['owner', 'admin']), deleteWorkspace);
 *
 * Prerequisites:
 * - Must be used AFTER requireWorkspaceMembership middleware
 */
export const requireWorkspaceRole = (allowedRoles: Array<'owner' | 'admin' | 'member' | 'viewer'>) => {
  return async (
    req: ICollaborationRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId, userType, workspaceId } = req.collaboration || {};

      if (!userId || !userType || !workspaceId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CONTEXT',
            message: 'User and workspace context required. Use requireWorkspaceMembership first.'
          }
        });
        return;
      }

      const accessResult = await connectionValidationService.validateWorkspaceAccess(
        userId,
        workspaceId,
        userType
      );

      if (!accessResult.hasAccess || !accessResult.role) {
        res.status(403).json({
          success: false,
          error: {
            code: 'WORKSPACE_ACCESS_DENIED',
            message: 'Workspace access required'
          }
        });
        return;
      }

      if (!allowedRoles.includes(accessResult.role)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
            details: {
              userRole: accessResult.role,
              requiredRoles: allowedRoles
            }
          }
        });
        return;
      }

      // User has required role, proceed
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'ROLE_VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to validate role permissions'
        }
      });
    }
  };
};
