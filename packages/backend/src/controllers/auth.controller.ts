// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { AuthService } from '../services/business/auth.service';
import { ManufacturerService } from '../services/business/manufacturer.service';
import { NotificationsService } from '../services/external/notifications.service';
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

interface BusinessAuthRequest extends AuthControllerRequest {
  body: RegisterBusinessInput | VerifyBusinessInput | LoginBusinessInput;
}

interface UserAuthRequest extends AuthControllerRequest {
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

// Initialize services
const authService = new AuthService();
const manufacturerService = new ManufacturerService();
const notificationsService = new NotificationsService();

/**
 * POST /api/auth/register/business
 * Enhanced business registration with security features and validation
 */
export async function registerBusinessHandler(
  req: BusinessAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const registrationData = req.validatedBody || req.body;
    
    // Add security context
    const securityContext = {
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      registrationSource: 'web',
      timestamp: new Date()
    };

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
    console.log(`Business registration: ${result.businessId} from IP: ${securityContext.ipAddress}`);

 res.status(201).json({
  businessId: result.businessId,
  message: 'Business registered successfully. Please check your email for verification instructions.',
  nextStep: 'email_verification',
  estimatedVerificationTime: '5-10 minutes'
});
} catch (error) {
  // Enhanced error logging with context
  console.error('Business registration error:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    ip: getClientIp(req),
    email: (req.body as any)?.email, // ← Use type assertion
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
  req: BusinessAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const verificationData = req.validatedBody || req.body;
    
    // Add security context for verification tracking
    const securityContext = {
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      verificationAttempt: true,
      timestamp: new Date()
    };

    // Enhanced verification with attempt tracking
    const result = await authService.verifyBusiness({
      ...verificationData,
      securityContext
    });

    // Log successful verification
    console.log(`Business verified: ${verificationData.businessId} from IP: ${securityContext.ipAddress}`);

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
  console.warn('Business verification failed:', {
    businessId: (req.body as any)?.businessId, // ← Use type assertion
    ip: getClientIp(req),
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
  req: BusinessAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const loginData = req.validatedBody || req.body;
    
    // Enhanced security context
    const securityContext = {
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      loginAttempt: true,
      timestamp: new Date(),
      deviceFingerprint: req.body.deviceFingerprint
    };

    // Enhanced login with security checks
    const result = await authService.loginBusiness({
      ...loginData,
      securityContext
    });

    // Log successful login
    console.log(`Business login: ${result.businessId} from IP: ${securityContext.ipAddress}`);

    // Set secure cookie if remember me is enabled
    if (loginData.rememberMe) {
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
        businessId: result.businessId,
        email: result.email,
        businessName: result.businessName,
        isEmailVerified: result.isEmailVerified,
        plan: result.plan || 'foundation',
        lastLoginAt: new Date()
      },
      security: {
        requiresTwoFactor: result.requiresTwoFactor || false,
        loginLocation: await getLocationFromIp(securityContext.ipAddress)
      }
    });
  } catch (error) {
    // Enhanced error logging for security monitoring
    console.warn('Business login failed:', {
      identifier: req.body?.emailOrPhone,
      ip: getClientIp(req),
      error: error.message,
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
  req: UserAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const registrationData = req.validatedBody || req.body;
    
    // Add security context
    const securityContext = {
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      registrationSource: 'web',
      timestamp: new Date()
    };

    // Enhanced user registration
    await authService.registerUser({
      ...registrationData,
      securityContext
    });

    // Send welcome email
    await notificationsService.sendWelcomeEmail(
      registrationData.email,
      registrationData.firstName || 'User',
      'customer'
    );

    // Log successful registration
    console.log(`User registration: ${registrationData.email} from IP: ${securityContext.ipAddress}`);

    res.status(201).json({
      message: 'User registered successfully. Please check your email for verification instructions.',
      nextStep: 'email_verification',
      email: registrationData.email
    });
  } catch (error) {
    console.error('User registration error:', {
      error: error.message,
      ip: getClientIp(req),
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
  req: UserAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const verificationData = req.validatedBody || req.body;
    
    // Add security context
    const securityContext = {
      ipAddress: getClientIp(req),
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
    console.log(`User verified: ${verificationData.email} from IP: ${securityContext.ipAddress}`);

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
    console.warn('User verification failed:', {
      email: req.body?.email,
      ip: getClientIp(req),
      error: error.message,
      timestamp: new Date()
    });
    
    next(error);
  }
}

/**
 * POST /api/auth/login/user
 * Enhanced user login with security features
 */
export async function loginUserHandler(
  req: UserAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const loginData = req.validatedBody || req.body;
    
    // Enhanced security context
    const securityContext = {
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      loginAttempt: true,
      timestamp: new Date(),
      deviceFingerprint: req.body.deviceFingerprint
    };

    // Enhanced login
    const result = await authService.loginUser({
      ...loginData,
      securityContext
    });

    // Log successful login
    console.log(`User login: ${loginData.email} from IP: ${securityContext.ipAddress}`);

    // Set secure cookie if remember me is enabled
    if (loginData.rememberMe) {
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
    console.warn('User login failed:', {
      email: req.body?.email,
      ip: getClientIp(req),
      error: error.message,
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
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      timestamp: new Date()
    };

    // Initiate password reset
    await authService.initiateForgotPassword({
      email,
      phone,
      securityContext
    });

    // Always return success to prevent email enumeration
    res.json({
      message: 'If an account with that email exists, you will receive password reset instructions.',
      nextStep: 'check_email'
    });
  } catch (error) {
    // Log for security monitoring but don't expose details
    console.warn('Password reset attempt:', {
      identifier: req.body?.email || req.body?.phone,
      ip: getClientIp(req),
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
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      timestamp: new Date()
    };

    // Complete password reset
    await authService.resetPassword({
      ...resetData,
      securityContext
    });

    // Log successful password reset
    console.log(`Password reset completed from IP: ${securityContext.ipAddress}`);

    res.json({
      message: 'Password reset successfully. You can now login with your new password.',
      nextStep: 'login'
    });
  } catch (error) {
    console.warn('Password reset failed:', {
      token: req.body?.token?.substring(0, 8) + '...',
      ip: getClientIp(req),
      error: error.message,
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
  req: AuthRequest,
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
    console.log(`User logout: ${userId} from IP: ${getClientIp(req)}`);

    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    next(error);
  }
}

/**
 * POST /api/auth/refresh
 * Refresh JWT token with enhanced security
 */
export async function refreshTokenHandler(
  req: AuthRequest,
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
    console.error('Token refresh error:', error);
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Get current user information with enhanced details
 */
export async function getCurrentUserHandler(
  req: AuthRequest,
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
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent']
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    next(error);
  }
}

// Helper functions
function getClientIp(req: Request): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown'
  ).split(',')[0].trim();
}

async function getLocationFromIp(ip: string): Promise<{ country?: string; city?: string }> {
  try {
    // This would integrate with a geolocation service
    // For now, return basic info
    return {
      country: 'Unknown',
      city: 'Unknown'
    };
  } catch (error) {
    return {};
  }
}



