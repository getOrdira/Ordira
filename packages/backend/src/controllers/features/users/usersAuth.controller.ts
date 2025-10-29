// src/controllers/features/users/usersAuth.controller.ts
// Controller exposing user authentication flows

import { Response } from 'express';
import { UsersBaseController, UsersBaseRequest } from './usersBase.controller';
import type { CreateUserData } from '../../../services/users';

interface RegisterUserRequest extends UsersBaseRequest {
  validatedBody?: Partial<CreateUserData> & {
    password?: string;
  };
}

interface LoginUserRequest extends UsersBaseRequest {
  validatedBody?: {
    email?: string;
    password?: string;
  };
}

interface VerifyUserEmailRequest extends UsersBaseRequest {
  validatedBody?: {
    userId?: string;
    verificationToken?: string;
  };
  validatedParams?: {
    userId?: string;
    token?: string;
  };
  validatedQuery?: {
    token?: string;
  };
}

/**
 * UsersAuthController maps HTTP requests to the user authentication service.
 */
export class UsersAuthController extends UsersBaseController {
  /**
   * Register a new platform user.
   */
  async registerUser(req: RegisterUserRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'USERS_REGISTER');

      const payload = this.sanitizeInput(req.validatedBody ?? (req.body as any) ?? {});

      const normalized: CreateUserData = {
        firstName: String(payload.firstName ?? '').trim(),
        lastName: String(payload.lastName ?? '').trim(),
        email: String(payload.email ?? '').trim().toLowerCase(),
        password: String(payload.password ?? ''),
        phoneNumber: payload.phoneNumber ? String(payload.phoneNumber).trim() : undefined,
        dateOfBirth: payload.dateOfBirth ? this.parseDate(payload.dateOfBirth) : undefined,
        preferences: payload.preferences,
      };

      if (!normalized.email || !normalized.password) {
        throw {
          statusCode: 400,
          message: 'Email and password are required for registration',
        };
      }

      if (!normalized.firstName || !normalized.lastName) {
        throw {
          statusCode: 400,
          message: 'First name and last name are required for registration',
        };
      }

      const registeredUser = await this.userAuthService.registerUser(normalized);
      const profile = this.userFormatterService.format(registeredUser as any);

      this.logAction(req, 'USERS_REGISTER_SUCCESS', {
        userId: profile.id,
        email: profile.email,
      });

      return {
        user: profile,
        registeredAt: new Date().toISOString(),
      };
    }, res, 'User registered successfully', this.getRequestMeta(req));
  }

  /**
   * Authenticate an existing user and issue a session token.
   */
  async loginUser(req: LoginUserRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'USERS_LOGIN');

      const payload = this.sanitizeInput(req.validatedBody ?? (req.body as any) ?? {});

      const email = String(payload.email ?? '').trim().toLowerCase();
      const password = String(payload.password ?? '');

      if (!email || !password) {
        throw {
          statusCode: 400,
          message: 'Email and password are required to log in',
        };
      }

      const result = await this.userAuthService.loginUser(email, password);
      const profile = this.userFormatterService.format(result.user as any);

      this.logAction(req, 'USERS_LOGIN_SUCCESS', {
        userId: profile.id,
        email: profile.email,
      });

      return {
        token: result.token,
        user: profile,
        authenticatedAt: new Date().toISOString(),
      };
    }, res, 'User authenticated successfully', this.getRequestMeta(req));
  }

  /**
   * Verify a pending user email address.
   */
  async verifyUserEmail(req: VerifyUserEmailRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'USERS_VERIFY_EMAIL');

      const userId =
        req.validatedBody?.userId ??
        req.validatedParams?.userId ??
        this.resolveUserId(req);

      const token =
        req.validatedBody?.verificationToken ??
        req.validatedParams?.token ??
        req.validatedQuery?.token ??
        (req.body as any)?.verificationToken ??
        (req.query as any)?.token;

      if (!userId) {
        throw {
          statusCode: 400,
          message: 'User identifier is required to verify email',
        };
      }

      if (typeof token !== 'string' || token.trim().length === 0) {
        throw {
          statusCode: 400,
          message: 'Verification token is required to verify email',
        };
      }

      await this.userAuthService.verifyUserEmail(userId, token);

      this.logAction(req, 'USERS_VERIFY_EMAIL_SUCCESS', {
        userId,
        verifiedAt: new Date().toISOString(),
      });

      return {
        userId,
        verified: true,
        verifiedAt: new Date().toISOString(),
      };
    }, res, 'User email verified successfully', this.getRequestMeta(req));
  }
}

export const usersAuthController = new UsersAuthController();

