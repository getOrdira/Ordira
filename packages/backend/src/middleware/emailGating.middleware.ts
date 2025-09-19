// @ts-nocheck
// src/middleware/emailGating.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { EmailGatingService } from '../services/business/emailGating.service';
import { AuthRequest } from './auth.middleware';

const emailGatingService = new EmailGatingService();

export interface EmailGatingResult {
  allowed: boolean;
  reason?: string;
  customer?: any;
  settings?: any;
}

export interface EmailGatingRequest extends Request {
  emailGating?: EmailGatingResult;
  user?: {
    email?: string;
    id?: string;
  };
}

/**
 * Middleware to check email gating for voting access
 * Use this on voting endpoints to enforce email restrictions
 */
export async function checkEmailGating(
  req: EmailGatingRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  try {
    // Extract email from request (could be from user or body)
    const email = req.body.email || req.user?.email;
    const businessId = req.body.businessId || req.params.businessId;

    if (!email || !businessId) {
      return next(); // Skip check if no email or business context
    }

    // Check if email is allowed
    const result = await emailGatingService.isEmailAllowed(email, businessId);
    
    // Attach result to request for use in controllers
    req.emailGating = result;

    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: result.reason || 'Your email is not authorized to access this voting campaign',
        code: 'EMAIL_ACCESS_DENIED',
        details: {
          email,
          reason: result.reason,
          accessDeniedMessage: result.settings?.accessDeniedMessage
        }
      });
    }

    // Record access if customer exists
    if (result.customer) {
     await emailGatingService.grantVotingAccess(email, businessId, req.user?.id);
    }

    next();
  } catch (error) {
    logger.error('Email gating check error:', error);
    // On error, allow access (fail open) but log the issue
    req.emailGating = { allowed: true, reason: 'Check failed - allowed by default' };
    next();
  }
}

/**
 * Optional middleware to log email gating attempts
 */
export function logEmailGatingAttempt(
  req: EmailGatingRequest,
  res: Response,
  next: NextFunction
): void {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log the attempt result
    if (req.emailGating) {
      logger.info(`Email gating check: ${req.emailGating.allowed ? 'ALLOWED' : 'DENIED'} - ${req.body.email || 'no email'}`);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}
