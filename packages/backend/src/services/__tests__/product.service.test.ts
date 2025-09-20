// src/services/__tests__/product.service.test.ts

import { ProductService, CreateProductData, UpdateProductData, ProductFilters } from '../business/product.service';
import { Product, IProduct } from '../../models/product.model'; 
import { MediaService } from '../business/media.service';
import { cleanupTestData, createTestBusinessInDB, createTestManufacturerInDB } from '../../utils/__tests__/testHelpers';

// Mock MediaService
jest.mock('../business/media.service');
const MockedMediaService = MediaService as jest.MockedClass<typeof MediaService>;

// Mock Product model
jest.mock('../../models/product.model');
const MockedProduct = Product as jest.Mocked<typeof Product>;

describe('ProductService', () => {
  let productService: ProductService;
  let mockBusiness: any;
  let mockManufacturer: any;
  let mockProduct: any;
  let mockMediaService: jest.Mocked<MediaService>;

  beforeEach(async () => {
    productService = new ProductService();
    await cleanupTestData();
    
    jest.clearAllMocks();
    
    // Create mock business and manufacturer
    mockBusiness = await createTestBusinessInDB();
    mockManufacturer = await createTestManufacturerInDB();
    
    // Mock product data
    mockProduct = {
      _id: 'mock-product-id',
      title: 'Test Product',
      description: 'Test Description',
      media: ['media-id-1', 'media-id-2'],
      business: mockBusiness._id,
      manufacturer: null,
      category: 'Electronics',
      status: 'draft',
      sku: 'TEST-SKU-001',
      price: 99.99,
      tags: ['test', 'electronics'],
      specifications: new Map([['color', 'red'], ['size', 'large']]),
      manufacturingDetails: {
        materials: ['plastic', 'metal'],
        dimensions: '10x10x5',
        weight: '500g',
        origin: 'USA'
      },
      voteCount: 0,
      certificateCount: 0,
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      toString: jest.fn().mockReturnValue('mock-product-id'),
      save: jest.fn().mockResolvedValue(true)
    };

    // Mock MediaService instance
    mockMediaService = {
      getMediaById: jest.fn().mockResolvedValue({ _id: 'media-id-1', url: 'test-url' }),
      saveMedia: jest.fn().mockResolvedValue({ _id: 'media-id-1', url: 'test-url' })
    } as any;

    // Set up Product model mocks
    const mockQueryChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([mockProduct])
    };
    
    MockedProduct.find = jest.fn().mockReturnValue(mockQueryChain);

    MockedProduct.countDocuments = jest.fn().mockResolvedValue(1);
    MockedProduct.findOne = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockProduct)
    });
    MockedProduct.create = jest.fn().mockResolvedValue(mockProduct);
    MockedProduct.findOneAndUpdate = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockProduct)
    });
    MockedProduct.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1, acknowledged: true });
    MockedProduct.findByIdAndUpdate = jest.fn().mockResolvedValue(mockProduct);
    
    // Mock aggregate with default empty result
    MockedProduct.aggregate = jest.fn().mockResolvedValue([]);
    
    MockedProduct.distinct = jest.fn().mockResolvedValue(['Electronics', 'Clothing']);

    // Mock the mediaService property
    (productService as any).mediaService = mockMediaService;
  });

  describe('listProducts', () => {
    it('should list products for a business with default filters', async () => {
      const result = await productService.listProducts(mockBusiness._id.toString());

      expect(result).toHaveProperty('products');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('totalPages');
      expect(result.products).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should list products for a manufacturer', async () => {
      const result = await productService.listProducts('', mockManufacturer._id.toString());

      expect(result.products).toHaveLength(1);
      expect(MockedProduct.find).toHaveBeenCalled();
    });

    it('should apply filters correctly', async () => {
      const filters: ProductFilters = {
        category: 'Electronics',
        status: 'active',
        search: 'test',
        limit: 10,
        offset: 0,
        sortBy: 'title',
        sortOrder: 'asc'
      };

      await productService.listProducts(mockBusiness._id.toString(), undefined, filters);

      expect(MockedProduct.find).toHaveBeenCalled();
      expect(MockedProduct.countDocuments).toHaveBeenCalled();
    });

    it('should handle pagination correctly', async () => {
      const filters: ProductFilters = {
        limit: 5,
        offset: 10
      };

      const result = await productService.listProducts(mockBusiness._id.toString(), undefined, filters);

      expect(result.page).toBe(3); // Math.floor(10 / 5) + 1
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getProduct', () => {
    it('should get a product by ID for business', async () => {
      const result = await productService.getProduct('mock-product-id', mockBusiness._id.toString());

      expect(result).toHaveProperty('id', 'mock-product-id');
      expect(result).toHaveProperty('title', 'Test Product');
      expect(result).toHaveProperty('businessId', mockBusiness._id.toString());
      expect(MockedProduct.findOne).toHaveBeenCalledWith({
        _id: 'mock-product-id',
        business: mockBusiness._id.toString()
      });
    });

    it('should get a product by ID for manufacturer', async () => {
      const result = await productService.getProduct('mock-product-id', undefined, mockManufacturer._id.toString());

      expect(result).toHaveProperty('id', 'mock-product-id');
      expect(MockedProduct.findOne).toHaveBeenCalledWith({
        _id: 'mock-product-id',
        manufacturer: mockManufacturer._id.toString()
      });
    });

    it('should throw error when product not found', async () => {
      MockedProduct.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      } as any);

      await expect(productService.getProduct('non-existent-id', mockBusiness._id.toString()))
        .rejects.toMatchObject({ statusCode: 404, message: 'Product not found.' });
    });
  });

  describe('createProduct', () => {
    it('should create a product for business', async () => {
      const productData: CreateProductData = {
        title: 'New Product',
        description: 'New Description',
        category: 'Electronics',
        status: 'draft',
        sku: 'NEW-SKU-001',
        price: 149.99,
        tags: ['new', 'electronics'],
        specifications: { color: 'blue', size: 'medium' },
        manufacturingDetails: {
          materials: ['plastic'],
          dimensions: '15x15x8',
          weight: '750g',
          origin: 'Canada'
        }
      };

      const result = await productService.createProduct(productData, mockBusiness._id.toString());

      expect(result).toHaveProperty('id', 'mock-product-id');
      expect(result).toHaveProperty('title', 'Test Product');
      expect(MockedProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Product',
          business: mockBusiness._id.toString()
        })
      );
    });

    it('should create a product for manufacturer', async () => {
      const productData: CreateProductData = {
        title: 'Manufacturer Product',
        description: 'Manufacturer Description'
      };

      await productService.createProduct(productData, undefined, mockManufacturer._id.toString());

      expect(MockedProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Manufacturer Product',
          manufacturer: mockManufacturer._id.toString()
        })
      );
    });

    it('should validate media ownership when media is provided', async () => {
      const productData: CreateProductData = {
        title: 'Product with Media',
        media: ['media-id-1', 'media-id-2']
      };

      await productService.createProduct(productData, mockBusiness._id.toString());

      expect(mockMediaService.getMediaById).toHaveBeenCalledWith('media-id-1', mockBusiness._id.toString());
      expect(mockMediaService.getMediaById).toHaveBeenCalledWith('media-id-2', mockBusiness._id.toString());
    });

    it('should throw error when neither businessId nor manufacturerId provided', async () => {
      const productData: CreateProductData = {
        title: 'Invalid Product'
      };

      await expect(productService.createProduct(productData))
        .rejects.toThrow('Either businessId or manufacturerId must be provided');
    });

    it('should throw error when media validation fails', async () => {
      mockMediaService.getMediaById.mockRejectedValue(new Error('Media not found'));

      const productData: CreateProductData = {
        title: 'Product with Invalid Media',
        media: ['invalid-media-id']
      };

      await expect(productService.createProduct(productData, mockBusiness._id.toString()))
        .rejects.toThrow('Media invalid-media-id not found or unauthorized');
    });
  });

  describe('updateProduct', () => {
    it('should update a product for business', async () => {
      const updateData: UpdateProductData = {
        title: 'Updated Product',
        description: 'Updated Description',
        status: 'active'
      };

      const result = await productService.updateProduct('mock-product-id', updateData, mockBusiness._id.toString());

      expect(result).toHaveProperty('id', 'mock-product-id');
      expect(MockedProduct.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'mock-product-id', business: mockBusiness._id.toString() },
        { $set: updateData },
        { new: true }
      );
    });

    it('should update a product for manufacturer', async () => {
      const updateData: UpdateProductData = {
        title: 'Updated Manufacturer Product'
      };

      await productService.updateProduct('mock-product-id', updateData, undefined, mockManufacturer._id.toString());

      expect(MockedProduct.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'mock-product-id', manufacturer: mockManufacturer._id.toString() },
        { $set: updateData },
        { new: true }
      );
    });

    it('should throw error when product not found for update', async () => {
      MockedProduct.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      } as any);

      const updateData: UpdateProductData = {
        title: 'Updated Product'
      };

      await expect(productService.updateProduct('non-existent-id', updateData, mockBusiness._id.toString()))
        .rejects.toMatchObject({ statusCode: 404, message: 'Product not found or unauthorized.' });
    });

    it('should validate media ownership when updating media', async () => {
      const updateData: UpdateProductData = {
        media: ['media-id-1']
      };

      await productService.updateProduct('mock-product-id', updateData, mockBusiness._id.toString());

      expect(mockMediaService.getMediaById).toHaveBeenCalledWith('media-id-1', mockBusiness._id.toString());
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product for business', async () => {
      await productService.deleteProduct('mock-product-id', mockBusiness._id.toString());

      expect(MockedProduct.deleteOne).toHaveBeenCalledWith({
        _id: 'mock-product-id',
        business: mockBusiness._id.toString()
      });
    });

    it('should delete a product for manufacturer', async () => {
      await productService.deleteProduct('mock-product-id', undefined, mockManufacturer._id.toString());

      expect(MockedProduct.deleteOne).toHaveBeenCalledWith({
        _id: 'mock-product-id',
        manufacturer: mockManufacturer._id.toString()
      });
    });

    it('should throw error when product not found for deletion', async () => {
      MockedProduct.deleteOne.mockResolvedValue({ deletedCount: 0, acknowledged: true });

      await expect(productService.deleteProduct('non-existent-id', mockBusiness._id.toString()))
        .rejects.toMatchObject({ statusCode: 404, message: 'Product not found or unauthorized.' });
    });
  });

  describe('uploadProductImages', () => {
    it('should upload images for a product', async () => {
      const mockFiles = [
        { originalname: 'image1.jpg', buffer: Buffer.from('test') },
        { originalname: 'image2.jpg', buffer: Buffer.from('test') }
      ] as Express.Multer.File[];

      const result = await productService.uploadProductImages('mock-product-id', mockFiles, mockBusiness._id.toString());

      expect(result).toHaveLength(2);
      expect(mockMediaService.saveMedia).toHaveBeenCalledTimes(2);
      expect(MockedProduct.findByIdAndUpdate).toHaveBeenCalledWith(
        'mock-product-id',
        expect.objectContaining({
          media: expect.arrayContaining(['test-url']),
          updatedAt: expect.any(Date)
        })
      );
    });

    it('should throw error when product not found for image upload', async () => {
      MockedProduct.findOne.mockResolvedValue(null);

      const mockFiles = [{ originalname: 'image1.jpg', buffer: Buffer.from('test') }] as Express.Multer.File[];

      await expect(productService.uploadProductImages('non-existent-id', mockFiles, mockBusiness._id.toString()))
        .rejects.toMatchObject({ statusCode: 404, message: 'Product not found or unauthorized.' });
    });
  });

  describe('getProductStats', () => {
    it('should get product statistics for business', async () => {
      // Mock aggregate to return different results for each call
      MockedProduct.aggregate
        .mockResolvedValueOnce([{ _id: null, total: 5, totalVotes: 10, averageVotes: 2 }])
        .mockResolvedValueOnce([{ _id: 'draft', count: 2 }, { _id: 'active', count: 3 }])
        .mockResolvedValueOnce([{ _id: 'Electronics', count: 3 }, { _id: 'Clothing', count: 2 }])
        .mockResolvedValueOnce([{ _id: true, count: 4 }, { _id: false, count: 1 }]);

      const result = await productService.getProductStats(mockBusiness._id.toString());

      expect(result).toHaveProperty('total', 5);
      expect(result).toHaveProperty('byStatus');
      expect(result).toHaveProperty('byCategory');
      expect(result).toHaveProperty('withMedia', 4);
      expect(result).toHaveProperty('withoutMedia', 1);
      expect(result).toHaveProperty('averageVotes', 2);
      expect(result).toHaveProperty('totalVotes', 10);
    });

    it('should get product statistics for manufacturer', async () => {
      await productService.getProductStats(undefined, mockManufacturer._id.toString());

      expect(MockedProduct.aggregate).toHaveBeenCalled();
    });
  });

  describe('searchProducts', () => {
    it('should search products with query', async () => {
      // Mock the search query chain to return an array
      const mockSearchChain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([mockProduct])
      };
      MockedProduct.find.mockReturnValue(mockSearchChain as any);

      const result = await productService.searchProducts('test query');

      expect(result).toHaveLength(1);
      expect(MockedProduct.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          $or: expect.arrayContaining([
            { title: { $regex: 'test query', $options: 'i' } },
            { description: { $regex: 'test query', $options: 'i' } },
            { tags: { $in: [new RegExp('test query', 'i')] } }
          ])
        })
      );
    });

    it('should search products with filters', async () => {
      const filters = {
        category: 'Electronics',
        userType: 'brand' as const,
        priceRange: { min: 50, max: 200 },
        limit: 20
      };

      // Mock the search query chain to return an array
      const mockSearchChain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([mockProduct])
      };
      MockedProduct.find.mockReturnValue(mockSearchChain as any);

      await productService.searchProducts('test', filters);

      expect(MockedProduct.find).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Electronics',
          business: { $exists: true },
          price: { $gte: 50, $lte: 200 }
        })
      );
    });
  });

  describe('getProductsByCategory', () => {
    it('should get products by category for business', async () => {
      // Mock the category query chain to return an array
      const mockCategoryChain = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([mockProduct])
      };
      MockedProduct.find.mockReturnValue(mockCategoryChain as any);

      const result = await productService.getProductsByCategory('Electronics', mockBusiness._id.toString());

      expect(result).toHaveLength(1);
      expect(MockedProduct.find).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Electronics',
          status: 'active',
          business: mockBusiness._id.toString()
        })
      );
    });

    it('should get products by category for manufacturer', async () => {
      // Mock the category query chain to return an array
      const mockCategoryChain = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([mockProduct])
      };
      MockedProduct.find.mockReturnValue(mockCategoryChain as any);

      await productService.getProductsByCategory('Electronics', undefined, mockManufacturer._id.toString());

      expect(MockedProduct.find).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Electronics',
          status: 'active',
          manufacturer: mockManufacturer._id.toString()
        })
      );
    });
  });

  describe('getFeaturedProducts', () => {
    it('should get featured products', async () => {
      // Mock the featured products query chain to return an array
      const mockFeaturedChain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([mockProduct])
      };
      MockedProduct.find.mockReturnValue(mockFeaturedChain as any);

      const result = await productService.getFeaturedProducts(5);

      expect(result).toHaveLength(1);
      expect(MockedProduct.find).toHaveBeenCalledWith(
        { status: 'active' }
      );
    });
  });

  describe('toggleArchiveStatus', () => {
    it('should toggle archive status from active to archived', async () => {
      mockProduct.status = 'active';
      MockedProduct.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockProduct)
      } as any);

      const result = await productService.toggleArchiveStatus('mock-product-id', mockBusiness._id.toString());

      expect(MockedProduct.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'mock-product-id', business: mockBusiness._id.toString() },
        { $set: { status: 'archived' } },
        { new: true }
      );
    });

    it('should toggle archive status from archived to active', async () => {
      mockProduct.status = 'archived';
      MockedProduct.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockProduct)
      } as any);

      await productService.toggleArchiveStatus('mock-product-id', mockBusiness._id.toString());

      expect(MockedProduct.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'mock-product-id', business: mockBusiness._id.toString() },
        { $set: { status: 'active' } },
        { new: true }
      );
    });
  });

  describe('bulkUpdateProducts', () => {
    it('should bulk update products successfully', async () => {
      const productIds = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
      const updates: UpdateProductData = {
        status: 'active',
        category: 'Electronics'
      };

      const result = await productService.bulkUpdateProducts(productIds, updates, mockBusiness._id.toString());

      expect(result).toHaveProperty('updated', 2);
      expect(result).toHaveProperty('errors');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial failures in bulk update', async () => {
      // Reset the mock to handle multiple calls
      MockedProduct.findOneAndUpdate.mockReset();
      
      let callCount = 0;
      MockedProduct.findOneAndUpdate.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First update succeeds
          return {
            populate: jest.fn().mockResolvedValue(mockProduct)
          } as any;
        } else {
          // Second update fails
          throw new Error('Update failed');
        }
      });

      const productIds = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
      const updates: UpdateProductData = { status: 'active' };

      const result = await productService.bulkUpdateProducts(productIds, updates, mockBusiness._id.toString());

      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to update 507f1f77bcf86cd799439012');
    });

    it('should validate product IDs format', async () => {
      const productIds = ['invalid-id'];
      const updates: UpdateProductData = { status: 'active' };

      await expect(productService.bulkUpdateProducts(productIds, updates, mockBusiness._id.toString()))
        .rejects.toMatchObject({ statusCode: 400, message: 'Invalid product ID format: invalid-id' });
    });

    it('should limit bulk update to 100 products', async () => {
      const productIds = Array(101).fill('507f1f77bcf86cd799439011');
      const updates: UpdateProductData = { status: 'active' };

      await expect(productService.bulkUpdateProducts(productIds, updates, mockBusiness._id.toString()))
        .rejects.toMatchObject({ statusCode: 400, message: 'Maximum 100 products can be updated at once' });
    });

    it('should require non-empty product IDs array', async () => {
      const updates: UpdateProductData = { status: 'active' };

      await expect(productService.bulkUpdateProducts([], updates, mockBusiness._id.toString()))
        .rejects.toMatchObject({ statusCode: 400, message: 'Product IDs array is required and cannot be empty' });
    });

    it('should require update data', async () => {
      const productIds = ['507f1f77bcf86cd799439011'];

      await expect(productService.bulkUpdateProducts(productIds, {}, mockBusiness._id.toString()))
        .rejects.toMatchObject({ statusCode: 400, message: 'Update data is required' });
    });
  });

  describe('getAvailableCategories', () => {
    it('should get available categories', async () => {
      const result = await productService.getAvailableCategories();

      expect(result).toEqual(['Electronics', 'Clothing']);
      expect(MockedProduct.distinct).toHaveBeenCalledWith('category', {
        category: { $exists: true, $ne: null },
        status: 'active'
      });
    });
  });

  describe('incrementVoteCount', () => {
    it('should increment vote count for a product', async () => {
      await productService.incrementVoteCount('mock-product-id');

      expect(MockedProduct.findByIdAndUpdate).toHaveBeenCalledWith(
        'mock-product-id',
        { $inc: { voteCount: 1 } }
      );
    });
  });

  describe('incrementCertificateCount', () => {
    it('should increment certificate count for a product', async () => {
      await productService.incrementCertificateCount('mock-product-id');

      expect(MockedProduct.findByIdAndUpdate).toHaveBeenCalledWith(
        'mock-product-id',
        { $inc: { certificateCount: 1 } }
      );
    });
  });

  describe('Helper Methods', () => {
    describe('buildProductQuery', () => {
      it('should build query with business ID', () => {
        const query = (productService as any).buildProductQuery(mockBusiness._id.toString());
        expect(query.business).toBe(mockBusiness._id.toString());
      });

      it('should build query with manufacturer ID', () => {
        const query = (productService as any).buildProductQuery(undefined, mockManufacturer._id.toString());
        expect(query.manufacturer).toBe(mockManufacturer._id.toString());
      });

      it('should build query with filters', () => {
        const filters: ProductFilters = {
          category: 'Electronics',
          status: 'active',
          search: 'test',
          hasMedia: true,
          dateFrom: new Date('2023-01-01'),
          dateTo: new Date('2023-12-31')
        };

        const query = (productService as any).buildProductQuery(mockBusiness._id.toString(), undefined, filters);
        
        expect(query.category).toBe('Electronics');
        expect(query.status).toBe('active');
        expect(query.$or).toBeDefined();
        expect(query.media).toEqual({ $exists: true, $not: { $size: 0 } });
        expect(query.createdAt.$gte).toBeDefined();
        expect(query.createdAt.$lte).toBeDefined();
      });
    });

    describe('buildSortQuery', () => {
      it('should build sort query with default values', () => {
        const sortQuery = (productService as any).buildSortQuery();
        expect(sortQuery).toBe('-createdAt');
      });

      it('should build sort query with custom values', () => {
        const filters: ProductFilters = {
          sortBy: 'title',
          sortOrder: 'asc'
        };

        const sortQuery = (productService as any).buildSortQuery(filters);
        expect(sortQuery).toBe('title');
      });
    });

    describe('mapToSummary', () => {
      it('should map product to summary correctly', () => {
        const summary = (productService as any).mapToSummary(mockProduct);

        expect(summary).toHaveProperty('id', 'mock-product-id');
        expect(summary).toHaveProperty('title', 'Test Product');
        expect(summary).toHaveProperty('description', 'Test Description');
        expect(summary).toHaveProperty('media', ['media-id-1', 'media-id-2']);
        expect(summary).toHaveProperty('businessId', mockBusiness._id.toString());
        expect(summary).toHaveProperty('category', 'Electronics');
        expect(summary).toHaveProperty('status', 'draft');
        expect(summary).toHaveProperty('voteCount', 0);
        expect(summary).toHaveProperty('certificateCount', 0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Reset the mock to throw an error
      MockedProduct.find.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(productService.listProducts(mockBusiness._id.toString()))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle media service errors', async () => {
      mockMediaService.getMediaById.mockRejectedValue(new Error('Media service unavailable'));

      const productData: CreateProductData = {
        title: 'Product with Media',
        media: ['media-id-1']
      };

      await expect(productService.createProduct(productData, mockBusiness._id.toString()))
        .rejects.toThrow('Media media-id-1 not found or unauthorized');
    });
  });
});
