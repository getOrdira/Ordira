// src/services/blockchain/__tests__/nft.service.test.ts

import { NftService } from '../nft.service';
import { BlockchainProviderService } from '../provider.service';
import { BrandSettings } from '../../../models/brandSettings.model';
import { Certificate } from '../../../models/certificate.model';
import { FactorySettings } from '../../../models/factorySettings.model';
import { S3Service } from '../../external/s3.service';
import { StorageService } from '../../business/storage.service';
import { createAppError } from '../../../middleware/error.middleware';
import sharp from 'sharp';
import crypto from 'crypto';

// Mock dependencies
jest.mock('../provider.service');
jest.mock('../../../models/brandSettings.model');
jest.mock('../../../models/certificate.model');
jest.mock('../../../models/factorySettings.model');
jest.mock('../../external/s3.service');
jest.mock('../../business/storage.service');
jest.mock('sharp');
jest.mock('crypto');

const MockedBlockchainProviderService = BlockchainProviderService as jest.Mocked<typeof BlockchainProviderService>;
const MockedBrandSettings = BrandSettings as jest.Mocked<typeof BrandSettings>;
const MockedCertificate = Certificate as jest.Mocked<typeof Certificate>;
const MockedFactorySettings = FactorySettings as jest.Mocked<typeof FactorySettings>;
const MockedS3Service = S3Service as jest.Mocked<typeof S3Service>;
const MockedStorageService = StorageService as jest.Mocked<typeof StorageService>;
const mockSharp = sharp as jest.Mocked<typeof sharp>;
const mockCrypto = crypto as jest.Mocked<typeof crypto>;

describe('NftService', () => {
  let nftService: NftService;
  let mockBusinessId: string;
  let mockContractAddress: string;
  let mockTokenId: string;
  let mockRecipient: string;

  beforeEach(() => {
    nftService = new NftService();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock data
    mockBusinessId = '507f1f77bcf86cd799439011';
    mockContractAddress = '0x1234567890123456789012345678901234567890';
    mockTokenId = '123';
    mockRecipient = '0x9876543210987654321098765432109876543210';
    
    // Mock environment variables
    process.env.RELAYER_WALLET_ADDRESS = '0x1111111111111111111111111111111111111111';
    process.env.FRONTEND_BASE_URL = 'https://app.example.com';
    process.env.BLOCKCHAIN_NETWORK = 'base';
    process.env.CHAIN_ID = '8453';
    
    // Mock factory settings
    MockedFactorySettings.findOne.mockResolvedValue({
      address: '0x2222222222222222222222222222222222222222',
      type: 'nft'
    });
    
    // Mock brand settings
    MockedBrandSettings.findOne.mockResolvedValue({
      business: mockBusinessId,
      web3Settings: {
        nftContract: mockContractAddress,
        networkName: 'base',
        chainId: 8453
      },
      shouldAutoTransfer: jest.fn().mockReturnValue(false),
      getTransferSettings: jest.fn().mockReturnValue({ transferDelay: 5 })
    });
    
    // Mock contract instances
    const mockContract = {
      deployNFTForSelf: jest.fn(),
      safeMint: jest.fn(),
      transferFrom: jest.fn(),
      name: jest.fn().mockResolvedValue('Test NFT'),
      symbol: jest.fn().mockResolvedValue('TNFT'),
      totalSupply: jest.fn().mockResolvedValue('100'),
      owner: jest.fn().mockResolvedValue('0x1111111111111111111111111111111111111111'),
      tokenURI: jest.fn().mockResolvedValue('https://example.com/metadata/123'),
      ownerOf: jest.fn().mockResolvedValue(mockRecipient)
    };
    
    MockedBlockchainProviderService.getContract.mockReturnValue(mockContract as any);
    MockedBlockchainProviderService.getReadOnlyContract.mockReturnValue(mockContract as any);
    
    // Mock transaction receipts
    const mockReceipt = {
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      blockNumber: 12345,
      gasUsed: BigInt(100000),
      effectiveGasPrice: BigInt(20000000000),
      events: [
        {
          event: 'NFTDeployed',
          args: { contractAddress: mockContractAddress }
        },
        {
          event: 'Transfer',
          args: { tokenId: mockTokenId }
        }
      ]
    };
    
    mockContract.deployNFTForSelf.mockResolvedValue({
      wait: jest.fn().mockResolvedValue(mockReceipt)
    });
    
    mockContract.safeMint.mockResolvedValue({
      wait: jest.fn().mockResolvedValue(mockReceipt)
    });
    
    mockContract.transferFrom.mockResolvedValue({
      wait: jest.fn().mockResolvedValue(mockReceipt)
    });
    
    // Mock S3Service
    MockedS3Service.uploadFile.mockResolvedValue({
      url: 'https://s3.amazonaws.com/bucket/test-image.png',
      key: 'test-key',
      etag: 'test-etag',
      location: 'https://s3.amazonaws.com/bucket/test-image.png',
      bucket: 'test-bucket'
    });
    
    // Mock Sharp
    const mockSharpInstance = {
      resize: jest.fn().mockReturnThis(),
      png: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-image-data')),
      composite: jest.fn().mockReturnThis()
    };
    
    (mockSharp as any).mockReturnValue(mockSharpInstance);
    
    // Mock crypto
    mockCrypto.randomBytes.mockImplementation(() => Buffer.from('random-data'));
    
    // Mock Certificate model
    MockedCertificate.create.mockImplementation(() => Promise.resolve({
      _id: 'certificate-id-123',
      business: mockBusinessId,
      tokenId: mockTokenId,
      contractAddress: mockContractAddress,
      recipient: mockRecipient,
      status: 'minted',
      txHash: mockReceipt.transactionHash,
      createdAt: new Date(),
      save: jest.fn().mockResolvedValue(true)
    } as any));
    
    MockedCertificate.findOne.mockResolvedValue({
      _id: 'certificate-id-123',
      business: mockBusinessId,
      tokenId: mockTokenId,
      contractAddress: mockContractAddress,
      recipient: mockRecipient,
      status: 'minted',
      txHash: mockReceipt.transactionHash,
      createdAt: new Date(),
      metadata: {
        imageUrl: 'https://s3.amazonaws.com/bucket/test-image.png',
        metadataUri: 'https://s3.amazonaws.com/bucket/metadata.json'
      }
    });
    
    MockedCertificate.findOneAndUpdate.mockResolvedValue({
      _id: 'certificate-id-123',
      business: mockBusinessId,
      tokenId: mockTokenId,
      contractAddress: mockContractAddress,
      recipient: mockRecipient,
      status: 'transferred_to_brand',
      transferTxHash: mockReceipt.transactionHash,
      transferredAt: new Date()
    });
    
    MockedCertificate.countDocuments.mockResolvedValue(10);
    MockedCertificate.aggregate.mockResolvedValue([
      {
        _id: null,
        totalTransfers: 5,
        totalCertificates: 10
      }
    ]);
    
    MockedCertificate.find.mockResolvedValue([
      {
        _id: 'certificate-id-123',
        tokenId: mockTokenId,
        status: 'minted',
        createdAt: new Date(),
        txHash: mockReceipt.transactionHash
      }
    ]);
  });

  describe('Contract Deployment', () => {
    describe('deployContract', () => {
      it('should deploy NFT contract successfully', async () => {
        const params = {
          name: 'Test NFT Collection',
          symbol: 'TNFT',
          baseUri: 'https://example.com/metadata/',
          description: 'Test collection',
          maxSupply: 1000
        };

        const result = await nftService.deployContract(params, mockBusinessId);

        expect(result).toMatchObject({
          contractId: expect.any(String),
          contractAddress: mockContractAddress,
          name: 'Test NFT Collection',
          symbol: 'TNFT',
          baseUri: 'https://example.com/metadata/',
          maxSupply: 1000,
          status: 'active',
          deployedAt: expect.any(Date),
          transactionHash: expect.any(String),
          blockNumber: 12345,
          gasUsed: '100000',
          businessId: mockBusinessId
        });

        expect(MockedBrandSettings.findOneAndUpdate).toHaveBeenCalledWith(
          { business: expect.any(Object) },
          {
            $set: {
              'web3Settings.nftContract': mockContractAddress,
              'web3Settings.networkName': 'base',
              'web3Settings.chainId': 8453
            }
          },
          { upsert: true }
        );
      });

      it('should validate required parameters', async () => {
        const params = {
          name: '',
          symbol: 'TNFT',
          baseUri: 'https://example.com/metadata/'
        };

        await expect(nftService.deployContract(params, mockBusinessId))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Contract name is required'
          });
      });

      it('should validate business ID format', async () => {
        const params = {
          name: 'Test NFT',
          symbol: 'TNFT',
          baseUri: 'https://example.com/metadata/'
        };

        await expect(nftService.deployContract(params, 'invalid-id'))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid business ID format'
          });
      });

      it('should handle deployment errors', async () => {
        const params = {
          name: 'Test NFT',
          symbol: 'TNFT',
          baseUri: 'https://example.com/metadata/'
        };

        MockedBlockchainProviderService.getContract.mockReturnValue({
          deployNFTForSelf: jest.fn().mockRejectedValue(new Error('Network error'))
        } as any);

        await expect(nftService.deployContract(params, mockBusinessId))
          .rejects.toMatchObject({
            statusCode: 500,
            message: expect.stringContaining('Failed to deploy NFT contract')
          });
      });
    });

    describe('listContracts', () => {
      it('should list contracts for business', async () => {
        const result = await nftService.listContracts(mockBusinessId);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          contractAddress: mockContractAddress,
          name: 'Test NFT',
          symbol: 'TNFT',
          status: 'active',
          totalSupply: 100,
          maxSupply: 100
        });
      });

      it('should return empty array when no contracts', async () => {
        MockedBrandSettings.findOne.mockResolvedValue(null);

        const result = await nftService.listContracts(mockBusinessId);

        expect(result).toHaveLength(0);
      });
    });
  });

  describe('NFT Minting', () => {
    describe('mintNft', () => {
      it('should mint NFT successfully', async () => {
        const params = {
          productId: 'product-123',
          recipient: mockRecipient,
          metadata: {
            name: 'Test Certificate',
            description: 'A test certificate',
            attributes: [
              { trait_type: 'Type', value: 'Certificate' }
            ]
          },
          customMessage: 'Congratulations!'
        };

        const result = await nftService.mintNft(mockBusinessId, params);

        expect(result).toMatchObject({
          tokenId: mockTokenId,
          contractAddress: mockContractAddress,
          recipient: mockRecipient,
          metadata: expect.objectContaining({
            name: 'Test Certificate',
            description: 'A test certificate',
            image: expect.any(String),
            external_url: expect.any(String),
            attributes: expect.any(Array),
            certificate: expect.objectContaining({
              recipient: mockRecipient,
              certificateId: mockTokenId
            })
          }),
          metadataUri: expect.any(String),
          imageUrl: expect.any(String),
          mintedAt: expect.any(Date),
          transactionHash: expect.any(String),
          blockNumber: 12345,
          certificateId: 'certificate-id-123',
          verificationUrl: expect.any(String),
          s3Keys: expect.objectContaining({
            metadata: expect.any(String),
            image: expect.any(String)
          })
        });

        expect(MockedCertificate.create).toHaveBeenCalledWith(
          expect.objectContaining({
            business: mockBusinessId,
            product: 'product-123',
            recipient: mockRecipient,
            tokenId: mockTokenId,
            contractAddress: mockContractAddress,
            status: 'minted',
            mintedToRelayer: true
          })
        );
      });

      it('should validate recipient address', async () => {
        const params = {
          productId: 'product-123',
          recipient: 'invalid-address'
        };

        await expect(nftService.mintNft(mockBusinessId, params))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid recipient address format'
          });
      });

      it('should handle missing contract', async () => {
        MockedBrandSettings.findOne.mockResolvedValue({
          business: mockBusinessId,
          web3Settings: {}
        });

        const params = {
          productId: 'product-123',
          recipient: mockRecipient
        };

        await expect(nftService.mintNft(mockBusinessId, params))
          .rejects.toMatchObject({
            statusCode: 404,
            message: 'No NFT contract found for this business'
          });
      });

      it('should handle minting errors', async () => {
        MockedBlockchainProviderService.getContract.mockReturnValue({
          safeMint: jest.fn().mockRejectedValue(new Error('Insufficient funds'))
        } as any);

        const params = {
          productId: 'product-123',
          recipient: mockRecipient
        };

        await expect(nftService.mintNft(mockBusinessId, params))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Insufficient funds for minting transaction'
          });
      });
    });
  });

  describe('NFT Transfer', () => {
    describe('transferNft', () => {
      it('should transfer NFT successfully', async () => {
        const params = {
          tokenId: mockTokenId,
          contractAddress: mockContractAddress,
          fromAddress: '0x1111111111111111111111111111111111111111',
          toAddress: mockRecipient
        };

        const result = await nftService.transferNft(mockBusinessId, params);

        expect(result).toMatchObject({
          transferredAt: expect.any(Date),
          transactionHash: expect.any(String),
          txHash: expect.any(String),
          blockNumber: 12345,
          gasUsed: '100000',
          verificationUrl: expect.any(String),
          ownershipProof: expect.any(String),
          from: '0x1111111111111111111111111111111111111111',
          to: mockRecipient,
          tokenId: mockTokenId,
          contractAddress: mockContractAddress,
          businessId: mockBusinessId,
          tokenType: 'ERC721',
          success: true
        });

        expect(MockedCertificate.findOneAndUpdate).toHaveBeenCalledWith(
          { business: mockBusinessId, tokenId: mockTokenId, contractAddress: mockContractAddress },
          {
            $set: {
              status: 'transferred_to_brand',
              transferredToBrand: true,
              transferTxHash: expect.any(String),
              transferredAt: expect.any(Date)
            }
          }
        );
      });

      it('should validate addresses', async () => {
        const params = {
          tokenId: mockTokenId,
          contractAddress: 'invalid-address',
          fromAddress: '0x1111111111111111111111111111111111111111',
          toAddress: mockRecipient
        };

        await expect(nftService.transferNft(mockBusinessId, params))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid contract address format'
          });
      });

      it('should handle transfer errors', async () => {
        MockedBlockchainProviderService.getContract.mockReturnValue({
          transferFrom: jest.fn().mockRejectedValue(new Error('Transfer failed'))
        } as any);

        const params = {
          tokenId: mockTokenId,
          contractAddress: mockContractAddress,
          fromAddress: '0x1111111111111111111111111111111111111111',
          toAddress: mockRecipient
        };

        await expect(nftService.transferNft(mockBusinessId, params))
          .rejects.toMatchObject({
            statusCode: 500,
            message: expect.stringContaining('Failed to transfer NFT')
          });
      });
    });
  });

  describe('NFT Verification', () => {
    describe('verifyNftAuthenticity', () => {
      it('should verify NFT authenticity successfully', async () => {
        const result = await nftService.verifyNftAuthenticity(mockTokenId, mockContractAddress);

        expect(result).toMatchObject({
          isAuthentic: true,
          owner: mockRecipient,
          mintedAt: expect.any(Date),
          metadata: expect.objectContaining({
            name: expect.any(String),
            description: expect.any(String),
            image: expect.any(String),
            external_url: expect.any(String),
            certificate: expect.objectContaining({
              recipient: mockRecipient,
              certificateId: mockTokenId
            })
          }),
          network: 'base',
          blockNumber: 0,
          transactionHash: expect.any(String),
          certificate: expect.any(Object),
          imageUrl: expect.any(String),
          metadataUrl: expect.any(String)
        });
      });

      it('should validate contract address', async () => {
        await expect(nftService.verifyNftAuthenticity(mockTokenId, 'invalid-address'))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid contract address format'
          });
      });

      it('should handle verification errors', async () => {
        MockedBlockchainProviderService.getReadOnlyContract.mockReturnValue({
          ownerOf: jest.fn().mockRejectedValue(new Error('Token not found'))
        } as any);

        await expect(nftService.verifyNftAuthenticity(mockTokenId, mockContractAddress))
          .rejects.toMatchObject({
            statusCode: 500,
            message: expect.stringContaining('Failed to verify NFT')
          });
      });
    });
  });

  describe('Certificate Management', () => {
    describe('listCertificates', () => {
      it('should list certificates with default options', async () => {
        const result = await nftService.listCertificates(mockBusinessId);

        expect(result).toMatchObject({
          certificates: expect.any(Array),
          total: 10
        });

        expect(MockedCertificate.find).toHaveBeenCalledWith(
          { business: mockBusinessId },
          expect.any(Object),
          expect.any(Object)
        );
      });

      it('should list certificates with filters', async () => {
        const options = {
          productId: 'product-123',
          status: 'minted',
          limit: 10,
          offset: 0
        };

        const result = await nftService.listCertificates(mockBusinessId, options);

        expect(result).toMatchObject({
          certificates: expect.any(Array),
          total: 10
        });

        expect(MockedCertificate.find).toHaveBeenCalledWith(
          { business: mockBusinessId, product: 'product-123', status: 'minted' },
          expect.any(Object),
          expect.any(Object)
        );
      });
    });

    describe('getCertificateAnalytics', () => {
      it('should get certificate analytics', async () => {
        const result = await nftService.getCertificateAnalytics(mockBusinessId);

        expect(result).toMatchObject({
          totalCertificates: 10,
          mintedThisMonth: expect.any(Number),
          transferSuccessRate: expect.any(Number),
          averageGasCost: '0.001',
          topProducts: expect.any(Array),
          storageUsed: expect.any(String),
          totalFiles: expect.any(Number)
        });
      });
    });

    describe('getAnalytics', () => {
      it('should get comprehensive analytics', async () => {
        const result = await nftService.getAnalytics(mockBusinessId);

        expect(result).toMatchObject({
          summary: expect.objectContaining({
            totalContracts: 1,
            totalMinted: expect.any(Number),
            totalTransferred: expect.any(Number),
            revenue: '0'
          }),
          trends: expect.any(Array),
          performance: expect.objectContaining({
            mintSuccessRate: 95,
            transferSuccessRate: expect.any(Number),
            averageGasCost: '0.001'
          }),
          topProducts: expect.any(Array),
          recentActivity: expect.any(Array),
          storage: expect.objectContaining({
            totalFiles: expect.any(Number),
            totalSize: expect.any(String),
            s3Usage: expect.any(String)
          })
        });
      });
    });
  });

  describe('Utility Methods', () => {
    describe('getContractMetadata', () => {
      it('should get contract metadata', async () => {
        const result = await nftService.getContractMetadata(mockContractAddress, mockBusinessId);

        expect(result).toMatchObject({
          contractAddress: mockContractAddress,
          totalSupply: 100,
          name: 'Test NFT',
          symbol: 'TNFT',
          owner: '0x1111111111111111111111111111111111111111',
          businessId: mockBusinessId
        });
      });

      it('should handle contract not found', async () => {
        MockedBlockchainProviderService.getReadOnlyContract.mockReturnValue({
          name: jest.fn().mockRejectedValue(new Error('Contract not found'))
        } as any);

        await expect(nftService.getContractMetadata(mockContractAddress, mockBusinessId))
          .rejects.toMatchObject({
            statusCode: 404,
            message: 'Contract not found or not a valid ERC721 contract'
          });
      });
    });

    describe('getTokenURI', () => {
      it('should get token URI', async () => {
        const result = await nftService.getTokenURI(mockContractAddress, mockTokenId);

        expect(result).toBe('https://example.com/metadata/123');
      });

      it('should handle token not found', async () => {
        MockedBlockchainProviderService.getReadOnlyContract.mockReturnValue({
          tokenURI: jest.fn().mockRejectedValue(new Error('Token not found'))
        } as any);

        await expect(nftService.getTokenURI(mockContractAddress, mockTokenId))
          .rejects.toMatchObject({
            statusCode: 404,
            message: 'Token not found or contract unavailable'
          });
      });
    });

    describe('getTokenOwner', () => {
      it('should get token owner', async () => {
        const result = await nftService.getTokenOwner(mockContractAddress, mockTokenId);

        expect(result).toBe(mockRecipient);
      });

      it('should handle token not found', async () => {
        MockedBlockchainProviderService.getReadOnlyContract.mockReturnValue({
          ownerOf: jest.fn().mockRejectedValue(new Error('Token not found'))
        } as any);

        await expect(nftService.getTokenOwner(mockContractAddress, mockTokenId))
          .rejects.toMatchObject({
            statusCode: 404,
            message: 'Token not found or contract unavailable'
          });
      });
    });
  });

  describe('S3 Storage Methods', () => {
    describe('uploadCertificateTemplate', () => {
      it('should upload certificate template successfully', async () => {
        const templateFile = Buffer.from('fake-template-data');
        const templateName = 'test-template';
        const metadata = { category: 'certificate' };

        const result = await nftService.uploadCertificateTemplate(
          mockBusinessId,
          templateFile,
          templateName,
          metadata
        );

        expect(result).toMatchObject({
          templateId: expect.any(String),
          templateUrl: expect.any(String),
          s3Key: expect.any(String),
          previewUrl: expect.any(String)
        });

        expect(MockedS3Service.uploadFile).toHaveBeenCalledTimes(2); // Template + preview
      });

      it('should validate required parameters', async () => {
        await expect(nftService.uploadCertificateTemplate('', Buffer.from('data'), 'name'))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Business ID is required'
          });
      });
    });

    describe('generateCertificateImage', () => {
      it('should generate certificate image successfully', async () => {
        const certificateData = {
          recipient: 'John Doe',
          productName: 'Test Product',
          issuedAt: new Date(),
          tokenId: mockTokenId,
          customMessage: 'Congratulations!'
        };

        const options = {
          backgroundColor: '#ffffff',
          textColor: '#333333',
          customMessage: 'Well done!'
        };

        const result = await nftService.generateCertificateImage(mockBusinessId, certificateData, options);

        expect(result).toMatchObject({
          imageUrl: expect.any(String),
          s3Key: expect.any(String),
          thumbnailUrl: expect.any(String)
        });

        expect(MockedS3Service.uploadFile).toHaveBeenCalledTimes(2); // Image + thumbnail
      });

      it('should validate required parameters', async () => {
        const certificateData = {
          recipient: '',
          productName: 'Test Product',
          issuedAt: new Date(),
          tokenId: mockTokenId
        };

        await expect(nftService.generateCertificateImage(mockBusinessId, certificateData))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Recipient is required'
          });
      });
    });

    describe('uploadNftMetadata', () => {
      it('should upload NFT metadata successfully', async () => {
        const metadata = {
          name: 'Test NFT',
          description: 'A test NFT',
          image: 'https://example.com/image.png',
          attributes: [
            { trait_type: 'Type', value: 'Certificate' }
          ]
        };

        const result = await nftService.uploadNftMetadata(mockBusinessId, mockTokenId, metadata);

        expect(result).toMatchObject({
          metadataUrl: expect.any(String),
          s3Key: expect.any(String)
        });

        expect(MockedS3Service.uploadFile).toHaveBeenCalledWith(
          expect.any(Buffer),
          expect.objectContaining({
            businessId: mockBusinessId,
            resourceId: 'nft-metadata',
            filename: expect.any(String),
            mimeType: 'application/json',
            isPublic: true
          })
        );
      });

      it('should validate metadata object', async () => {
        const metadata = {
          name: '',
          description: 'A test NFT',
          image: 'https://example.com/image.png'
        };

        await expect(nftService.uploadNftMetadata(mockBusinessId, mockTokenId, metadata))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Metadata name is required'
          });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing environment variables', async () => {
      delete process.env.RELAYER_WALLET_ADDRESS;

      const params = {
        productId: 'product-123',
        recipient: mockRecipient
      };

      await expect(nftService.mintNft(mockBusinessId, params))
        .rejects.toMatchObject({
          statusCode: 500,
          message: 'RELAYER_WALLET_ADDRESS not configured'
        });
    });

    it('should handle network errors', async () => {
      MockedBlockchainProviderService.getContract.mockReturnValue({
        deployNFTForSelf: jest.fn().mockRejectedValue({ code: 'NETWORK_ERROR' })
      } as any);

      const params = {
        name: 'Test NFT',
        symbol: 'TNFT',
        baseUri: 'https://example.com/metadata/'
      };

      await expect(nftService.deployContract(params, mockBusinessId))
        .rejects.toMatchObject({
          statusCode: 503,
          message: 'Blockchain network error during deployment'
        });
    });

    it('should handle insufficient funds', async () => {
      MockedBlockchainProviderService.getContract.mockReturnValue({
        safeMint: jest.fn().mockRejectedValue({ code: 'INSUFFICIENT_FUNDS' })
      } as any);

      const params = {
        productId: 'product-123',
        recipient: mockRecipient
      };

      await expect(nftService.mintNft(mockBusinessId, params))
        .rejects.toMatchObject({
          statusCode: 400,
          message: 'Insufficient funds for minting transaction'
        });
    });
  });
});
