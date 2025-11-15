// src/services/blockchain/__tests__/supplyChain.service.test.ts

import { SupplyChainService } from '../supplyChain.service';
import { BlockchainProviderService } from '../provider.service';
import { BrandSettings } from '../../../models/brandSettings.model';
import { FactorySettings } from '../../../models/factorySettings.model';

// Mock dependencies
jest.mock('../provider.service');
jest.mock('../../../models/brandSettings.model');
jest.mock('../../../models/factorySettings.model');

const MockedBlockchainProviderService = BlockchainProviderService as jest.Mocked<typeof BlockchainProviderService>;
const MockedBrandSettings = BrandSettings as jest.Mocked<typeof BrandSettings>;
const MockedFactorySettings = FactorySettings as jest.Mocked<typeof FactorySettings>;

describe('SupplyChainService', () => {
  let mockBusinessId: string;
  let mockContractAddress: string;
  let mockManufacturerName: string;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock data
    mockBusinessId = '507f1f77bcf86cd799439011';
    mockContractAddress = '0x1234567890123456789012345678901234567890';
    mockManufacturerName = 'Test Manufacturer';
    
    // Mock environment variables
    process.env.CHAIN_ID = '8453';
    
    // Mock factory settings
    MockedFactorySettings.findOne.mockResolvedValue({
      address: '0x2222222222222222222222222222222222222222',
      type: 'supplychain'
    });
    
    // Mock brand settings
    MockedBrandSettings.findOne.mockResolvedValue({
      business: mockBusinessId,
      web3Settings: {
        supplyChainContract: mockContractAddress
      }
    });
    
    // Mock contract instances
    const mockFactoryContract = {
      estimateGas: {
        deploySupplyChain: jest.fn().mockResolvedValue(BigInt(1000000))
      },
      write: {
        deploySupplyChain: jest.fn()
      }
    };
    
    const mockSupplyChainContract = {
      write: {
        createEndpoint: jest.fn(),
        registerProduct: jest.fn(),
        logEvent: jest.fn()
      },
      read: {
        getContractStats: jest.fn().mockResolvedValue([
          BigInt(10), // totalEvents
          BigInt(5),  // totalProducts
          BigInt(3),  // totalEndpoints
          mockBusinessId,
          mockManufacturerName
        ]),
        getManufacturerEndpoints: jest.fn().mockResolvedValue([BigInt(1), BigInt(2)]),
        getEndpoint: jest.fn().mockResolvedValue({
          name: 'Test Endpoint',
          eventType: 'manufactured',
          location: 'Test Location',
          isActive: true,
          eventCount: BigInt(5),
          createdAt: BigInt(Math.floor(Date.now() / 1000))
        }),
        getManufacturerProducts: jest.fn().mockResolvedValue([BigInt(1), BigInt(2)]),
        getProduct: jest.fn().mockResolvedValue({
          productId: 'product-123',
          name: 'Test Product',
          description: 'Test Description',
          isActive: true,
          totalEvents: BigInt(3),
          createdAt: BigInt(Math.floor(Date.now() / 1000))
        }),
        getProductEvents: jest.fn().mockResolvedValue([BigInt(1), BigInt(2)]),
        getEvent: jest.fn().mockResolvedValue({
          endpointId: BigInt(1),
          productId: 'product-123',
          eventData: 'manufactured',
          timestamp: BigInt(Math.floor(Date.now() / 1000)),
          eventType: 'manufactured',
          location: 'Test Location',
          details: 'Test Details',
          loggedBy: '0x1111111111111111111111111111111111111111',
          isValid: true
        })
      }
    };
    
    // Mock provider service to return appropriate contracts
    MockedBlockchainProviderService.getContract.mockImplementation((address: string) => {
      if (address === '0x2222222222222222222222222222222222222222') {
        return mockFactoryContract as any;
      }
      return mockSupplyChainContract as any;
    });
    
    // Mock transaction receipts
    const mockReceipt = {
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      blockNumber: 12345,
      gasUsed: BigInt(100000),
      logs: [
        { address: mockContractAddress, topics: ['0x123'] }
      ]
    };
    
    mockFactoryContract.write.deploySupplyChain.mockResolvedValue({
      hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    });
    
    mockSupplyChainContract.write.createEndpoint.mockResolvedValue({
      hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    });
    
    mockSupplyChainContract.write.registerProduct.mockResolvedValue({
      hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    });
    
    mockSupplyChainContract.write.logEvent.mockResolvedValue({
      hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    });
    
    MockedBlockchainProviderService.waitForTransaction.mockResolvedValue(mockReceipt as any);
    
    // Mock BrandSettings.findOneAndUpdate
    MockedBrandSettings.findOneAndUpdate.mockResolvedValue({
      business: mockBusinessId,
      web3Settings: {
        supplyChainContract: mockContractAddress
      }
    });
  });

  describe('Contract Deployment', () => {
    describe('deploySupplyChainContract', () => {
      it('should deploy supply chain contract successfully', async () => {
        const result = await SupplyChainService.deploySupplyChainContract(
          mockBusinessId,
          mockManufacturerName
        );

        expect(result).toMatchObject({
          contractAddress: mockContractAddress,
          txHash: expect.any(String),
          blockNumber: 12345,
          gasUsed: '100000',
          deploymentCost: '10000000000000000',
          businessId: mockBusinessId,
          manufacturerName: mockManufacturerName
        });

        expect(MockedBrandSettings.findOneAndUpdate).toHaveBeenCalledWith(
          { business: mockBusinessId },
          {
            $set: {
              'web3Settings.supplyChainContract': mockContractAddress,
              'supplyChainSettings.contractDeployedAt': expect.any(Date),
              'supplyChainSettings.networkId': '8453'
            }
          },
          { upsert: true }
        );
      });

      it('should validate required parameters', async () => {
        await expect(SupplyChainService.deploySupplyChainContract('', mockManufacturerName))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Business ID is required'
          });

        await expect(SupplyChainService.deploySupplyChainContract(mockBusinessId, ''))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Manufacturer name is required'
          });
      });

      it('should handle deployment errors', async () => {
        MockedBlockchainProviderService.getContract.mockReturnValue({
          estimateGas: {
            deploySupplyChain: jest.fn().mockRejectedValue(new Error('Network error'))
          }
        } as any);

        await expect(SupplyChainService.deploySupplyChainContract(mockBusinessId, mockManufacturerName))
          .rejects.toMatchObject({
            statusCode: 500,
            message: expect.stringContaining('Failed to deploy SupplyChain contract')
          });
      });

      it('should handle insufficient funds', async () => {
        MockedBlockchainProviderService.getContract.mockReturnValue({
          estimateGas: {
            deploySupplyChain: jest.fn().mockRejectedValue({ code: 'INSUFFICIENT_FUNDS' })
          }
        } as any);

        await expect(SupplyChainService.deploySupplyChainContract(mockBusinessId, mockManufacturerName))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Insufficient funds for contract deployment'
          });
      });
    });
  });

  describe('Contract Interaction', () => {
    describe('createEndpoint', () => {
      it('should create endpoint successfully', async () => {
        const endpointData = {
          name: 'Manufacturing Plant',
          eventType: 'manufactured' as const,
          location: 'New York, NY'
        };

        const result = await SupplyChainService.createEndpoint(
          mockContractAddress,
          endpointData,
          mockBusinessId
        );

        expect(result).toMatchObject({
          endpointId: 0,
          txHash: expect.any(String)
        });

        expect(MockedBlockchainProviderService.getContract).toHaveBeenCalledWith(
          mockContractAddress,
          expect.any(Array)
        );
      });

      it('should validate business contract association', async () => {
        MockedBrandSettings.findOne.mockResolvedValue(null);

        const endpointData = {
          name: 'Manufacturing Plant',
          eventType: 'manufactured' as const,
          location: 'New York, NY'
        };

        await expect(SupplyChainService.createEndpoint(
          mockContractAddress,
          endpointData,
          mockBusinessId
        )).rejects.toMatchObject({
          statusCode: 500,
          message: expect.stringContaining('Failed to create endpoint')
        });
      });

      it('should handle creation errors', async () => {
        MockedBlockchainProviderService.getContract.mockReturnValue({
          write: {
            createEndpoint: jest.fn().mockRejectedValue(new Error('Creation failed'))
          }
        } as any);

        const endpointData = {
          name: 'Manufacturing Plant',
          eventType: 'manufactured' as const,
          location: 'New York, NY'
        };

        await expect(SupplyChainService.createEndpoint(
          mockContractAddress,
          endpointData,
          mockBusinessId
        )).rejects.toMatchObject({
          statusCode: 500,
          message: expect.stringContaining('Failed to create endpoint')
        });
      });
    });

    describe('registerProduct', () => {
      it('should register product successfully', async () => {
        const productData = {
          productId: 'product-123',
          name: 'Test Product',
          description: 'A test product'
        };

        const result = await SupplyChainService.registerProduct(
          mockContractAddress,
          productData,
          mockBusinessId
        );

        expect(result).toMatchObject({
          productId: 0,
          txHash: expect.any(String)
        });
      });

      it('should handle registration errors', async () => {
        MockedBlockchainProviderService.getContract.mockReturnValue({
          write: {
            registerProduct: jest.fn().mockRejectedValue(new Error('Registration failed'))
          }
        } as any);

        const productData = {
          productId: 'product-123',
          name: 'Test Product',
          description: 'A test product'
        };

        await expect(SupplyChainService.registerProduct(
          mockContractAddress,
          productData,
          mockBusinessId
        )).rejects.toMatchObject({
          statusCode: 500,
          message: expect.stringContaining('Failed to register product')
        });
      });
    });

    describe('logEvent', () => {
      it('should log event successfully', async () => {
        const eventData = {
          endpointId: 1,
          productId: 'product-123',
          eventType: 'manufactured',
          location: 'New York, NY',
          details: 'Product manufactured successfully'
        };

        const result = await SupplyChainService.logEvent(
          mockContractAddress,
          eventData,
          mockBusinessId
        );

        expect(result).toMatchObject({
          eventId: 0,
          txHash: expect.any(String)
        });
      });

      it('should handle logging errors', async () => {
        MockedBlockchainProviderService.getContract.mockReturnValue({
          write: {
            logEvent: jest.fn().mockRejectedValue(new Error('Logging failed'))
          }
        } as any);

        const eventData = {
          endpointId: 1,
          productId: 'product-123',
          eventType: 'manufactured',
          location: 'New York, NY',
          details: 'Product manufactured successfully'
        };

        await expect(SupplyChainService.logEvent(
          mockContractAddress,
          eventData,
          mockBusinessId
        )).rejects.toMatchObject({
          statusCode: 500,
          message: expect.stringContaining('Failed to log event')
        });
      });
    });
  });

  describe('Query Functions', () => {
    describe('getContractStats', () => {
      it('should get contract statistics', async () => {
        const result = await SupplyChainService.getContractStats(
          mockContractAddress,
          mockBusinessId
        );

        expect(result).toMatchObject({
          totalEvents: 10,
          totalProducts: 5,
          totalEndpoints: 3,
          businessId: mockBusinessId,
          manufacturerName: mockManufacturerName
        });
      });

      it('should handle stats errors', async () => {
        MockedBlockchainProviderService.getContract.mockReturnValue({
          read: {
            getContractStats: jest.fn().mockRejectedValue(new Error('Stats failed'))
          }
        } as any);

        await expect(SupplyChainService.getContractStats(
          mockContractAddress,
          mockBusinessId
        )).rejects.toMatchObject({
          statusCode: 500,
          message: expect.stringContaining('Failed to get contract stats')
        });
      });
    });

    describe('getEndpoints', () => {
      it('should get all endpoints', async () => {
        const result = await SupplyChainService.getEndpoints(
          mockContractAddress,
          mockBusinessId
        );

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          id: 1,
          name: 'Test Endpoint',
          eventType: 'manufactured',
          location: 'Test Location',
          isActive: true,
          eventCount: 5,
          createdAt: expect.any(Number)
        });
      });

      it('should handle endpoints errors', async () => {
        MockedBlockchainProviderService.getContract.mockReturnValue({
          read: {
            getManufacturerEndpoints: jest.fn().mockRejectedValue(new Error('Endpoints failed'))
          }
        } as any);

        await expect(SupplyChainService.getEndpoints(
          mockContractAddress,
          mockBusinessId
        )).rejects.toMatchObject({
          statusCode: 500,
          message: expect.stringContaining('Failed to get endpoints')
        });
      });
    });

    describe('getProducts', () => {
      it('should get all products', async () => {
        const result = await SupplyChainService.getProducts(
          mockContractAddress,
          mockBusinessId
        );

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          id: 1,
          productId: 'product-123',
          name: 'Test Product',
          description: 'Test Description',
          totalEvents: 3,
          createdAt: expect.any(Number),
          isActive: true
        });
      });

      it('should handle products errors', async () => {
        MockedBlockchainProviderService.getContract.mockReturnValue({
          read: {
            getManufacturerProducts: jest.fn().mockRejectedValue(new Error('Products failed'))
          }
        } as any);

        await expect(SupplyChainService.getProducts(
          mockContractAddress,
          mockBusinessId
        )).rejects.toMatchObject({
          statusCode: 500,
          message: expect.stringContaining('Failed to get products')
        });
      });
    });

    describe('getProductEvents', () => {
      it('should get product events', async () => {
        const result = await SupplyChainService.getProductEvents(
          mockContractAddress,
          'product-123',
          mockBusinessId
        );

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          id: 1,
          eventType: 'manufactured',
          productId: 'product-123',
          location: 'Test Location',
          details: 'Test Details',
          timestamp: expect.any(Number),
          loggedBy: '0x1111111111111111111111111111111111111111',
          isValid: true
        });
      });

      it('should handle product events errors', async () => {
        MockedBlockchainProviderService.getContract.mockReturnValue({
          read: {
            getProductEvents: jest.fn().mockRejectedValue(new Error('Events failed'))
          }
        } as any);

        await expect(SupplyChainService.getProductEvents(
          mockContractAddress,
          'product-123',
          mockBusinessId
        )).rejects.toMatchObject({
          statusCode: 500,
          message: expect.stringContaining('Failed to get product events')
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing factory settings', async () => {
      MockedFactorySettings.findOne.mockResolvedValue(null);

      await expect(SupplyChainService.deploySupplyChainContract(
        mockBusinessId,
        mockManufacturerName
      )).rejects.toMatchObject({
        statusCode: 500,
        message: 'SupplyChain factory not deployed. Please deploy factory first.'
      });
    });

    it('should handle network errors', async () => {
      MockedBlockchainProviderService.getContract.mockReturnValue({
        estimateGas: {
          deploySupplyChain: jest.fn().mockRejectedValue({ code: 'NETWORK_ERROR' })
        }
      } as any);

      await expect(SupplyChainService.deploySupplyChainContract(
        mockBusinessId,
        mockManufacturerName
      )).rejects.toMatchObject({
        statusCode: 503,
        message: 'Blockchain network error during deployment'
      });
    });

    it('should handle contract association mismatch', async () => {
      MockedBrandSettings.findOne.mockResolvedValue({
        business: mockBusinessId,
        web3Settings: {
          supplyChainContract: '0x9999999999999999999999999999999999999999' // Different address
        }
      });

      const endpointData = {
        name: 'Manufacturing Plant',
        eventType: 'manufactured' as const,
        location: 'New York, NY'
      };

      await expect(SupplyChainService.createEndpoint(
        mockContractAddress,
        endpointData,
        mockBusinessId
      )).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining('Failed to create endpoint')
      });
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SupplyChainService.getInstance();
      const instance2 = SupplyChainService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});
