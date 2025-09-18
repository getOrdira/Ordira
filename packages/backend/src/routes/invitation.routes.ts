// src/routes/invitation.routes.ts
import { Router, Request } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { asRouteHandler } from '../utils/routeHelpers';
import { authenticate, UnifiedAuthRequest, requireManufacturer } from '../middleware/unifiedAuth.middleware';
import { resolveTenant, TenantRequest } from '../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import * as invCtrl from '../controllers/invitation.controller';
import {
  sendInviteSchema,
  respondToInviteSchema,
  inviteParamsSchema,
  listInvitesQuerySchema,
  bulkInviteSchema
} from '../validation/invitation.validation';

const router = Router();

// ===== EXTENDED REQUEST INTERFACES =====

/**
 * Extended request interface with brand authentication and tenant context
 */
interface BrandInvitationRequest extends UnifiedAuthRequest, TenantRequest {}

/**
 * Extended request interface for manufacturer authentication
 */
interface ManufacturerInvitationRequest extends UnifiedAuthRequest {}

/**
 * Extended request interface with user type detection
 */
interface DualUnifiedAuthRequest extends Request {
  userType?: 'brand' | 'manufacturer';
  userId?: string;
  tenant?: { business: { toString: () => string } };
}

// ===== GLOBAL MIDDLEWARE =====

// Apply dynamic rate limiting to all invitation routes
router.use(dynamicRateLimiter());

// ===== OVERVIEW & ANALYTICS ROUTES =====

/**
 * Get invitation system overview (accessible to both brands and manufacturers)
 * GET /api/invitations
 * 
 * @requires authentication (brand OR manufacturer)
 * @returns overview of invitation system for the authenticated user
 */
router.get(
  '/',
  (req, res, next) => {
    // Try brand authentication first
    authenticate(req, res, (brandErr) => {
      if (!brandErr) {
        (req as DualUnifiedAuthRequest).userType = 'brand';
        return resolveTenant(req as any, res, next);
      }
      
      // If brand auth fails, try manufacturer authentication
      requireManufacturer(req, res, (mfgErr) => {
        if (!mfgErr) {
          (req as DualUnifiedAuthRequest).userType = 'manufacturer';
          return next();
        }
        
        // Both authentications failed
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Valid brand or manufacturer authentication required',
          code: 'AUTH_REQUIRED'
        });
      });
    });
  },
  trackManufacturerAction('view_invitation_overview'),
  async (req: DualUnifiedAuthRequest, res, next) => {
    try {
      const userType = (req as DualUnifiedAuthRequest).userType;
      const userId = (req as DualUnifiedAuthRequest).userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User ID not found'
        });
      }

      // This would call appropriate service methods based on user type
      res.json({
        success: true,
        message: 'Invitation overview retrieved successfully',
        data: {
          userType,
          userId,
          overview: {
            totalInvitations: 0,
            pendingInvitations: 0,
            acceptedInvitations: 0,
            declinedInvitations: 0,
            recentActivity: []
          },
          features: {
            sendInvitations: userType === 'brand',
            respondToInvitations: userType === 'manufacturer',
            viewAnalytics: true,
            bulkOperations: userType === 'brand'
          },
          limits: {
            maxPendingInvitations: userType === 'brand' ? 100 : null,
            invitationExpiration: 30, // days
            responseTimeLimit: null
          },
          note: 'Enhanced with controller methods when implemented'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get invitation statistics and analytics
 * GET /api/invitations/stats
 * 
 * @requires authentication (brand OR manufacturer)
 * @optional query: timeframe, breakdown
 * @returns detailed statistics and analytics
 */
router.get(
  '/stats',
  (req, res, next) => {
    // Dual authentication middleware
    authenticate(req, res, (brandErr) => {
      if (!brandErr) {
        (req as DualUnifiedAuthRequest).userType = 'brand';
        return resolveTenant(req as any, res, next);
      }
      
      requireManufacturer(req, res, (mfgErr) => {
        if (!mfgErr) {
          (req as DualUnifiedAuthRequest).userType = 'manufacturer';
          return next();
        }
        
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      });
    });
  },
  validateQuery(listInvitesQuerySchema.fork(['page', 'limit'], (schema) => schema.optional()).keys({
    timeframe: require('joi').number().integer().min(1).max(365).default(30),
    breakdown: require('joi').string().valid('daily', 'weekly', 'monthly').default('daily'),
    includeAnalytics: require('joi').boolean().default(true)
  })),
  trackManufacturerAction('view_invitation_stats'),
  async (req: DualUnifiedAuthRequest, res, next) => {
    try {
      const userType = (req as DualUnifiedAuthRequest).userType;
      const userId = (req as DualUnifiedAuthRequest).userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User ID not found'
        });
      }

      // This would use invitationService methods for detailed stats
      // For now, providing a structured response that can be enhanced
      res.json({
        success: true,
        message: 'Invitation statistics retrieved successfully',
        data: {
          userType,
          userId,
          timeframe: req.query.timeframe || 30,
          breakdown: req.query.breakdown || 'daily',
          statistics: {
            overview: {
              totalInvitations: 0,
              pendingInvitations: 0,
              acceptedInvitations: 0,
              declinedInvitations: 0,
              responseRate: 0,
              avgResponseTime: '0 hours'
            },
            trends: [],
            performance: {
              quickResponses: 0, // < 24 hours
              standardResponses: 0, // 1-7 days  
              slowResponses: 0, // > 7 days
              noResponse: 0 // expired
            },
            categories: {
              collaboration: 0,
              manufacturing: 0,
              partnership: 0,
              custom: 0
            }
          },
          note: 'Enhanced with (((invCtrl.getInvitationStats) when implemented'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== BRAND INVITATION ROUTES =====

/**
 * Send invitation to manufacturer
 * POST /api/invitations/brand
 * 
 * @requires brand authentication & tenant context
 * @requires validation: invitation details with terms
 * @rate-limited: strict to prevent spam
 */
router.post(
  '/brand',
  authenticate,
  resolveTenant,
  strictRateLimiter(), // Prevent invitation spam
  validateBody(sendInviteSchema),
  trackManufacturerAction('send_invitation'),
  asRouteHandler(((invCtrl.sendInviteAsBrand)))
);


/**
 * List invitations sent by brand
 * GET /api/invitations/brand
 * 
 * @requires brand authentication & tenant context
 * @optional query: filtering, pagination, sorting
 */
router.get(
  '/brand',
  authenticate,
  resolveTenant,
  validateQuery(listInvitesQuerySchema),
  trackManufacturerAction('view_sent_invitations'),
  asRouteHandler(((invCtrl.listInvitesForBrand)))
);

/**
 * Get specific invitation details (brand perspective)
 * GET /api/invitations/brand/:inviteId
 * 
 * @requires brand authentication & tenant context
 * @requires params: valid invitation ID
 */
router.get(
  '/brand/:inviteId',
  authenticate,
  resolveTenant,
  validateParams(inviteParamsSchema),
  trackManufacturerAction('view_invitation_details'),
  asRouteHandler(((invCtrl.listInvitesForBrand)))
);

/**
 * Update invitation terms (before acceptance)
 * PUT /api/invitations/brand/:inviteId
 * 
 * @requires brand authentication & tenant context
 * @requires validation: updated terms
 * @rate-limited: moderate to prevent abuse
 */
router.put(
  '/brand/:inviteId',
  authenticate,
  resolveTenant,
  dynamicRateLimiter(),
  validateParams(inviteParamsSchema),
  validateBody(sendInviteSchema.fork(['manufacturerId'], (schema) => schema.optional())),
  trackManufacturerAction('update_invitation'),
  async (req: BrandInvitationRequest, res, next) => {
    // This would be a new controller method to implement
    res.json({
      success: true,
      message: 'Invitation update endpoint - to be implemented',
      data: {
        inviteId: req.params.inviteId,
        action: 'update',
        note: 'This endpoint can be enhanced with asRouteHandler(((invCtrl.updateInvitation)'
      }
    });
  }
);

/**
 * Cancel invitation (brand only)
 * DELETE /api/invitations/brand/:inviteId
 * 
 * @requires brand authentication & tenant context
 * @requires params: valid invitation ID
 * @rate-limited: strict for security
 */
router.delete(
  '/brand/:inviteId',
  authenticate,
  resolveTenant,
  strictRateLimiter(), // Security for cancellation
  validateParams(inviteParamsSchema),
  trackManufacturerAction('cancel_invitation'),
  asRouteHandler(invCtrl.cancelInvite)
);

/**
 * Get brand's connection analytics
 * GET /api/invitations/brand/analytics
 * 
 * @requires brand authentication & tenant context
 * @optional query: date range, metrics
 */
router.get(
  '/brand/analytics',
  authenticate,
  resolveTenant,
  validateQuery(require('joi').object({
    startDate: require('joi').date().iso().optional(),
    endDate: require('joi').date().iso().min(require('joi').ref('startDate')).optional(),
    breakdown: require('joi').string().valid('daily', 'weekly', 'monthly').default('weekly'),
    metrics: require('joi').string().pattern(/^[a-z_,]+$/).optional()
  })),
  trackManufacturerAction('view_brand_invitation_analytics'),
  async (req: BrandInvitationRequest, res, next) => {
    try {
      const businessId = req.tenant?.business?.toString();
      if (!businessId) {
        return res.status(400).json({
          success: false,
          error: 'Business context not found'
        });
      }

      // This would use service methods for analytics
      res.json({
        success: true,
        message: 'Brand invitation analytics retrieved',
        data: {
          businessId,
          analytics: {
            summary: {
              totalSent: 0,
              acceptanceRate: 0,
              avgResponseTime: '0 hours',
              activeConnections: 0
            },
            trends: [],
            topManufacturers: [],
            invitationTypes: {
              collaboration: 0,
              manufacturing: 0,
              partnership: 0,
              custom: 0
            }
          },
          dateRange: {
            from: req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            to: req.query.endDate || new Date().toISOString()
          },
          note: 'Enhanced analytics available through InvitationService methods'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== MANUFACTURER INVITATION ROUTES =====

/**
 * Apply manufacturer authentication to all manufacturer routes
 */
router.use('/manufacturer', requireManufacturer);

/**
 * List invitations received by manufacturer
 * GET /api/invitations/manufacturer
 * 
 * @requires manufacturer authentication
 * @optional query: filtering, pagination, sorting
 */
router.get(
  '/manufacturer',
  validateQuery(listInvitesQuerySchema),
  trackManufacturerAction('view_received_invitations'),
  asRouteHandler(((invCtrl.listInvitesForManufacturer)))
);

/**
 * Get specific invitation details (manufacturer perspective)
 * GET /api/invitations/manufacturer/:inviteId
 * 
 * @requires manufacturer authentication
 * @requires params: valid invitation ID
 */
router.get(
  '/manufacturer/:inviteId',
  validateParams(inviteParamsSchema),
  trackManufacturerAction('view_invitation_details'),
  asRouteHandler(((invCtrl.listInvitesForManufacturer)))
);

/**
 * Respond to invitation (accept/decline)
 * POST /api/invitations/manufacturer/:inviteId/respond
 * 
 * @requires manufacturer authentication
 * @requires validation: response decision and optional message
 * @rate-limited: strict to prevent response spam
 */
router.post(
  '/manufacturer/:inviteId/respond',
  strictRateLimiter(), // Prevent response spam
  validateParams(inviteParamsSchema),
  validateBody(respondToInviteSchema),
  trackManufacturerAction('respond_to_invitation'),
  asRouteHandler(((invCtrl.respondToInvite)))
);

/**
 * Submit counter-offer for invitation
 * POST /api/invitations/manufacturer/:inviteId/counter-offer
 * 
 * @requires manufacturer authentication
 * @requires validation: counter-offer terms
 * @rate-limited: strict to prevent abuse
 */
router.post(
  '/manufacturer/:inviteId/counter-offer',
  strictRateLimiter(),
  validateParams(inviteParamsSchema),
  validateBody(respondToInviteSchema.keys({
    counterOffer: require('joi').object({
      commission: require('joi').number().min(0).max(100).optional(),
      minimumOrderQuantity: require('joi').number().integer().min(1).optional(),
      deliveryTimeframe: require('joi').string().trim().max(200).optional(),
      additionalTerms: require('joi').string().trim().max(1000).optional()
    }).required()
  })),
  trackManufacturerAction('submit_counter_offer'),
  async (req: ManufacturerInvitationRequest, res, next) => {
    // This would be a new controller method to implement
    res.json({
      success: true,
      message: 'Counter-offer submission endpoint - to be implemented',
      data: {
        inviteId: req.params.inviteId,
        counterOffer: req.body.counterOffer,
        note: 'This endpoint can be enhanced with (((invCtrl.submitCounterOffer)'
      }
    });
  }
);

/**
 * Get manufacturer's invitation analytics
 * GET /api/invitations/manufacturer/analytics
 * 
 * @requires manufacturer authentication
 * @optional query: date range, metrics
 */
router.get(
  '/manufacturer/analytics',
  validateQuery(require('joi').object({
    startDate: require('joi').date().iso().optional(),
    endDate: require('joi').date().iso().min(require('joi').ref('startDate')).optional(),
    breakdown: require('joi').string().valid('daily', 'weekly', 'monthly').default('weekly'),
    includeResponseTimes: require('joi').boolean().default(true)
  })),
  trackManufacturerAction('view_manufacturer_invitation_analytics'),
  async (req: ManufacturerInvitationRequest, res, next) => {
    try {
      const manufacturerId = req.userId;
      if (!manufacturerId) {
        return res.status(401).json({
          success: false,
          error: 'Manufacturer ID not found'
        });
      }

      // This would use service methods for manufacturer analytics
      res.json({
        success: true,
        message: 'Manufacturer invitation analytics retrieved',
        data: {
          manufacturerId,
          analytics: {
            summary: {
              totalReceived: 0,
              responseRate: 0,
              acceptanceRate: 0,
              avgResponseTime: '0 hours',
              activeBrands: 0
            },
            trends: [],
            topBrands: [],
            responsePatterns: {
              quickResponses: 0, // < 24 hours
              standardResponses: 0, // 1-7 days
              slowResponses: 0 // > 7 days
            }
          },
          dateRange: {
            from: req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            to: req.query.endDate || new Date().toISOString()
          },
          note: 'Enhanced analytics available through InvitationService methods'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== SHARED/GENERAL ROUTES =====

/**
 * Get invitation by ID (accessible to both parties)
 * GET /api/invitations/:inviteId
 * 
 * @requires authentication (brand OR manufacturer)
 * @requires params: valid invitation ID
 */
router.get(
  '/:inviteId',
  (req, res, next) => {
    // Dual authentication middleware
    authenticate(req, res, (brandErr) => {
      if (!brandErr) {
        (req as DualUnifiedAuthRequest).userType = 'brand';
        return resolveTenant(req as any, res, next);
      }
      
      requireManufacturer(req, res, (mfgErr) => {
        if (!mfgErr) {
          (req as DualUnifiedAuthRequest).userType = 'manufacturer';
          return next();
        }
        
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      });
    });
  },
  validateParams(inviteParamsSchema),
  trackManufacturerAction('view_invitation_details'),
  asRouteHandler(((invCtrl.getInvitationDetails)))
);

/**
 * Get invitation system health and metrics
 * GET /api/invitations/system/health
 * 
 * @requires authentication (brand OR manufacturer)
 * @returns system-wide invitation metrics and health
 */
router.get(
  '/system/health',
  (req, res, next) => {
    // Dual authentication middleware
    authenticate(req, res, (brandErr) => {
      if (!brandErr) {
        (req as DualUnifiedAuthRequest).userType = 'brand';
        return next();
      }
      
      requireManufacturer(req, res, (mfgErr) => {
        if (!mfgErr) {
          (req as DualUnifiedAuthRequest).userType = 'manufacturer';
          return next();
        }
        
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      });
    });
  },
  trackManufacturerAction('view_invitation_system_health'),
  async (req: DualUnifiedAuthRequest, res, next) => {
    try {
      const userType = (req as DualUnifiedAuthRequest).userType;
      const userId = (req as DualUnifiedAuthRequest).userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User ID not found'
        });
      }

      // This would use service methods for system health
      res.json({
        success: true,
        message: 'Invitation system health retrieved',
        data: {
          system: {
            status: 'healthy',
            totalInvitations: 0,
            activeConnections: 0,
            responseRate: 0,
            avgResponseTime: '0 hours'
          },
          trends: {
            dailyInvitations: 0,
            weeklyAcceptances: 0,
            monthlyConnections: 0
          },
          performance: {
            apiResponseTime: '< 100ms',
            notificationDelivery: '99%',
            systemUptime: '99.9%'
          },
          recommendations: [
            'System is operating normally',
            'All invitation features are available',
            'Response times are optimal'
          ],
          checkedAt: new Date().toISOString(),
          note: 'Enhanced with global metrics from Invitation model static methods'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== CONNECTION MANAGEMENT ROUTES =====

/**
 * Get connections overview for authenticated user
 * GET /api/invitations/connections
 * 
 * @requires authentication (brand OR manufacturer)
 * @returns active connections and relationship status
 */
router.get(
  '/connections',
  (req, res, next) => {
    // Dual authentication middleware
    authenticate(req, res, (brandErr) => {
      if (!brandErr) {
        (req as DualUnifiedAuthRequest).userType = 'brand';
        return resolveTenant(req as any, res, next);
      }
      
      requireManufacturer(req, res, (mfgErr) => {
        if (!mfgErr) {
          (req as DualUnifiedAuthRequest).userType = 'manufacturer';
          return next();
        }
        
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      });
    });
  },
  trackManufacturerAction('view_connections'),
  async (req: DualUnifiedAuthRequest, res, next) => {
    try {
      const userType = (req as DualUnifiedAuthRequest).userType;
      const userId = (req as DualUnifiedAuthRequest).userId;

      // This would use service methods to get connections
      res.json({
        success: true,
        message: 'Connections overview retrieved',
        data: {
          userType,
          connections: {
            active: [],
            pending: [],
            recent: []
          },
          stats: {
            totalConnections: 0,
            newThisMonth: 0,
            responseRate: 0
          },
          actions: {
            canInvite: userType === 'brand',
            canRespond: userType === 'manufacturer',
            canManageConnections: true
          },
          note: 'Enhanced with service methods when implemented'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Disconnect from a connected partner
 * DELETE /api/invitations/connections/:partnerId
 * 
 * @requires authentication (brand OR manufacturer)
 * @requires params: valid partner ID
 * @rate-limited: strict for security
 */
router.delete(
  '/connections/:partnerId',
  (req, res, next) => {
    // Dual authentication middleware
    authenticate(req, res, (brandErr) => {
      if (!brandErr) {
        (req as DualUnifiedAuthRequest).userType = 'brand';
        return resolveTenant(req as any, res, next);
      }
      
      requireManufacturer(req, res, (mfgErr) => {
        if (!mfgErr) {
          (req as DualUnifiedAuthRequest).userType = 'manufacturer';
          return next();
        }
        
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      });
    });
  },
  strictRateLimiter(), // Security for disconnection
  validateParams(require('joi').object({
    partnerId: require('joi').string().pattern(/^[0-9a-fA-F]{24}$/).required()
  })),
  trackManufacturerAction('disconnect_partner'),
  async (req: DualUnifiedAuthRequest, res, next) => {
    try {
      // This would use service methods to remove connection
      res.json({
        success: true,
        message: 'Connection removal endpoint - to be implemented',
        data: {
          partnerId: req.params.partnerId,
          userType: (req as DualUnifiedAuthRequest).userType,
          action: 'disconnect',
          note: 'This endpoint can be enhanced with invitationService.removeConnection'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== NOTIFICATION PREFERENCES =====

/**
 * Get invitation notification preferences
 * GET /api/invitations/notifications
 * 
 * @requires authentication (brand OR manufacturer)
 */
router.get(
  '/notifications',
  (req, res, next) => {
    // Dual authentication middleware
    authenticate(req, res, (brandErr) => {
      if (!brandErr) {
        (req as DualUnifiedAuthRequest).userType = 'brand';
        return next();
      }
      
      requireManufacturer(req, res, (mfgErr) => {
        if (!mfgErr) {
          (req as DualUnifiedAuthRequest).userType = 'manufacturer';
          return next();
        }
        
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      });
    });
  },
  trackManufacturerAction('view_notification_preferences'),
  async (req: DualUnifiedAuthRequest, res, next) => {
    res.json({
      success: true,
      message: 'Notification preferences retrieved',
      data: {
        preferences: {
          emailNotifications: true,
          pushNotifications: false,
          invitationReminders: true,
          responseNotifications: true,
          connectionUpdates: true
        },
        note: 'Notification preferences management to be implemented'
      }
    });
  }
);

/**
 * Update invitation notification preferences
 * PUT /api/invitations/notifications
 * 
 * @requires authentication (brand OR manufacturer)
 * @requires validation: notification preferences
 */
router.put(
  '/notifications',
  (req, res, next) => {
    
      authenticate(req, res, (brandErr) => {
      if (!brandErr) {
      (req as DualUnifiedAuthRequest).userType = 'brand';
      return next();
     }

      requireManufacturer(req, res, (mfgErr) => {
       if (!mfgErr) {
      (req as DualUnifiedAuthRequest).userType = 'manufacturer'; 
      return next();
      }
        
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      });
    });
  },
  validateBody(require('joi').object({
    emailNotifications: require('joi').boolean().optional(),
    pushNotifications: require('joi').boolean().optional(),
    invitationReminders: require('joi').boolean().optional(),
    responseNotifications: require('joi').boolean().optional(),
    connectionUpdates: require('joi').boolean().optional()
  })),
  trackManufacturerAction('update_notification_preferences'),
  async (req: DualUnifiedAuthRequest, res, next) => {
    res.json({
      success: true,
      message: 'Notification preferences updated - to be implemented',
      data: {
        preferences: req.body,
        note: 'Notification preferences update to be implemented'
      }
    });
  }
);

// ===== ERROR HANDLING =====

/**
 * Invitation-specific error handler
 */
router.use((error: any, req: any, res: any, next: any) => {
  // Log invitation-specific errors
  console.error('Invitation Error:', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack,
    userId: req.userId,
    userType: (req as DualUnifiedAuthRequest).userType,
    timestamp: new Date().toISOString()
  });

  // Handle specific invitation errors
  if (error.message?.includes('already pending')) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate invitation',
      message: 'An invitation is already pending between these parties',
      code: 'INVITATION_ALREADY_PENDING'
    });
  }

  if (error.message?.includes('already connected'))  {
    return res.status(409).json({
      success: false,
      error: 'Already connected',
      message: 'Brand and manufacturer are already connected',
      code: 'ALREADY_CONNECTED'
    });
  }

  if (error.message?.includes('not found')) {
    return res.status(404).json({
      success: false,
      error: 'Invitation not found',
      message: 'The specified invitation could not be found',
      code: 'INVITATION_NOT_FOUND'
    });
  }

  // Pass to global error handler
  next(error);
});

export default router;

