/**
 * Custom error class for product-related errors
 */
export class ProductError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'PRODUCT_ERROR') {
    super(message);
    this.name = 'ProductError';
    this.statusCode = statusCode;
    this.code = code;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProductError);
    }
  }
}

