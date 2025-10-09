import { logger } from '../../../utils/logger';
import { productAccountService } from '../core/productAccount.service';
import { CreateProductData, ProductError } from '../utils';
import { validateString, isValidObjectId } from '../utils/helpers';

/**
 * Product validation service - Input and business rule validation
 */
export class ProductValidationService {
  /**
   * Validate product creation data
   */
  async validateCreateProduct(
    data: CreateProductData,
    businessId?: string,
    manufacturerId?: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate owner
    if (!businessId && !manufacturerId) {
      errors.push('Either businessId or manufacturerId must be provided');
    }

    // Validate title
    const titleValidation = validateString(data.title, 'Title', 2);
    if (!titleValidation.valid) {
      errors.push(titleValidation.error!);
    }

    // Validate title length
    if (data.title && data.title.length > 200) {
      errors.push('Title cannot exceed 200 characters');
    }

    // Validate description length
    if (data.description && data.description.length > 2000) {
      errors.push('Description cannot exceed 2000 characters');
    }

    // Validate price
    if (data.price !== undefined) {
      if (data.price < 0) {
        errors.push('Price must be non-negative');
      }
      if (data.price > 1000000000) {
        errors.push('Price exceeds maximum allowed value');
      }
    }

    // Validate SKU
    if (data.sku && data.sku.length > 100) {
      errors.push('SKU cannot exceed 100 characters');
    }

    // Validate status
    if (data.status && !['draft', 'active', 'archived'].includes(data.status)) {
      errors.push('Invalid status value');
    }

    // Validate tags
    if (data.tags && data.tags.length > 20) {
      errors.push('Cannot have more than 20 tags');
    }

    if (data.tags) {
      for (const tag of data.tags) {
        if (tag.length > 50) {
          errors.push('Tag cannot exceed 50 characters');
          break;
        }
      }
    }

    // Validate media IDs
    if (data.media && data.media.length > 0) {
      const invalidMedia = data.media.filter(id => !isValidObjectId(id));
      if (invalidMedia.length > 0) {
        errors.push('Invalid media ID format');
      }

      // Validate media ownership
      const ownerId = businessId || manufacturerId!;
      const mediaValid = await productAccountService.validateMediaOwnership(data.media, ownerId);
      if (!mediaValid) {
        errors.push('One or more media files do not exist or are not owned by the user');
      }
    }

    // Validate specifications
    if (data.specifications) {
      const specCount = Object.keys(data.specifications).length;
      if (specCount > 50) {
        errors.push('Cannot have more than 50 specifications');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate product update data
   */
  validateUpdateProduct(
    updates: Partial<CreateProductData>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate title if provided
    if (updates.title !== undefined) {
      const titleValidation = validateString(updates.title, 'Title', 2);
      if (!titleValidation.valid) {
        errors.push(titleValidation.error!);
      }

      if (updates.title.length > 200) {
        errors.push('Title cannot exceed 200 characters');
      }
    }

    // Validate description if provided
    if (updates.description && updates.description.length > 2000) {
      errors.push('Description cannot exceed 2000 characters');
    }

    // Validate price if provided
    if (updates.price !== undefined) {
      if (updates.price < 0) {
        errors.push('Price must be non-negative');
      }
      if (updates.price > 1000000000) {
        errors.push('Price exceeds maximum allowed value');
      }
    }

    // Validate status if provided
    if (updates.status && !['draft', 'active', 'archived'].includes(updates.status)) {
      errors.push('Invalid status value');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate product ID
   */
  validateProductId(productId: string): { valid: boolean; error?: string } {
    const validation = validateString(productId, 'Product ID');
    if (!validation.valid) {
      return validation;
    }

    if (!isValidObjectId(productId)) {
      return { valid: false, error: 'Invalid product ID format' };
    }

    return { valid: true };
  }

  /**
   * Validate product category
   */
  validateCategory(category?: string): { valid: boolean; error?: string } {
    if (!category) {
      return { valid: true }; // Category is optional
    }

    if (category.length > 100) {
      return { valid: false, error: 'Category name cannot exceed 100 characters' };
    }

    // Could add allowed category validation here
    return { valid: true };
  }

  /**
   * Validate price range filter
   */
  validatePriceRange(
    minPrice?: number,
    maxPrice?: number
  ): { valid: boolean; error?: string } {
    if (minPrice !== undefined && minPrice < 0) {
      return { valid: false, error: 'Minimum price must be non-negative' };
    }

    if (maxPrice !== undefined && maxPrice < 0) {
      return { valid: false, error: 'Maximum price must be non-negative' };
    }

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return { valid: false, error: 'Minimum price cannot exceed maximum price' };
    }

    return { valid: true };
  }

  /**
   * Validate search query
   */
  validateSearchQuery(query?: string): { valid: boolean; error?: string } {
    if (!query) {
      return { valid: false, error: 'Search query is required' };
    }

    if (query.length < 2) {
      return { valid: false, error: 'Search query must be at least 2 characters' };
    }

    if (query.length > 200) {
      return { valid: false, error: 'Search query cannot exceed 200 characters' };
    }

    return { valid: true };
  }

  /**
   * Validate bulk operation
   */
  validateBulkOperation(
    productIds: string[],
    maxBulkSize: number = 100
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!productIds || productIds.length === 0) {
      errors.push('Product IDs array cannot be empty');
    }

    if (productIds && productIds.length > maxBulkSize) {
      errors.push(`Cannot process more than ${maxBulkSize} products at once`);
    }

    if (productIds) {
      const invalidIds = productIds.filter(id => !isValidObjectId(id));
      if (invalidIds.length > 0) {
        errors.push('One or more product IDs have invalid format');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize product data before creation/update
   */
  sanitizeProductData(data: CreateProductData | Partial<CreateProductData>): any {
    const sanitized: any = { ...data };

    // Trim strings
    if (sanitized.title) {
      sanitized.title = sanitized.title.trim();
    }

    if (sanitized.description) {
      sanitized.description = sanitized.description.trim();
    }

    if (sanitized.category) {
      sanitized.category = sanitized.category.trim();
    }

    if (sanitized.sku) {
      sanitized.sku = sanitized.sku.trim().toUpperCase();
    }

    // Sanitize tags
    if (sanitized.tags && Array.isArray(sanitized.tags)) {
      sanitized.tags = sanitized.tags
        .map((tag: string) => tag.trim().toLowerCase())
        .filter((tag: string) => tag.length > 0);
    }

    // Round price to 2 decimals
    if (sanitized.price !== undefined) {
      sanitized.price = Math.round(sanitized.price * 100) / 100;
    }

    return sanitized;
  }
}

// Export singleton instance
export const productValidationService = new ProductValidationService();

