// src/services/users/validation/userValidation.service.ts

import { UtilsService } from '../../infrastructure/shared';

export interface RegistrationValidationResult {
  valid: boolean;
  errors?: string[];
}

export class UserValidationService {
  /**
   * Ensure registration payload satisfies basic requirements
   */
  validateRegistrationData(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  }): RegistrationValidationResult {
    const errors: string[] = [];

    if (!UtilsService.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    if (!data.firstName || data.firstName.trim().length < 2) {
      errors.push('First name must be at least 2 characters long');
    }

    if (!data.lastName || data.lastName.trim().length < 2) {
      errors.push('Last name must be at least 2 characters long');
    }

    if (!data.password || data.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

export const userValidationService = new UserValidationService();
