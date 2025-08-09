// src/utils/errorUtils.ts

/**
 * Safely extract error message from unknown error types
 * Use this instead of error.message to avoid TypeScript errors
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  
  return 'An unknown error occurred';
}

/**
 * Safely extract error stack from unknown error types
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

/**
 * Safely extract error code from unknown error types
 */
export function getErrorCode(error: unknown): string | number | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as any).code;
  }
  return undefined;
}

/**
 * Check if error is an instance of Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Check if error has a specific property
 */
export function hasErrorProperty(error: unknown, property: string): boolean {
  return error && typeof error === 'object' && property in error;
}

/**
 * Safe error logging utility
 */
export function logError(context: string, error: unknown, additionalData?: any): void {
  const errorMessage = getErrorMessage(error);
  const errorStack = getErrorStack(error);
  const errorCode = getErrorCode(error);
  
  console.error(`[${context}] Error:`, {
    message: errorMessage,
    code: errorCode,
    stack: errorStack,
    additionalData
  });
}