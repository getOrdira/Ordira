import { createAppError } from '../../../../middleware/deprecated/error.middleware';

export class DatabaseValidationService {
  ensureUri(uri: string | undefined): string {
    if (!uri || typeof uri !== 'string' || uri.trim().length === 0) {
      throw createAppError('Database URI is required', 500, 'DATABASE_URI_MISSING');
    }

    return uri;
  }
}

export const databaseValidationService = new DatabaseValidationService();
