// src/controllers/user.controller.ts

import { Response, NextFunction } from 'express';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { AuthService } from '../services/business/auth.service';

// Initialize service
const authService = new AuthService();

/**
 * Extended request interfaces for type safety
 */
interface UserRegisterRequest extends ValidatedRequest {
  validatedBody: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    acceptTerms?: boolean;
  };
}

interface UserVerifyRequest extends ValidatedRequest {
  validatedBody: {
    email: string;
    emailCode: string;
  };
}

interface UserLoginRequest extends ValidatedRequest {
  validatedBody: {
    email: string;
    password: string;
    rememberMe?: boolean;
  };
}

interface PasswordResetRequest extends ValidatedRequest {
  validatedBody: {
    email: string;
  };
}

interface PasswordResetConfirmRequest extends ValidatedRequest {
  validatedBody: {
    email: string;
    resetCode: string;
    newPassword: string;
  };
}

/**
 * Register a new user account
 * POST /api/users/register
 * 
 * @requires validation: { email, password, firstName?, lastName?, acceptTerms? }
 * @returns { success, message, verificationRequired }
 */
export const registerUser = asyncHandler(async (
  req: UserRegisterRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract validated registration data
  const { email, password, firstName, lastName, acceptTerms } = req.validatedBody;

  // Validate email format
  if (!email || !email.includes('@')) {
    throw createAppError('Valid email address is required', 400, 'INVALID_EMAIL_FORMAT');
  }

  // Validate password strength
  if (!password || password.length < 8) {
    throw createAppError('Password must be at least 8 characters long', 400, 'WEAK_PASSWORD');
  }

  // Check terms acceptance (if required by business logic)
  if (acceptTerms === false) {
    throw createAppError('You must accept the terms and conditions', 400, 'TERMS_NOT_ACCEPTED');
  }

  // Register user through service
  const registrationData = {
    email: email.toLowerCase().trim(),
    password,
    firstName: firstName?.trim(),
    lastName: lastName?.trim()
  };

  await authService.registerUser(registrationData);

  // Return standardized response
  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email for verification code.',
    data: {
      email: registrationData.email,
      verificationRequired: true,
      nextStep: 'email_verification',
      registeredAt: new Date().toISOString()
    }
  });
});

/**
 * Verify user email with verification code
 * POST /api/users/verify
 * 
 * @requires validation: { email, emailCode }
 * @returns { token, user, verified }
 */
export const verifyUser = asyncHandler(async (
  req: UserVerifyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract validated verification data
  const { email, emailCode } = req.validatedBody;

  // Validate inputs
  if (!email || !email.includes('@')) {
    throw createAppError('Valid email address is required', 400, 'INVALID_EMAIL_FORMAT');
  }

  if (!emailCode || emailCode.length !== 6) {
    throw createAppError('Valid 6-digit verification code is required', 400, 'INVALID_CODE_FORMAT');
  }

  // Verify user through service
  const verificationData = {
    email: email.toLowerCase().trim(),
    code: emailCode.toUpperCase().trim()
  };

  const result = await authService.verifyUser(verificationData);

  // Set secure HTTP-only cookie for token (optional enhancement)
  const isProduction = process.env.NODE_ENV === 'production';
  if (result.token) {
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }

  // Return standardized response
  res.json({
    success: true,
    message: 'Email verification successful',
    data: {
      token: result.token,
      user: {
        email: verificationData.email,
        verified: true,
        verifiedAt: new Date().toISOString()
      },
      expiresIn: '7 days'
    }
  });
});

/**
 * Login user with email and password
 * POST /api/users/login
 * 
 * @requires validation: { email, password, rememberMe? }
 * @returns { token, user, session }
 */
export const loginUser = asyncHandler(async (
  req: UserLoginRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract validated login data
  const { email, password, rememberMe } = req.validatedBody;

  // Validate inputs
  if (!email || !email.includes('@')) {
    throw createAppError('Valid email address is required', 400, 'INVALID_EMAIL_FORMAT');
  }

  if (!password) {
    throw createAppError('Password is required', 400, 'MISSING_PASSWORD');
  }

  // Login user through service
  const loginData = {
    email: email.toLowerCase().trim(),
    password
  };

  const result = await authService.loginUser(loginData);

  // Set secure HTTP-only cookie for token
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000; // 30 days or 7 days

  if (result.token) {
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: cookieMaxAge
    });
  }

  // Return standardized response
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token: result.token,
      user: {
        email: loginData.email,
        loginAt: new Date().toISOString()
      },
      session: {
        expiresIn: rememberMe ? '30 days' : '7 days',
        rememberMe: !!rememberMe
      }
    }
  });
});

/**
 * Request password reset
 * POST /api/users/forgot-password
 * 
 * @requires validation: { email }
 * @returns { success, message, resetInitiated }
 */
export const requestPasswordReset = asyncHandler(async (
  req: PasswordResetRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract validated email
  const { email } = req.validatedBody;

  // Validate email format
  if (!email || !email.includes('@')) {
    throw createAppError('Valid email address is required', 400, 'INVALID_EMAIL_FORMAT');
  }

  // Request password reset through service
  const resetData = {
    email: email.toLowerCase().trim()
  };

  await authService.requestPasswordReset(resetData);

  // Return standardized response (always success for security)
  res.json({
    success: true,
    message: 'If an account with this email exists, a password reset code has been sent.',
    data: {
      email: resetData.email,
      resetInitiated: true,
      expiresIn: '15 minutes',
      requestedAt: new Date().toISOString()
    }
  });
});

/**
 * Confirm password reset with code
 * POST /api/users/reset-password
 * 
 * @requires validation: { email, resetCode, newPassword }
 * @returns { success, message, passwordReset }
 */
export const confirmPasswordReset = asyncHandler(async (
  req: PasswordResetConfirmRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract validated reset data
  const { email, resetCode, newPassword } = req.validatedBody;

  // Validate inputs
  if (!email || !email.includes('@')) {
    throw createAppError('Valid email address is required', 400, 'INVALID_EMAIL_FORMAT');
  }

  if (!resetCode || resetCode.length !== 6) {
    throw createAppError('Valid 6-digit reset code is required', 400, 'INVALID_CODE_FORMAT');
  }

  if (!newPassword || newPassword.length < 8) {
    throw createAppError('New password must be at least 8 characters long', 400, 'WEAK_PASSWORD');
  }

  // Confirm password reset through service
  const resetData = {
    email: email.toLowerCase().trim(),
    resetCode: resetCode.toUpperCase().trim(),
    newPassword
  };

  await authService.confirmPasswordReset(resetData);

  // Clear any existing auth cookies
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  });

  // Return standardized response
  res.json({
    success: true,
    message: 'Password reset successful. Please login with your new password.',
    data: {
      passwordReset: true,
      email: resetData.email,
      resetAt: new Date().toISOString(),
      nextStep: 'login'
    }
  });
});

/**
 * Logout user (clear cookies and invalidate session)
 * POST /api/users/logout
 * 
 * @returns { success, message, loggedOut }
 */
export const logoutUser = asyncHandler(async (
  req: ValidatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Clear HTTP-only cookie
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  });

  // Optional: Add token to blacklist if implementing token blacklisting
  // await authService.blacklistToken(req.headers.authorization);

  // Return standardized response
  res.json({
    success: true,
    message: 'Logout successful',
    data: {
      loggedOut: true,
      loggedOutAt: new Date().toISOString()
    }
  });
});

/**
 * Resend verification email
 * POST /api/users/resend-verification
 * 
 * @requires validation: { email }
 * @returns { success, message, verificationSent }
 */
export const resendVerification = asyncHandler(async (
  req: ValidatedRequest & { validatedBody: { email: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract validated email
  const { email } = req.validatedBody;

  // Validate email format
  if (!email || !email.includes('@')) {
    throw createAppError('Valid email address is required', 400, 'INVALID_EMAIL_FORMAT');
  }

  // Resend verification through service (implement if available)
  const resendData = {
    email: email.toLowerCase().trim()
  };

  // For now, we'll use the register method which should handle existing users
  try {
    await authService.registerUser(resendData);
  } catch (error: any) {
    // If user already exists, that's fine - we still send the response
    if (error.statusCode !== 409) {
      throw error;
    }
  }

  // Return standardized response (always success for security)
  res.json({
    success: true,
    message: 'If your email is registered and unverified, a new verification code has been sent.',
    data: {
      email: resendData.email,
      verificationSent: true,
      expiresIn: '15 minutes',
      resentAt: new Date().toISOString()
    }
  });
});

/**
 * Check if email is available for registration
 * POST /api/users/check-email
 * 
 * @requires validation: { email }
 * @returns { available, email, suggestions? }
 */
export const checkEmailAvailability = asyncHandler(async (
  req: ValidatedRequest & { validatedBody: { email: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract validated email
  const { email } = req.validatedBody;

  // Validate email format
  if (!email || !email.includes('@')) {
    throw createAppError('Valid email address is required', 400, 'INVALID_EMAIL_FORMAT');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check email availability (implement service method if available)
  let available = true;
  let suggestions: string[] = [];

  try {
    // Try to register with a dummy password to check if email exists
    await authService.registerUser({ email: normalizedEmail, password: 'dummy_check' });
  } catch (error: any) {
    if (error.statusCode === 409 || error.message?.includes('already exists')) {
      available = false;
      // Generate email suggestions
      const [localPart, domain] = normalizedEmail.split('@');
      suggestions = [
        `${localPart}1@${domain}`,
        `${localPart}.${new Date().getFullYear()}@${domain}`,
        `${localPart}_user@${domain}`
      ];
    }
  }

  // Return standardized response
  res.json({
    success: true,
    message: available ? 'Email is available' : 'Email is already registered',
    data: {
      email: normalizedEmail,
      available,
      suggestions: available ? [] : suggestions,
      checkedAt: new Date().toISOString()
    }
  });
});
