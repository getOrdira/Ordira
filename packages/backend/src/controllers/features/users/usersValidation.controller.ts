// src/controllers/features/users/usersValidation.controller.ts
// Controller exposing user validation utilities

import { Response } from 'express';
import { UsersBaseController, UsersBaseRequest } from './usersBase.controller';

interface ValidateRegistrationRequest extends UsersBaseRequest {
  validatedBody?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  };
}

/**
 * UsersValidationController provides access to validation utilities for users.
 */
export class UsersValidationController extends UsersBaseController {
  /**
   * Validate incoming registration payloads without creating a user.
   */
  async validateRegistration(req: ValidateRegistrationRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'USERS_VALIDATE_REGISTRATION');

      const payload = this.sanitizeInput(req.validatedBody ?? (req.body as any) ?? {});

      const validation = this.userValidationService.validateRegistrationData({
        email: String(payload.email ?? '').trim().toLowerCase(),
        firstName: payload.firstName ? String(payload.firstName).trim() : undefined,
        lastName: payload.lastName ? String(payload.lastName).trim() : undefined,
        password: payload.password ? String(payload.password) : undefined,
      });

      this.logAction(req, 'USERS_VALIDATE_REGISTRATION_RESULT', {
        valid: validation.valid,
        errorCount: validation.errors?.length ?? 0,
      });

      return {
        valid: validation.valid,
        errors: validation.errors ?? [],
        checkedAt: new Date().toISOString(),
      };
    }, res, 'Registration payload validated successfully', this.getRequestMeta(req));
  }
}

export const usersValidationController = new UsersValidationController();

