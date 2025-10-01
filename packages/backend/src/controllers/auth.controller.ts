import { Request, Response, NextFunction } from 'express';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { logger } from '../utils/logger';
import { getServices } from '../services/container.service';
import {
  RegisterBusinessInput,
  VerifyBusinessInput,
  LoginBusinessInput,
  RegisterUserInput,
  VerifyUserInput,
  LoginUserInput,
  RegisterManufacturerInput,
  VerifyManufacturerInput,
  LoginManufacturerInput,
} from '../services/auth/types/authTypes.service';

interface ValidatedBodyRequest<T> extends Request, ValidatedRequest {
  validatedBody: T;
}

interface ResendVerificationBody {
  accountType: 'business' | 'user' | 'manufacturer';
  email?: string;
  businessId?: string;
  manufacturerId?: string;
}

interface ForgotPasswordBody {
  email: string;
}

interface ResetPasswordBody {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

const { auth: authService, notifications: notificationsService } = getServices();

export async function registerBusinessHandler(
  req: ValidatedBodyRequest<RegisterBusinessInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const registrationData = req.validatedBody;
    const securityContext = authService.extractSecurityContext(req);

    const result = await authService.registerBusiness({
      ...registrationData,
      securityContext,
    });

    if (notificationsService) {
      const fullName = `${registrationData.firstName} ${registrationData.lastName}`.trim();
      notificationsService
        .sendWelcomeEmail(registrationData.email, fullName || 'Business Owner', 'brand')
        .catch(error =>
          logger.warn('Failed to send business welcome email', {
            email: registrationData.email,
            error: error instanceof Error ? error.message : error,
          })
        );
    }

    res.status(201).json({
      message: 'Business registered successfully. Please verify your email.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function registerManufacturerHandler(
  req: ValidatedBodyRequest<RegisterManufacturerInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const registrationData = req.validatedBody;
    const securityContext = authService.extractSecurityContext(req);

    const result = await authService.registerManufacturer({
      ...registrationData,
      securityContext,
    });

    if (notificationsService) {
      notificationsService
        .sendWelcomeEmail(
          registrationData.email,
          registrationData.name || 'Manufacturer',
          'manufacturer'
        )
        .catch(error =>
          logger.warn('Failed to send manufacturer welcome email', {
            email: registrationData.email,
            error: error instanceof Error ? error.message : error,
          })
        );
    }

    res.status(201).json({
      message: 'Manufacturer registered successfully. Please verify your email.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyManufacturerHandler(
  req: ValidatedBodyRequest<VerifyManufacturerInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const securityContext = authService.extractSecurityContext(req);

    const result = await authService.verifyManufacturer({
      ...req.validatedBody,
      securityContext,
    });

    res.json({
      message: 'Manufacturer verified successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function loginManufacturerHandler(
  req: ValidatedBodyRequest<LoginManufacturerInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const securityContext = authService.extractSecurityContext(req);

    const result = await authService.loginManufacturer({
      ...req.validatedBody,
      securityContext,
    });

    if (result.rememberToken) {
      res.cookie('remember_token', result.rememberToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    res.json({
      message: 'Login successful.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyBusinessHandler(
  req: ValidatedBodyRequest<VerifyBusinessInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const securityContext = authService.extractSecurityContext(req);

    const result = await authService.verifyBusiness({
      ...req.validatedBody,
      securityContext,
    });

    res.json({
      message: 'Business verified successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function loginBusinessHandler(
  req: ValidatedBodyRequest<LoginBusinessInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const securityContext = authService.extractSecurityContext(req);

    const result = await authService.loginBusiness({
      ...req.validatedBody,
      securityContext,
    });

    if (result.rememberToken) {
      res.cookie('remember_token', result.rememberToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    const responsePayload = authService.formatAuthResponse(result, securityContext);

    res.json({
      message: 'Login successful.',
      data: responsePayload,
    });
  } catch (error) {
    next(error);
  }
}

export async function registerUserHandler(
  req: ValidatedBodyRequest<RegisterUserInput> & { params?: { brandSlug?: string } },
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const registrationData = req.validatedBody;
    const securityContext = authService.extractSecurityContext(req);

    const brandSlug = req.params?.brandSlug ?? (req as any).brandSlug;
    const registrationPayload = {
      ...registrationData,
      brandSlug: registrationData.brandSlug ?? brandSlug,
      securityContext,
    };

    const result = await authService.registerUser(registrationPayload);

    if (notificationsService) {
      notificationsService
        .sendWelcomeEmail(
          registrationData.email,
          registrationData.firstName || 'User',
          'user'
        )
        .catch(error =>
          logger.warn('Failed to send user welcome email', {
            email: registrationData.email,
            error: error instanceof Error ? error.message : error,
          })
        );
    }

    res.status(201).json({
      message: 'User registered successfully. Please verify your email.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyUserHandler(
  req: ValidatedBodyRequest<VerifyUserInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const securityContext = authService.extractSecurityContext(req);

    const result = await authService.verifyUser({
      ...req.validatedBody,
      securityContext,
    });

    res.json({
      message: 'Email verification successful.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function loginUserHandler(
  req: ValidatedBodyRequest<LoginUserInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const securityContext = authService.extractSecurityContext(req);

    const result = await authService.loginUser({
      ...req.validatedBody,
      securityContext,
    });

    res.json({
      message: 'Login successful.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function resendVerificationHandler(
  req: ValidatedBodyRequest<ResendVerificationBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { accountType, email, businessId, manufacturerId } = req.validatedBody;

    if (accountType === 'business') {
      await authService.resendBusinessVerification(businessId!);
    } else if (accountType === 'manufacturer') {
      await authService.resendManufacturerVerification(manufacturerId!);
    } else {
      await authService.resendUserVerification(email!);
    }

    res.json({
      message: 'Verification code sent successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPasswordHandler(
  req: ValidatedBodyRequest<ForgotPasswordBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.validatedBody;
    const securityContext = authService.extractSecurityContext(req);

    await authService.requestPasswordReset({
      email,
      securityContext,
    });

    res.json({
      message: 'If an account with that email exists, you will receive password reset instructions shortly.',
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPasswordHandler(
  req: ValidatedBodyRequest<ResetPasswordBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token, newPassword, confirmPassword } = req.validatedBody;
    const securityContext = authService.extractSecurityContext(req);

    await authService.resetPassword({
      token,
      newPassword,
      confirmPassword,
      securityContext,
    });

    res.json({
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
}
