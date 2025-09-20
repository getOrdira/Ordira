// src/services/__tests__/manufacturer.service.test.ts

// Set environment variable before importing the service
process.env.MFG_JWT_SECRET = 'test-mfg-jwt-secret';

import { ManufacturerService } from '../business/manufacturer.service';
import { Manufacturer } from '../../models/manufacturer.model';
import { Business } from '../../models/business.model';
import { BrandSettings } from '../../models/brandSettings.model';
import { Invitation } from '../../models/invitation.model';
import { VotingRecord } from '../../models/votingRecord.model';
import { NftCertificate } from '../../models/nftCertificate.model';
import { AnalyticsBusinessService } from '../business/analytics.service';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../models/manufacturer.model');
jest.mock('../../models/business.model');
jest.mock('../../models/brandSettings.model');
jest.mock('../../models/invitation.model');
jest.mock('../../models/votingRecord.model');
jest.mock('../../models/nftCertificate.model');
jest.mock('../business/analytics.service');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const MockedManufacturer = Manufacturer as jest.Mocked<typeof Manufacturer>;
const MockedBusiness = Business as jest.Mocked<typeof Business>;
const MockedBrandSettings = BrandSettings as jest.Mocked<typeof BrandSettings>;
const MockedInvitation = Invitation as jest.Mocked<typeof Invitation>;
const MockedVotingRecord = VotingRecord as jest.Mocked<typeof VotingRecord>;
const MockedNftCertificate = NftCertificate as jest.Mocked<typeof NftCertificate>;
const MockedAnalyticsService = AnalyticsBusinessService as jest.MockedClass<typeof AnalyticsBusinessService>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJWT = jwt as jest.Mocked<typeof jwt>;

describe('ManufacturerService', () => {
  let manufacturerService: ManufacturerService;
  let mockManufacturer: any;
  let mockBusiness: any;
  let mockBrandSettings: any;

  beforeEach(() => {
    manufacturerService = new ManufacturerService();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock manufacturer data
    mockManufacturer = {
      _id: 'manufacturer-id-123',
      name: 'Test Manufacturer',
      email: 'test@manufacturer.com',
      password: 'hashed-password',
      industry: 'Textile',
      description: 'A test manufacturer for textile products',
      contactEmail: 'contact@manufacturer.com',
      servicesOffered: ['Cutting', 'Sewing', 'Finishing'],
      moq: 100,
      isActive: true,
      isVerified: false,
      isEmailVerified: true,
      totalConnections: 0,
      brands: [],
      createdAt: new Date('2023-01-01'),
      lastLoginAt: new Date('2023-12-01'),
      save: jest.fn().mockResolvedValue(true)
    };

    // Mock business data
    mockBusiness = {
      _id: 'business-id-123',
      businessName: 'Test Brand',
      industry: 'Fashion',
      isActive: true,
      isVerified: true,
      profilePictureUrl: 'https://example.com/logo.jpg'
    };

    // Mock brand settings data
    mockBrandSettings = {
      _id: 'brand-settings-id-123',
      business: 'business-id-123'
    };

    // Mock bcrypt
    mockBcrypt.hash.mockImplementation(() => Promise.resolve('hashed-password'));
    mockBcrypt.compare.mockImplementation(() => Promise.resolve(true));

    // Mock JWT
    mockJWT.sign.mockImplementation(() => 'test-jwt-token');
    mockJWT.verify.mockImplementation(() => ({
      sub: 'manufacturer-id-123',
      type: 'manufacturer',
      email: 'test@manufacturer.com',
      verified: false
    }));

    // Mock environment variable
    process.env.MFG_JWT_SECRET = 'test-mfg-jwt-secret';
  });

  describe('Authentication Methods', () => {
    describe('register', () => {
      it('should register a new manufacturer successfully', async () => {
        const registrationData = {
          name: 'New Manufacturer',
          email: 'new@manufacturer.com',
          password: 'SecurePass123!',
          industry: 'Electronics',
          contactEmail: 'contact@newmanufacturer.com',
          description: 'A new electronics manufacturer'
        };

        MockedManufacturer.findOne.mockResolvedValue(null);
        MockedManufacturer.create.mockImplementation(() => Promise.resolve(mockManufacturer));

        const result = await manufacturerService.register(registrationData);

        expect(result).toHaveProperty('token');
        expect(result).toHaveProperty('manufacturerId');
        expect(result).toHaveProperty('profile');
        expect(result.token).toBe('test-jwt-token');
        expect(result.manufacturerId).toBe('manufacturer-id-123');
        expect(result.profile.name).toBe('Test Manufacturer');
        expect(MockedManufacturer.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Manufacturer',
            email: 'new@manufacturer.com',
            password: 'hashed-password',
            industry: 'Electronics',
            contactEmail: 'contact@newmanufacturer.com',
            description: 'A new electronics manufacturer',
            isActive: true,
            isVerified: false,
            totalConnections: 0
          })
        );
      });

      it('should reject duplicate email registration', async () => {
        const registrationData = {
          name: 'Duplicate Manufacturer',
          email: 'duplicate@manufacturer.com',
          password: 'SecurePass123!'
        };

        MockedManufacturer.findOne.mockResolvedValue(mockManufacturer);

        await expect(manufacturerService.register(registrationData))
          .rejects.toMatchObject({
            statusCode: 409,
            message: 'Email already in use'
          });
      });

      it('should validate registration input', async () => {
        const invalidData = {
          name: 'A', // Too short
          email: 'invalid-email',
          password: '123' // Too short
        };

        await expect(manufacturerService.register(invalidData))
          .rejects.toMatchObject({
            statusCode: 400,
            message: expect.stringMatching(/Invalid email format|Name must be at least|Password must be at least/)
          });
      });
    });

    describe('login', () => {
      it('should login with valid credentials', async () => {
        MockedManufacturer.findOne.mockResolvedValue(mockManufacturer);

        const loginData = {
          email: 'test@manufacturer.com',
          password: 'SecurePass123!'
        };

        const result = await manufacturerService.login(loginData);

        expect(result).toHaveProperty('token');
        expect(result).toHaveProperty('manufacturerId');
        expect(result).toHaveProperty('profile');
        expect(result.token).toBe('test-jwt-token');
        expect(result.manufacturerId).toBe('manufacturer-id-123');
        expect(mockManufacturer.save).toHaveBeenCalled();
      });

      it('should reject invalid credentials', async () => {
        MockedManufacturer.findOne.mockResolvedValue(mockManufacturer);
        mockBcrypt.compare.mockImplementation(() => Promise.resolve(false));

        const loginData = {
          email: 'test@manufacturer.com',
          password: 'wrong-password'
        };

        await expect(manufacturerService.login(loginData))
          .rejects.toMatchObject({
            statusCode: 401,
            message: 'Invalid credentials'
          });
      });

      it('should reject non-existent manufacturer', async () => {
        MockedManufacturer.findOne.mockResolvedValue(null);

        const loginData = {
          email: 'nonexistent@manufacturer.com',
          password: 'SecurePass123!'
        };

        await expect(manufacturerService.login(loginData))
          .rejects.toMatchObject({
            statusCode: 401,
            message: 'Invalid credentials'
          });
      });

      it('should reject inactive account', async () => {
        const inactiveManufacturer = { ...mockManufacturer, isActive: false };
        MockedManufacturer.findOne.mockResolvedValue(inactiveManufacturer);

        const loginData = {
          email: 'test@manufacturer.com',
          password: 'SecurePass123!'
        };

        await expect(manufacturerService.login(loginData))
          .rejects.toMatchObject({
            statusCode: 403,
            message: 'Account has been deactivated'
          });
      });
    });

    describe('refreshToken', () => {
      it('should refresh token for valid manufacturer', async () => {
        MockedManufacturer.findById.mockResolvedValue(mockManufacturer);

        const result = await manufacturerService.refreshToken('manufacturer-id-123');

        expect(result).toHaveProperty('token');
        expect(result).toHaveProperty('expiresAt');
        expect(result.token).toBe('test-jwt-token');
        expect(mockManufacturer.save).toHaveBeenCalled();
      });

      it('should reject refresh for non-existent manufacturer', async () => {
        MockedManufacturer.findById.mockResolvedValue(null);

        await expect(manufacturerService.refreshToken('nonexistent-id'))
          .rejects.toMatchObject({
            statusCode: 404,
            message: 'Manufacturer not found'
          });
      });

      it('should reject refresh for inactive manufacturer', async () => {
        const inactiveManufacturer = { ...mockManufacturer, isActive: false };
        MockedManufacturer.findById.mockResolvedValue(inactiveManufacturer);

        await expect(manufacturerService.refreshToken('manufacturer-id-123'))
          .rejects.toMatchObject({
            statusCode: 403,
            message: 'Account is not active'
          });
      });
    });
  });

  describe('Profile Management', () => {
    describe('updateProfile', () => {
      it('should update manufacturer profile successfully', async () => {
        const updateData = {
          name: 'Updated Manufacturer',
          description: 'Updated description',
          industry: 'Updated Industry',
          servicesOffered: ['New Service 1', 'New Service 2'],
          moq: 200
        };

        const updatedManufacturer = {
          ...mockManufacturer,
          ...updateData
        };

        MockedManufacturer.findByIdAndUpdate.mockResolvedValue(updatedManufacturer);

        const result = await manufacturerService.updateProfile('manufacturer-id-123', updateData);

        expect(result.name).toBe('Updated Manufacturer');
        expect(result.description).toBe('Updated description');
        expect(result.industry).toBe('Updated Industry');
        expect(result.servicesOffered).toEqual(['New Service 1', 'New Service 2']);
        expect(result.moq).toBe(200);
        expect(MockedManufacturer.findByIdAndUpdate).toHaveBeenCalledWith(
          'manufacturer-id-123',
          expect.objectContaining({
            name: 'Updated Manufacturer',
            description: 'Updated description',
            industry: 'Updated Industry',
            servicesOffered: ['New Service 1', 'New Service 2'],
            moq: 200
          }),
          { new: true }
        );
      });

      it('should validate contact email format', async () => {
        const updateData = {
          contactEmail: 'invalid-email-format'
        };

        await expect(manufacturerService.updateProfile('manufacturer-id-123', updateData))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid contact email format'
          });
      });

      it('should validate MOQ is positive', async () => {
        const updateData = {
          moq: -10
        };

        await expect(manufacturerService.updateProfile('manufacturer-id-123', updateData))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Minimum order quantity must be positive'
          });
      });

      it('should throw error when manufacturer not found', async () => {
        MockedManufacturer.findByIdAndUpdate.mockResolvedValue(null);

        const updateData = { name: 'Updated Name' };

        await expect(manufacturerService.updateProfile('nonexistent-id', updateData))
          .rejects.toMatchObject({
            statusCode: 404,
            message: 'Manufacturer not found'
          });
      });
    });
  });

  describe('Brand Connection Methods', () => {
    describe('listBrandsForManufacturer', () => {
      it('should list connected brands for manufacturer', async () => {
        const mockBrandConnection = {
          _id: 'brand-connection-id',
          business: mockBusiness,
          logoUrl: 'https://example.com/brand-logo.jpg',
          createdAt: new Date('2023-06-01')
        };

        const manufacturerWithBrands = {
          ...mockManufacturer,
          brands: [mockBrandConnection]
        };

        MockedManufacturer.findById.mockReturnValue({
          populate: jest.fn().mockResolvedValue(manufacturerWithBrands)
        } as any);

        const result = await manufacturerService.listBrandsForManufacturer('manufacturer-id-123');

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          id: 'brand-connection-id',
          businessId: 'business-id-123',
          businessName: 'Test Brand',
          logoUrl: 'https://example.com/brand-logo.jpg',
          industry: 'Fashion',
          verified: true
        });
      });

      it('should throw error when manufacturer not found', async () => {
        MockedManufacturer.findById.mockReturnValue({
          populate: jest.fn().mockResolvedValue(null)
        } as any);

        await expect(manufacturerService.listBrandsForManufacturer('nonexistent-id'))
          .rejects.toMatchObject({
            statusCode: 404,
            message: 'Manufacturer not found'
          });
      });
    });

    describe('getConnectionStatus', () => {
      it('should return connected status when invitation is accepted', async () => {
        const mockInvitation = {
          status: 'accepted',
          createdAt: new Date('2023-01-01'),
          respondedAt: new Date('2023-01-02')
        };

        MockedInvitation.findOne.mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvitation)
        } as any);

        const result = await manufacturerService.getConnectionStatus('manufacturer-id-123', 'brand-id-123');

        expect(result.status).toBe('connected');
        expect(result.connectedAt).toBe(mockInvitation.respondedAt);
        expect(result.history).toHaveLength(2);
      });

      it('should return pending status when invitation is pending', async () => {
        const mockInvitation = {
          status: 'pending',
          createdAt: new Date('2023-01-01'),
          respondedAt: null
        };

        MockedInvitation.findOne.mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvitation)
        } as any);

        const result = await manufacturerService.getConnectionStatus('manufacturer-id-123', 'brand-id-123');

        expect(result.status).toBe('pending');
        expect(result.connectedAt).toBeUndefined();
        expect(result.history).toHaveLength(1);
      });

      it('should return none status when no invitation exists', async () => {
        MockedInvitation.findOne.mockReturnValue({
          sort: jest.fn().mockResolvedValue(null)
        } as any);

        MockedManufacturer.findById.mockResolvedValue({
          ...mockManufacturer,
          brands: []
        });

        const result = await manufacturerService.getConnectionStatus('manufacturer-id-123', 'brand-id-123');

        expect(result.status).toBe('none');
        expect(result.connectedAt).toBeUndefined();
        expect(result.history).toHaveLength(0);
      });
    });

    describe('canConnectToBrand', () => {
      it('should allow connection when all requirements are met', async () => {
        const completeManufacturer = {
          ...mockManufacturer,
          isEmailVerified: true,
          description: 'A detailed description that meets the minimum length requirement of 50 characters',
          industry: 'Textile',
          servicesOffered: ['Cutting', 'Sewing']
        };

        MockedManufacturer.findById.mockResolvedValue(completeManufacturer);
        MockedBusiness.findById.mockResolvedValue(mockBusiness);

        // Mock getConnectionStatus to return 'none'
        jest.spyOn(manufacturerService, 'getConnectionStatus').mockResolvedValue({
          status: 'none',
          connectedAt: undefined,
          history: []
        });

        const result = await manufacturerService.canConnectToBrand('manufacturer-id-123', 'brand-id-123');

        expect(result.canConnect).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should reject connection when manufacturer not found', async () => {
        MockedManufacturer.findById.mockResolvedValue(null);

        const result = await manufacturerService.canConnectToBrand('nonexistent-id', 'brand-id-123');

        expect(result.canConnect).toBe(false);
        expect(result.reason).toBe('Manufacturer not found');
      });

      it('should reject connection when brand not found', async () => {
        MockedManufacturer.findById.mockResolvedValue(mockManufacturer);
        MockedBusiness.findById.mockResolvedValue(null);

        const result = await manufacturerService.canConnectToBrand('manufacturer-id-123', 'nonexistent-id');

        expect(result.canConnect).toBe(false);
        expect(result.reason).toBe('Brand not found');
      });

      it('should reject connection when brand is inactive', async () => {
        const inactiveBusiness = { ...mockBusiness, isActive: false };
        MockedManufacturer.findById.mockResolvedValue(mockManufacturer);
        MockedBusiness.findById.mockResolvedValue(inactiveBusiness);

        const result = await manufacturerService.canConnectToBrand('manufacturer-id-123', 'brand-id-123');

        expect(result.canConnect).toBe(false);
        expect(result.reason).toBe('Brand account is not active');
      });

      it('should reject connection when profile requirements not met', async () => {
        const incompleteManufacturer = {
          ...mockManufacturer,
          isEmailVerified: false,
          description: 'Short',
          industry: undefined,
          servicesOffered: []
        };

        MockedManufacturer.findById.mockResolvedValue(incompleteManufacturer);
        MockedBusiness.findById.mockResolvedValue(mockBusiness);

        // Mock getConnectionStatus to return 'none'
        jest.spyOn(manufacturerService, 'getConnectionStatus').mockResolvedValue({
          status: 'none',
          connectedAt: undefined,
          history: []
        });

        const result = await manufacturerService.canConnectToBrand('manufacturer-id-123', 'brand-id-123');

        expect(result.canConnect).toBe(false);
        expect(result.reason).toBe('Profile requirements not met');
        expect(result.requirements).toContain('Email verification required');
        expect(result.requirements).toContain('Complete profile description (minimum 50 characters)');
        expect(result.requirements).toContain('Industry selection required');
        expect(result.requirements).toContain('Services offered must be specified');
      });
    });

    describe('createConnectionRequest', () => {
      it('should create connection request successfully', async () => {
        const completeManufacturer = {
          ...mockManufacturer,
          isEmailVerified: true,
          description: 'A detailed description that meets the minimum length requirement of 50 characters',
          industry: 'Textile',
          servicesOffered: ['Cutting', 'Sewing']
        };

        MockedManufacturer.findById.mockResolvedValue(completeManufacturer);
        MockedBusiness.findById.mockResolvedValue(mockBusiness);

        // Mock canConnectToBrand to return success
        jest.spyOn(manufacturerService, 'canConnectToBrand').mockResolvedValue({
          canConnect: true
        });

        const requestData = {
          message: 'I would like to connect and explore partnership opportunities.',
          proposedServices: ['Cutting', 'Sewing'],
          timeline: '2-4 weeks',
          budget: 'To be discussed'
        };

        const result = await manufacturerService.createConnectionRequest(
          'manufacturer-id-123',
          'brand-id-123',
          requestData
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Connection request sent to Test Brand');
        expect(result.connectionRequestId).toBeDefined();
        expect(result.nextSteps).toHaveLength(4);
      });

      it('should reject connection request when not eligible', async () => {
        // Mock canConnectToBrand to return failure
        jest.spyOn(manufacturerService, 'canConnectToBrand').mockResolvedValue({
          canConnect: false,
          reason: 'Profile requirements not met',
          requirements: ['Email verification required']
        });

        const requestData = {
          message: 'I would like to connect.'
        };

        const result = await manufacturerService.createConnectionRequest(
          'manufacturer-id-123',
          'brand-id-123',
          requestData
        );

        expect(result.success).toBe(false);
        expect(result.message).toBe('Profile requirements not met');
        expect(result.nextSteps).toEqual(['Email verification required']);
      });
    });
  });

  describe('Analytics Methods', () => {
    describe('getResultsForBrand', () => {
      it('should get voting results for authorized brand', async () => {
        const manufacturerWithBrand = {
          ...mockManufacturer,
          brands: ['brand-settings-id-123']
        };

        MockedManufacturer.findOne.mockResolvedValue(manufacturerWithBrand);
        MockedBrandSettings.findById.mockReturnValue({
          select: jest.fn().mockResolvedValue(mockBrandSettings)
        } as any);

        const mockAnalytics = {
          totalVotes: 150,
          topProducts: ['product-1', 'product-2'],
          votingTrends: { increasing: true }
        };

        const mockAnalyticsService = new MockedAnalyticsService();
        mockAnalyticsService.getVotingAnalytics = jest.fn().mockResolvedValue(mockAnalytics);

        // Mock the analytics service instance
        (manufacturerService as any).analyticsService = mockAnalyticsService;

        const result = await manufacturerService.getResultsForBrand('manufacturer-id-123', 'brand-settings-id-123');

        expect(result).toEqual(mockAnalytics);
        expect(mockAnalyticsService.getVotingAnalytics).toHaveBeenCalledWith('business-id-123');
      });

      it('should reject unauthorized access to brand', async () => {
        MockedManufacturer.findOne.mockResolvedValue(null);

        await expect(manufacturerService.getResultsForBrand('manufacturer-id-123', 'brand-settings-id-123'))
          .rejects.toMatchObject({
            statusCode: 403,
            message: 'Not authorized for this brand'
          });
      });

      it('should throw error when brand settings not found', async () => {
        const manufacturerWithBrand = {
          ...mockManufacturer,
          brands: ['brand-settings-id-123']
        };

        MockedManufacturer.findOne.mockResolvedValue(manufacturerWithBrand);
        MockedBrandSettings.findById.mockReturnValue({
          select: jest.fn().mockResolvedValue(null)
        } as any);

        await expect(manufacturerService.getResultsForBrand('manufacturer-id-123', 'brand-settings-id-123'))
          .rejects.toMatchObject({
            statusCode: 404,
            message: 'Brand settings not found'
          });
      });
    });

    describe('getConnectionStats', () => {
      it('should get connection statistics', async () => {
        MockedInvitation.countDocuments
          .mockResolvedValueOnce(10) // total
          .mockResolvedValueOnce(3)  // pending
          .mockResolvedValueOnce(5)  // accepted
          .mockResolvedValueOnce(2); // declined

        const result = await manufacturerService.getConnectionStats('manufacturer-id-123');

        expect(result).toEqual({
          totalConnections: 10,
          pendingInvitations: 3,
          acceptedInvitations: 5,
          declinedInvitations: 2
        });
      });
    });

    describe('getManufacturerAnalytics', () => {
      it('should get comprehensive manufacturer analytics', async () => {
        const manufacturerWithBrands = {
          ...mockManufacturer,
          brands: [{ _id: 'brand-1' }, { _id: 'brand-2' }]
        };

        MockedManufacturer.findById.mockReturnValue({
          populate: jest.fn().mockResolvedValue(manufacturerWithBrands)
        } as any);

        // Mock the private methods
        jest.spyOn(manufacturerService as any, 'getManufacturerMetric').mockResolvedValue(25);
        jest.spyOn(manufacturerService as any, 'getActiveBrandCollaborations').mockResolvedValue(3);
        jest.spyOn(manufacturerService as any, 'getNewBrandConnections').mockResolvedValue(1);
        jest.spyOn(manufacturerService as any, 'getPendingCollaborations').mockResolvedValue(2);
        jest.spyOn(manufacturerService as any, 'getCompletedCollaborations').mockResolvedValue(5);
        jest.spyOn(manufacturerService as any, 'getProductDemandAnalysis').mockResolvedValue({
          totalProducts: 10,
          opportunities: [],
          demandTrends: { increasing: 2, stable: 3, declining: 1 },
          recommendedForProduction: []
        });
        jest.spyOn(manufacturerService as any, 'getMarketInsights').mockResolvedValue({
          trends: { growthRate: '15%', direction: 'growing' },
          marketPosition: 'strong_player',
          competitiveAnalysis: { position: 'strong', marketShare: '12.5%' }
        });

        const result = await manufacturerService.getManufacturerAnalytics('manufacturer-id-123', {
          timeframe: '30d',
          metrics: ['connections', 'orders', 'certificates', 'product_selections'],
          includeProductDemand: true,
          includeMarketInsights: true
        });

        expect(result).toHaveProperty('summary');
        expect(result).toHaveProperty('brandMetrics');
        expect(result).toHaveProperty('collaborationMetrics');
        expect(result).toHaveProperty('productDemand');
        expect(result).toHaveProperty('marketData');
        expect(result.brandMetrics.totalConnected).toBe(2);
        expect(result.brandMetrics.activeCollaborations).toBe(3);
        expect(result.brandMetrics.newConnectionsInPeriod).toBe(1);
      });

      it('should throw error when manufacturer not found', async () => {
        MockedManufacturer.findById.mockReturnValue({
          populate: jest.fn().mockResolvedValue(null)
        } as any);

        await expect(manufacturerService.getManufacturerAnalytics('nonexistent-id'))
          .rejects.toThrow('Manufacturer not found');
      });
    });
  });

  describe('Search and Discovery Methods', () => {
    describe('searchManufacturers', () => {
      it('should search manufacturers with query', async () => {
        const mockSearchResults = [
          {
            _id: 'manufacturer-1',
            name: 'Textile Manufacturer',
            email: 'textile@manufacturer.com',
            industry: 'Textile',
            description: 'Specialized in textile manufacturing',
            servicesOffered: ['Cutting', 'Sewing'],
            moq: 100,
            isVerified: true,
            totalConnections: 5,
            createdAt: new Date('2023-01-01'),
            plan: 'professional'
          }
        ];

        MockedManufacturer.find.mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockSearchResults)
            })
          })
        } as any);

        const result = await manufacturerService.searchManufacturers('textile', {
          industry: 'Textile',
          verified: true,
          limit: 10
        });

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          id: 'manufacturer-1',
          name: 'Textile Manufacturer',
          industry: 'Textile',
          description: 'Specialized in textile manufacturing',
          servicesOffered: ['Cutting', 'Sewing'],
          profileCompleteness: expect.any(Number),
          isVerified: true,
          matchScore: expect.any(Number)
        });
      });

      it('should search manufacturers with filters', async () => {
        const mockSearchResults = [
          {
            _id: 'manufacturer-2',
            name: 'Electronics Manufacturer',
            email: 'electronics@manufacturer.com',
            industry: 'Electronics',
            description: 'Electronics manufacturing specialist',
            servicesOffered: ['Assembly', 'Testing'],
            moq: 50,
            isVerified: false,
            totalConnections: 2,
            createdAt: new Date('2023-02-01'),
            plan: 'starter'
          }
        ];

        MockedManufacturer.find.mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockSearchResults)
            })
          })
        } as any);

        const result = await manufacturerService.searchManufacturers('electronics', {
          industry: 'Electronics',
          minMoq: 25,
          maxMoq: 100,
          services: ['Assembly'],
          sortBy: 'relevance'
        });

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Electronics Manufacturer');
        expect(result[0].industry).toBe('Electronics');
      });
    });
  });

  describe('Utility Methods', () => {
    describe('verifyToken', () => {
      it('should verify valid JWT token', () => {
        const token = 'valid-jwt-token';
        
        const result = manufacturerService.verifyToken(token);

        expect(result).toEqual({
          manufacturerId: 'manufacturer-id-123',
          email: 'test@manufacturer.com',
          verified: false
        });
        expect(mockJWT.verify).toHaveBeenCalledWith(token, 'test-mfg-jwt-secret');
      });

      it('should throw error for invalid token', () => {
        mockJWT.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });

        expect(() => manufacturerService.verifyToken('invalid-token'))
          .toThrow();
      });
    });

    describe('getManufacturerById', () => {
      it('should get manufacturer by ID', async () => {
        MockedManufacturer.findById.mockReturnValue({
          select: jest.fn().mockResolvedValue(mockManufacturer)
        } as any);

        const result = await manufacturerService.getManufacturerById('manufacturer-id-123');

        expect(result).toMatchObject({
          id: 'manufacturer-id-123',
          name: 'Test Manufacturer',
          email: 'test@manufacturer.com',
          industry: 'Textile',
          description: 'A test manufacturer for textile products',
          contactEmail: 'contact@manufacturer.com',
          servicesOffered: ['Cutting', 'Sewing', 'Finishing'],
          moq: 100,
          profileCompleteness: expect.any(Number),
          isVerified: false,
          totalConnections: 0,
          joinDate: expect.any(Date),
          lastActive: expect.any(Date)
        });
      });

      it('should throw error when manufacturer not found', async () => {
        MockedManufacturer.findById.mockReturnValue({
          select: jest.fn().mockResolvedValue(null)
        } as any);

        await expect(manufacturerService.getManufacturerById('nonexistent-id'))
          .rejects.toMatchObject({
            statusCode: 404,
            message: 'Manufacturer not found'
          });
      });
    });

    describe('hasAccessToBrand', () => {
      it('should return true when manufacturer has access to brand', async () => {
        MockedManufacturer.findOne.mockResolvedValue(mockManufacturer);

        const result = await manufacturerService.hasAccessToBrand('manufacturer-id-123', 'brand-settings-id-123');

        expect(result).toBe(true);
        expect(MockedManufacturer.findOne).toHaveBeenCalledWith({
          _id: 'manufacturer-id-123',
          brands: 'brand-settings-id-123',
          isActive: true
        });
      });

      it('should return false when manufacturer does not have access', async () => {
        MockedManufacturer.findOne.mockResolvedValue(null);

        const result = await manufacturerService.hasAccessToBrand('manufacturer-id-123', 'brand-settings-id-123');

        expect(result).toBe(false);
      });
    });

    describe('getDashboardStats', () => {
      it('should get dashboard statistics', async () => {
        const mockConnectionStats = {
          totalConnections: 5,
          pendingInvitations: 2,
          acceptedInvitations: 3,
          declinedInvitations: 1
        };

        jest.spyOn(manufacturerService, 'getManufacturerById').mockResolvedValue({
          id: 'manufacturer-id-123',
          name: 'Test Manufacturer',
          email: 'test@manufacturer.com',
          profileCompleteness: 75,
          isVerified: false,
          totalConnections: 5,
          joinDate: new Date('2023-01-01'),
          lastActive: new Date('2023-12-01')
        } as any);

        jest.spyOn(manufacturerService, 'getConnectionStats').mockResolvedValue(mockConnectionStats);

        const result = await manufacturerService.getDashboardStats('manufacturer-id-123');

        expect(result).toHaveProperty('profile');
        expect(result).toHaveProperty('connectionStats');
        expect(result).toHaveProperty('recentActivity');
        expect(result).toHaveProperty('notifications');
        expect(result.profile.name).toBe('Test Manufacturer');
        expect(result.connectionStats).toEqual(mockConnectionStats);
        expect(result.notifications).toHaveLength(2); // Profile completeness and verification warnings
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      MockedManufacturer.findOne.mockRejectedValue(new Error('Database connection failed'));

      await expect(manufacturerService.login({
        email: 'test@manufacturer.com',
        password: 'SecurePass123!'
      })).rejects.toThrow('Database connection failed');
    });

    it('should handle JWT errors gracefully', async () => {
      mockJWT.sign.mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      MockedManufacturer.findOne.mockResolvedValue(null);
      MockedManufacturer.create.mockImplementation(() => Promise.resolve(mockManufacturer as any));

      await expect(manufacturerService.register({
        name: 'Test Manufacturer',
        email: 'test@manufacturer.com',
        password: 'SecurePass123!'
      })).rejects.toThrow('JWT signing failed');
    });
  });
});
