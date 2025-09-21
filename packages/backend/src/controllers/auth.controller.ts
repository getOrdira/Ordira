// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { AuthService } from '../services/business/auth.service';
import { ManufacturerService } from '../services/business/manufacturer.service';
import { NotificationsService } from '../services/external/notifications.service';
import { getRequestBody, safeString, safeBoolean } from '../utils/typeGuards';
import { 
  RegisterBusinessInput,
  VerifyBusinessInput,
  LoginBusinessInput,
  RegisterUserInput,
  VerifyUserInput,
  LoginUserInput
} from '../services/business/auth.service';

// Enhanced request interfaces
interface AuthControllerRequest extends Request, ValidatedRequest {
  ip: string;
  headers: {
    'user-agent'?: string;
    'x-forwarded-for'?: string;
    'x-real-ip'?: string;
  };
}

interface LoginUserRequest extends Request, UnifiedAuthRequest, ValidatedRequest {
  body: LoginUserInput;
  validatedBody?: LoginUserInput;
}


interface BusinessUnifiedAuthRequest extends AuthControllerRequest {
  body: RegisterBusinessInput | VerifyBusinessInput | LoginBusinessInput;
}

interface UserUnifiedAuthRequest extends AuthControllerRequest {
  body: RegisterUserInput | VerifyUserInput | LoginUserInput;
}

interface PasswordResetRequest extends AuthControllerRequest {
  body: {
    email?: string;
    phone?: string;
    token?: string;
    newPassword?: string;
    confirmPassword?: string;
  };
}

interface RevokeAllSessionsRequest extends Request, UnifiedAuthRequest, ValidatedRequest {
  validatedBody: {
    currentPassword: string;
    reason?: string;
  };
}

interface ChangePasswordRequest extends Request, UnifiedAuthRequest, ValidatedRequest {
  validatedBody: {
    currentPassword: string;
    newPassword: string;
  };
}

interface UpdateSecurityPreferencesRequest extends Request, UnifiedAuthRequest, ValidatedRequest {
  validatedBody: {
    twoFactorEnabled?: boolean;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    loginNotifications?: boolean;
    ipWhitelist?: string[];
    sessionTimeout?: number;
    passwordChangeRequired?: boolean;
    allowedDevices?: string[];
  };
}

// Initialize services
const authService = new AuthService();
const manufacturerService = new ManufacturerService();
const notificationsService = new NotificationsService();

/**
 * POST /api/auth/register/business
 * Enhanced business registration with security features and validation
 */
export async function registerBusinessHandler(
  req: BusinessUnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const registrationData = req.validatedBody || req.body;
    
    // Add security context
    const securityContext = authService.createSecurityContext(req, {
      registrationSource: 'web'
    });

    // Enhanced registration with security logging
    const result = await authService.registerBusiness({
      ...registrationData,
      securityContext
    });

    // Send welcome email if registration successful
    if (result.businessId) {
      await notificationsService.sendWelcomeEmail(
        registrationData.email,
        `${registrationData.firstName} ${registrationData.lastName}`,
        'brand'
      );
    }

    // Log successful registration for analytics
    logger.info('Business registration: ${result.businessId} from IP: ${securityContext.ipAddress}');

 res.status(201).json({
  businessId: result.businessId,
  message: 'Business registered successfully. Please check your email for verification instructions.',
  nextStep: 'email_verification',
  estimatedVerificationTime: '5-10 minutes'
});
} catch (error) {
  // Enhanced error logging with context
  logger.error('Business registration error:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    ip: authService.getClientIp(req),
    email: safeString(getRequestBody(req)?.email),
    timestamp: new Date()
  });
  
  next(error);
}
}

/**
 * POST /api/auth/verify/business
 * Enhanced business verification with attempt tracking
 */
export async function verifyBusinessHandler(
  req: BusinessUnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const verificationData = req.validatedBody || req.body;
    
    // Add security context for verification tracking
    const securityContext = authService.createSecurityContext(req, {
      verificationAttempt: true
    });

    // Enhanced verification with attempt tracking
    const result = await authService.verifyBusiness({
      ...verificationData,
      securityContext
    });

    // Log successful verification
    logger.info('Business verified: ${verificationData.businessId} from IP: ${securityContext.ipAddress}');

    res.json({
  token: result.token,
  message: 'Business account verified successfully',
  expiresIn: '7 days',
  user: {
    businessId: verificationData.businessId,
    verified: true,
    verifiedAt: new Date()
  }
});
} catch (error) {
  // Log failed verification attempts for security
  logger.warn('Business verification failed:', {
    businessId: safeString(getRequestBody(req)?.businessId),
    ip: authService.getClientIp(req),
    error: error instanceof Error ? error.message : 'Unknown error',
    timestamp: new Date()
  });
  
  next(error);
}
}

/**
 * POST /api/auth/login/business
 * Enhanced business login with security features
 */
export async function loginBusinessHandler(
  req: BusinessUnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const loginData = req.validatedBody || req.body as LoginBusinessInput;
    
    // Enhanced security context
    const securityContext = authService.createSecurityContext(req, {
      loginAttempt: true,
      deviceFingerprint: safeString(getRequestBody(req)?.deviceFingerprint)
    });

    // Enhanced login with security checks
    const result = await authService.loginBusiness({
      ...loginData,
      securityContext
    });

    // Log successful login
    logger.info('Business login successful from IP: ${securityContext.ipAddress}', {
      token: result.token ? 'present' : 'missing',
      timestamp: new Date(),
      userAgent: securityContext.userAgent
    });

    // Set secure cookie if remember me is enabled
    if (loginData.rememberMe) {
      res.cookie('remember_token', result.rememberToken, authService.getRememberTokenCookieOptions());
    }

    res.json(authService.formatAuthResponse(result, securityContext));
  } catch (error) {
    // Enhanced error logging for security monitoring
    logger.warn('Business login failed:', {
      identifier: (req.body as LoginBusinessInput)?.emailOrPhone,
      ip: authService.getClientIp(req),
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
    
    next(error);
  }
}

/**
 * POST /api/auth/register/user
 * Enhanced user registration with validation and security
 */
export async function registerUserHandler(
  req: UserUnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const registrationData = req.validatedBody || req.body;
    const userType = 'user';
    
    // Add security context
    const securityContext = authService.createSecurityContext(req, {
      registrationSource: 'web'
    });

    // Enhanced user registration
    await authService.registerUser({
      ...registrationData,
      securityContext
    });

    // Send welcome email
    await notificationsService.sendWelcomeEmail(
      registrationData.email,
      registrationData.firstName || 'User',
      userType
    );

    // Log successful registration
    logger.info('User registration: ${registrationData.email} from IP: ${securityContext.ipAddress}');

    res.status(201).json({
  message: 'User registered successfully. Please check your email for verification instructions.',
  nextStep: 'email_verification',
  email: registrationData.email
});
} catch (error) {
  logger.error('User registration error:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    ip: authService.getClientIp(req),
    email: req.body?.email,
    timestamp: new Date()
  });
  
  next(error);
}
}

/**
 * POST /api/auth/verify/user
 * Enhanced user verification with attempt tracking
 */
export async function verifyUserHandler(
  req: UserUnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const verificationData = req.validatedBody || req.body;
    
    // Add security context
    const securityContext = {
      ipAddress: authService.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      verificationAttempt: true,
      timestamp: new Date()
    };

    // Enhanced verification
    const result = await authService.verifyUser({
      ...verificationData,
      securityContext
    });

    // Log successful verification
    logger.info('User verified: ${verificationData.email} from IP: ${securityContext.ipAddress}');

    res.json({
  token: result.token,
  message: 'Email verified successfully',
  expiresIn: '7 days',
  user: {
    email: verificationData.email,
    verified: true,
    verifiedAt: new Date()
  }
});
} catch (error) {
  logger.warn('User verification failed:', {
    email: req.body?.email,
    ip: authService.getClientIp(req),
    error: error instanceof Error ? error.message : 'Unknown error',
    timestamp: new Date()
  });
  
  next(error);
}
}

/**
 * POST /api/auth/change-password
 * Change password for authenticated users
 */
export async function changePasswordHandler(
  req: ChangePasswordRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { currentPassword, newPassword } = req.validatedBody || req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS'
      });
      return;
    }

    // Get security context
    const securityContext = {
      ipAddress: authService.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      timestamp: new Date()
    };

    // Change password through service
    await authService.changePassword(userId, {
      currentPassword,
      newPassword,
      securityContext
    });

    // Log successful password change
    logger.info('Password changed for user ${userId} from IP: ${securityContext.ipAddress}');

    res.json({
      message: 'Password changed successfully',
      changedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Change password error:', error);
    next(error);
  }
}

/**
 * POST /api/auth/resend-verification
 * Resend verification code
 */
export async function resendVerificationHandler(
  req: AuthControllerRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, businessId, type } = req.validatedBody || req.body;

    if (!email && !businessId) {
      res.status(400).json({
        error: 'Email or business ID is required',
        code: 'MISSING_IDENTIFIER'
      });
      return;
    }

    const securityContext = {
      ipAddress: authService.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      timestamp: new Date()
    };

    if (businessId || type === 'business') {
      await authService.resendBusinessVerification(businessId);
    } else {
      await authService.resendUserVerification(email);
    }

    // Log resend attempt
    logger.info('Verification resent from IP: ${securityContext.ipAddress}', {
      identifier: email || businessId,
      type: type || 'user'
    });

    res.json({
      message: 'Verification code sent successfully',
      nextStep: 'check_email',
      estimatedDelivery: '2-5 minutes'
    });
  } catch (error) {
    logger.error('Resend verification error:', error);
    next(error);
  }
}

/**
 * POST /api/auth/check-email
 * Check if email is available for registration
 */
export async function checkEmailAvailabilityHandler(
  req: AuthControllerRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.validatedBody || req.body;

    if (!email) {
      res.status(400).json({
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      });
      return;
    }

    const availability = await authService.checkEmailAvailability(email);

    res.json({
      email,
      available: availability.available,
      reason: availability.reason,
      suggestions: availability.suggestions || []
    });
  } catch (error) {
    logger.error('Check email availability error:', error);
    next(error);
  }
}

/**
 * POST /api/auth/validate-password
 * Validate password strength
 */
export async function validatePasswordStrengthHandler(
  req: AuthControllerRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { password } = req.validatedBody || req.body;

    if (!password) {
      res.status(400).json({
        error: 'Password is required',
        code: 'MISSING_PASSWORD'
      });
      return;
    }

    const validation = authService.validatePasswordStrength(password);

    res.json({
      password: '***', // Never return the actual password
      strength: validation.strength,
      score: validation.score,
      feedback: validation.feedback,
      requirements: validation.requirements,
      isValid: validation.isValid
    });
  } catch (error) {
    logger.error('Validate password error:', error);
    next(error);
  }
}

/**
 * GET /api/auth/sessions
 * Get active sessions for authenticated user
 */
export async function getActiveSessionsHandler(
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    
    // Get active sessions from service
    const sessions = await authService.getActiveSessions(userId);

    // Add current session indicator
    const currentToken = req.headers.authorization?.split(' ')[1];
    const enhancedSessions = sessions.map((session: any) => ({
      ...session,
      isCurrent: session.token === currentToken,
      location: {
        ip: session.ipAddress,
        // You could add geolocation here
        country: 'Unknown',
        city: 'Unknown'
      }
    }));

    res.json({
      sessions: enhancedSessions,
      totalSessions: enhancedSessions.length,
      currentSession: enhancedSessions.find((s: any) => s.isCurrent)
    });
  } catch (error) {
    logger.error('Get active sessions error:', error);
    next(error);
  }
}

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revoke specific session
 */
export async function revokeSessionHandler(
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { sessionId } = req.params;

    if (!sessionId) {
      res.status(400).json({
        error: 'Session ID is required',
        code: 'MISSING_SESSION_ID'
      });
      return;
    }

    await authService.revokeSession(userId, sessionId);

    // Log session revocation
    logger.info('Session revoked: ${sessionId} by user ${userId} from IP: ${authService.getClientIp(req)}');

    res.json({
      message: 'Session revoked successfully',
      sessionId,
      revokedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Revoke session error:', error);
    next(error);
  }
}

/**
 * POST /api/auth/sessions/revoke-all
 * Revoke all sessions except current
 */
export async function revokeAllSessionsHandler(
  req: RevokeAllSessionsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { currentPassword, reason } = req.validatedBody || req.body;
    const currentToken = req.headers.authorization?.split(' ')[1];

    if (!currentPassword) {
      res.status(400).json({
        error: 'Current password is required for security',
        code: 'MISSING_PASSWORD'
      });
      return;
    }

    // Verify password before revoking sessions
    const isValidPassword = await authService.verifyUserPassword(userId, currentPassword);
    if (!isValidPassword) {
      res.status(401).json({
        error: 'Invalid password',
        code: 'INVALID_PASSWORD'
      });
      return;
    }

    const revokedCount = await authService.revokeAllSessions(userId, currentToken);

    // Log mass session revocation
    logger.info('All sessions revoked for user ${userId} from IP: ${authService.getClientIp(req)}', {
      revokedCount,
      reason: reason || 'user_request'
    });

    res.json({
      message: 'All other sessions revoked successfully',
      revokedCount,
      reason: reason || 'user_request',
      revokedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Revoke all sessions error:', error);
    next(error);
  }
}

/**
 * GET /api/auth/login-history
 * Get login history for authenticated user
 */
export async function getLoginHistoryHandler(
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    const history = await authService.getLoginHistory(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    res.json({
      loginHistory: history.entries,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: history.total,
        pages: Math.ceil(history.total / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Get login history error:', error);
    next(error);
  }
}

/**
 * GET /api/auth/security-events
 * Get security events for authenticated user
 */
export async function getSecurityEventsHandler(
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { page = 1, limit = 20, eventType } = req.query;

    const events = await authService.getSecurityEvents(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      eventType: eventType as string
    });

    res.json({
      securityEvents: events.entries,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: events.total,
        pages: Math.ceil(events.total / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Get security events error:', error);
    next(error);
  }
}

/**
 * PUT /api/auth/security-preferences
 * Update security preferences
 */
export async function updateSecurityPreferencesHandler(
  req: UpdateSecurityPreferencesRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const preferences = req.validatedBody || req.body;

    const updatedPreferences = await authService.updateSecurityPreferences(userId, preferences);

    // Log security preference update
    logger.info('Security preferences updated for user ${userId} from IP: ${authService.getClientIp(req)}');

    res.json({
      message: 'Security preferences updated successfully',
      preferences: updatedPreferences,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Update security preferences error:', error);
    next(error);
  }
}

/**
 * POST /api/auth/login/user
 * Enhanced user login with security features
 */
export async function loginUserHandler(
  req: UserUnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const loginData = req.validatedBody || req.body;
    
    // Validate required fields
    if (!loginData || !loginData.email || !loginData.password) {
      res.status(400).json({ 
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
      return;
    }

    // Safely extract properties
    const email = loginData.email;
    const password = loginData.password;
    const rememberMe = safeBoolean(getRequestBody(req)?.rememberMe, false);
    const deviceFingerprint = safeString(getRequestBody(req)?.deviceFingerprint);
    
    // Enhanced security context
    const securityContext = {
      ipAddress: authService.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      loginAttempt: true,
      timestamp: new Date(),
      deviceFingerprint
    };

    // Enhanced login
    const result = await authService.loginUser({
      email,
      password,
      rememberMe,
      securityContext
    });

    // Log successful login
    logger.info('User login: ${email} from IP: ${securityContext.ipAddress}');

    // Set secure cookie if remember me is enabled
    if (rememberMe && result.rememberToken) {
      res.cookie('remember_token', result.rememberToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
    }

    res.json({
      token: result.token,
      expiresIn: '7 days',
      user: {
        userId: result.userId,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        isEmailVerified: result.isEmailVerified,
        preferences: result.preferences,
        lastLoginAt: new Date()
      }
    });
  } catch (error) {
    logger.warn('User login failed:', {
      email: safeString(getRequestBody(req)?.email), 
      ip: authService.getClientIp(req),
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
    
    next(error);
  }
}
/**
 * POST /api/auth/forgot-password
 * Initiate password reset process with enhanced security
 */
export async function forgotPasswordHandler(
  req: PasswordResetRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, phone } = req.validatedBody || req.body;
    
    const securityContext = {
      ipAddress: authService.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      timestamp: new Date()
    };

    // Initiate password reset
    await authService.initiatePasswordReset({
      email,
      securityContext
    });

    // Always return success to prevent email enumeration
    res.json({
      message: 'If an account with that email exists, you will receive password reset instructions.',
      nextStep: 'check_email'
    });
  } catch (error) {
    // Log for security monitoring but don't expose details
    logger.warn('Password reset attempt:', {
      identifier: req.body?.email || req.body?.phone,
      ip: authService.getClientIp(req),
      timestamp: new Date()
    });
    
    // Always return success to prevent enumeration attacks
    res.json({
      message: 'If an account with that email exists, you will receive password reset instructions.',
      nextStep: 'check_email'
    });
  }
}

/**
 * POST /api/auth/reset-password
 * Complete password reset with token validation
 */
export async function resetPasswordHandler(
  req: PasswordResetRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const resetData = req.validatedBody || req.body;
    
    const securityContext = {
      ipAddress: authService.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      timestamp: new Date()
    };

    // Complete password reset
    await authService.confirmPasswordReset({
      ...resetData,
      securityContext
    });

    // Log successful password reset
    logger.info('Password reset completed from IP: ${securityContext.ipAddress}');

    res.json({
      message: 'Password reset successfully. You can now login with your new password.',
      nextStep: 'login'
    });
  } catch (error) {
  logger.warn('Password reset failed:', {
    token: req.body?.token?.substring(0, 8) + '...',
    ip: authService.getClientIp(req),
    error: error instanceof Error ? error.message : 'Unknown error',
    timestamp: new Date()
  });
  
  next(error);
}
}

/**
 * POST /api/auth/logout
 * Enhanced logout with token invalidation
 */
export async function logoutHandler(
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;
    const token = req.headers.authorization?.split(' ')[1];

    if (token && userId) {
      // Invalidate the token
      await authService.invalidateToken(token, userId);
    }

    // Clear remember me cookie
    res.clearCookie('remember_token');

    // Log logout
    logger.info('User logout: ${userId} from IP: ${authService.getClientIp(req)}');

    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    next(error);
  }
}

/**
 * POST /api/auth/refresh
 * Refresh JWT token with enhanced security
 */
export async function refreshTokenHandler(
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const currentToken = req.headers.authorization?.split(' ')[1];

    if (!currentToken) {
       res.status(401).json({
        error: 'No token provided',
        code: 'MISSING_TOKEN'
      })
      return;
    }

    // Generate new token
    const newToken = await authService.refreshToken(currentToken, userId);

    res.json({
      token: newToken,
      expiresIn: '7 days',
      refreshedAt: new Date()
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Get current user information with enhanced details
 */
export async function getCurrentUserHandler(
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    
    // Get comprehensive user information
    const userInfo = await authService.getCurrentUser(userId);

    res.json({
      user: userInfo,
      permissions: userInfo.permissions || [],
      lastActivity: new Date(),
      sessionInfo: {
        ipAddress: authService.getClientIp(req),
        userAgent: req.headers['user-agent']
      }
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    next(error);
  }
}




