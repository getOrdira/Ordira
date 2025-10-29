// src/controllers/features/products/productsData.controller.ts
// Controller covering core product CRUD endpoints

import { Response, NextFunction } from 'express';
import { ProductsBaseController, ProductsBaseRequest } from './productsBase.controller';
import type { CreateProductData, ProductListResult } from '../../../services/products/utils';

interface CreateProductRequest extends ProductsBaseRequest {
  validatedBody: CreateProductData & {
    businessId?: string;
    manufacturerId?: string;
  };
}

interface UpdateProductRequest extends ProductsBaseRequest {
  validatedParams: {
    productId: string;
  };
  validatedBody: Partial<CreateProductData> & {
    businessId?: string;
    manufacturerId?: string;
  };
}

interface ProductIdParamsRequest extends ProductsBaseRequest {
  validatedParams: {
    productId: string;
  };
}

interface ListProductsRequest extends ProductsBaseRequest {
  validatedQuery?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    query?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    priceMin?: number;
    priceMax?: number;
    businessId?: string;
    manufacturerId?: string;
  };
}

interface OwnerQueryRequest extends ProductsBaseRequest {
  validatedQuery?: {
    status?: 'draft' | 'active' | 'archived';
    businessId?: string;
    manufacturerId?: string;
  };
}

interface ProductExistsRequest extends ProductsBaseRequest {
  validatedQuery?: {
    productId: string;
    businessId?: string;
    manufacturerId?: string;
  };
}

/**
 * ProductsDataController exposes CRUD endpoints aligned with product data services.
 */
export class ProductsDataController extends ProductsBaseController {
  /**
   * Create a product for the authenticated owner.
   */
  async createProduct(req: CreateProductRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req, ['business', 'manufacturer']);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      // Prepare payload
      const payload: Partial<CreateProductData> = { ...req.validatedBody };
      delete (payload as any).businessId;
      delete (payload as any).manufacturerId;

      const sanitized = this.productServices.validation.sanitizeProductData(payload);
      const validation = await this.productServices.validation.validateCreateProduct(
        sanitized,
        owner.businessId,
        owner.manufacturerId,
      );

      if (!validation.valid) {
        throw {
          statusCode: 400,
          message: 'Invalid product data',
          details: validation.errors,
        };
      }

      this.recordPerformance(req, 'CREATE_PRODUCT');

      const product = await this.productServices.data.createProduct(
        sanitized,
        owner.businessId,
        owner.manufacturerId,
      );

      this.logAction(req, 'CREATE_PRODUCT_SUCCESS', {
        productId: product._id?.toString(),
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
      });

      return { product };
    }, res, 'Product created successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve a single product by identifier.
   */
  async getProductById(req: ProductIdParamsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const productId = this.resolveProductId(req);
      const owner = this.resolveOwner(req, { allowExplicit: true });

      this.recordPerformance(req, 'GET_PRODUCT');

      const product = await this.productServices.data.getProduct(
        productId,
        owner.businessId,
        owner.manufacturerId,
      );

      if (!product) {
        throw { statusCode: 404, message: 'Product not found' };
      }

      this.logAction(req, 'GET_PRODUCT_SUCCESS', {
        productId,
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
      });

      return { product };
    }, res, 'Product retrieved', this.getRequestMeta(req));
  }

  /**
   * List products with filters and pagination.
   */
  async listProducts(req: ListProductsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      const pagination = this.parsePagination(req.validatedQuery, 20);
      const filters = this.buildFilters(req, owner, pagination);

      this.recordPerformance(req, 'LIST_PRODUCTS');

      const result: ProductListResult = await this.productServices.data.getProducts(filters);

      const total = result.total ?? result.products.length;
      const paginationMeta = this.createPaginationMeta(pagination.page, pagination.limit, total);

      this.logAction(req, 'LIST_PRODUCTS_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
        filters,
        total,
      });

      return {
        products: result.products,
        total,
        hasMore: result.hasMore,
        queryTime: result.queryTime,
        optimizationType: result.optimizationType,
        cached: result.cached,
        pagination: paginationMeta,
      };
    }, res, 'Products retrieved', this.getRequestMeta(req));
  }

  /**
   * Update an existing product.
   */
  async updateProduct(req: UpdateProductRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req, ['business', 'manufacturer']);

      const productId = this.resolveProductId(req);
      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      const updates: Partial<CreateProductData> = { ...req.validatedBody };
      delete (updates as any).businessId;
      delete (updates as any).manufacturerId;

      const sanitized = this.productServices.validation.sanitizeProductData(updates);
      const validation = this.productServices.validation.validateUpdateProduct(sanitized);

      if (!validation.valid) {
        throw {
          statusCode: 400,
          message: 'Invalid product updates',
          details: validation.errors,
        };
      }

      this.recordPerformance(req, 'UPDATE_PRODUCT');

      const product = await this.productServices.data.updateProduct(
        productId,
        sanitized,
        owner.businessId,
        owner.manufacturerId,
      );

      this.logAction(req, 'UPDATE_PRODUCT_SUCCESS', {
        productId,
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
      });

      return { product };
    }, res, 'Product updated', this.getRequestMeta(req));
  }

  /**
   * Delete a product owned by the authenticated user.
   */
  async deleteProduct(req: ProductIdParamsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req, ['business', 'manufacturer']);

      const productId = this.resolveProductId(req);
      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      this.recordPerformance(req, 'DELETE_PRODUCT');

      await this.productServices.data.deleteProduct(
        productId,
        owner.businessId,
        owner.manufacturerId,
      );

      this.logAction(req, 'DELETE_PRODUCT_SUCCESS', {
        productId,
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
      });

      return { deleted: true };
    }, res, 'Product deleted', this.getRequestMeta(req));
  }

  /**
   * Retrieve products for an owner without pagination.
   */
  async listProductsByOwner(req: OwnerQueryRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      const status = this.parseString(req.validatedQuery?.status);

      this.recordPerformance(req, 'LIST_PRODUCTS_BY_OWNER');

      const products = await this.productServices.data.getProductsByOwner(
        owner.businessId,
        owner.manufacturerId,
        status as 'draft' | 'active' | 'archived' | undefined,
      );

      this.logAction(req, 'LIST_PRODUCTS_BY_OWNER_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
        count: products.length,
      });

      return { products };
    }, res, 'Owner products retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve product counts for an owner.
   */
  async getProductCount(req: OwnerQueryRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      const status = this.parseString(req.validatedQuery?.status);

      this.recordPerformance(req, 'GET_PRODUCT_COUNT');

      const count = await this.productServices.data.getProductCount(
        owner.businessId,
        owner.manufacturerId,
        status as 'draft' | 'active' | 'archived' | undefined,
      );

      this.logAction(req, 'GET_PRODUCT_COUNT_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
        status,
        count,
      });

      return { count };
    }, res, 'Product count retrieved', this.getRequestMeta(req));
  }

  /**
   * Determine if a product exists for a given owner.
   */
  async productExists(req: ProductExistsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      const productId =
        req.validatedQuery?.productId ??
        (req.query?.productId as string);

      if (!productId) {
        throw { statusCode: 400, message: 'productId query parameter is required' };
      }

      this.recordPerformance(req, 'PRODUCT_EXISTS_CHECK');

      const exists = await this.productServices.data.productExists(
        productId,
        owner.businessId,
        owner.manufacturerId,
      );

      this.logAction(req, 'PRODUCT_EXISTS_CHECK_SUCCESS', {
        productId,
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
        exists,
      });

      return { exists };
    }, res, 'Product existence evaluated', this.getRequestMeta(req));
  }
}

export const productsDataController = new ProductsDataController();
