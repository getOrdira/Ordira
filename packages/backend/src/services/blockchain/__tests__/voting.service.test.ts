// src/services/blockchain/__tests__/voting.service.test.ts

import { VotingService } from '../voting.service';
import { BlockchainProviderService } from '../provider.service';
import { BrandSettings } from '../../../models/brandSettings.model';
import { FactorySettings } from '../../../models/factorySettings.model';
import { getBytes } from 'ethers';

// Mock dependencies
jest.mock('../provider.service');
jest.mock('../../../models/brandSettings.model');
jest.mock('../../../models/factorySettings.model');
jest.mock('ethers', () => ({
  ...jest.requireActual('ethers'),
  getBytes: jest.fn()
}));

const MockedBlockchainProviderService = BlockchainProviderService as jest.Mocked<typeof BlockchainProviderService>;
const MockedBrandSettings = BrandSettings as jest.Mocked<typeof BrandSettings>;
const MockedFactorySettings = FactorySettings as jest.Mocked<typeof FactorySettings>;
const mockGetBytes = getBytes as jest.MockedFunction<typeof getBytes>;

describe('VotingService', () => {
  let mockBusinessId: string;
  let mockContractAddress: string;
  let mockProposalId: string;
  let mockVoterEmail: string;
  let mockVoteId: string;
  let mockSignature: string;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock data
    mockBusinessId = '507f1f77bcf86cd799439011';
    mockContractAddress = '0x1234567890123456789012345678901234567890';
    mockProposalId = '1';
    mockVoterEmail = 'voter@example.com';
    mockVoteId = '12345';
    mockSignature = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12';
    
    // Mock environment variables
    process.env.BLOCKCHAIN_NETWORK = 'base';
    process.env.CHAIN_ID = '8453';
    process.env.METADATA_BASE_URL = 'https://metadata.example.com';
    
    // Mock factory settings
    MockedFactorySettings.findOne.mockResolvedValue({
      address: '0x2222222222222222222222222222222222222222',
      type: 'voting'
    });
    
    // Mock brand settings
    MockedBrandSettings.findOne.mockResolvedValue({
      business: mockBusinessId,
      web3Settings: {
        votingContract: mockContractAddress,
        networkName: 'base',
        chainId: 8453
      }
    });
    
    // Mock contract instances
    const mockFactoryContract = {
      deployVotingForSelf: jest.fn(),
      getContractBrand: jest.fn().mockResolvedValue(mockBusinessId)
    };
    
    const mockVotingContract = {
      createProposal: jest.fn(),
      batchSubmitVote: jest.fn(),
      submitVote: jest.fn(),
      queryFilter: jest.fn(),
      filters: {
        ProposalCreated: jest.fn().mockReturnValue('proposal-filter'),
        VoteCast: jest.fn().mockReturnValue('vote-filter')
      },
      proposalCount: jest.fn().mockResolvedValue(BigInt(5)),
      proposals: jest.fn().mockResolvedValue({
        startTime: BigInt(Math.floor(Date.now() / 1000)),
        endTime: BigInt(Math.floor(Date.now() / 1000) + 259200),
        selectionCount: BigInt(10),
        creator: '0x1111111111111111111111111111111111111111'
      }),
      proposalUri: jest.fn().mockResolvedValue('https://metadata.example.com/proposal/1'),
      hasVotedByEmail: jest.fn().mockResolvedValue(false),
      getEmailVoterSelections: jest.fn().mockResolvedValue([BigInt(1), BigInt(2)])
    };
    
    // Mock provider service to return appropriate contracts
    MockedBlockchainProviderService.getContract.mockImplementation((address: string) => {
      if (address === '0x2222222222222222222222222222222222222222') {
        return mockFactoryContract as any;
      }
      return mockVotingContract as any;
    });
    
    MockedBlockchainProviderService.getReadOnlyContract.mockReturnValue(mockVotingContract as any);
    
    // Mock transaction receipts
    const mockReceipt = {
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      blockNumber: 12345,
      gasUsed: BigInt(100000),
      events: [
        {
          event: 'VotingDeployed',
          args: { votingAddress: mockContractAddress }
        },
        {
          event: 'ProposalCreated',
          args: { proposalId: BigInt(1) }
        }
      ]
    };
    
    mockFactoryContract.deployVotingForSelf.mockResolvedValue({
      wait: jest.fn().mockResolvedValue(mockReceipt)
    });
    
    mockVotingContract.createProposal.mockResolvedValue({
      wait: jest.fn().mockResolvedValue(mockReceipt)
    });
    
    mockVotingContract.batchSubmitVote.mockResolvedValue({
      wait: jest.fn().mockResolvedValue(mockReceipt)
    });
    
    mockVotingContract.submitVote.mockResolvedValue({
      wait: jest.fn().mockResolvedValue(mockReceipt)
    });
    
    // Mock query filter results
    const mockProposalEvents = [
      {
        args: { proposalId: BigInt(1), metadataUri: 'https://metadata.example.com/proposal/1' },
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      }
    ];
    
    const mockVoteEvents = [
      {
        args: { 
          voteId: '12345', 
          voter: '0x1111111111111111111111111111111111111111', 
          proposalId: BigInt(1)
        },
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        blockNumber: 12345
      }
    ];
    
    // Mock queryFilter to return different results based on the filter
    mockVotingContract.queryFilter.mockImplementation((filter) => {
      if (filter === 'proposal-filter') {
        return Promise.resolve(mockProposalEvents as any);
      } else if (filter === 'vote-filter') {
        return Promise.resolve(mockVoteEvents as any);
      }
      return Promise.resolve([]);
    });
    
    // Mock getBytes
    mockGetBytes.mockReturnValue(new Uint8Array([1, 2, 3, 4, 5]));
    
    // Mock BrandSettings.findOneAndUpdate
    MockedBrandSettings.findOneAndUpdate.mockResolvedValue({
      business: mockBusinessId,
      web3Settings: {
        votingContract: mockContractAddress
      }
    });
  });

  describe('Contract Deployment', () => {
    describe('deployVotingContract', () => {
      it('should deploy voting contract successfully', async () => {
        const votingSettings = {
          votingDelay: 1,
          votingPeriod: 259200,
          quorumPercentage: 4
        };

        const result = await VotingService.deployVotingContract(
          mockBusinessId,
          votingSettings
        );

        expect(result).toMatchObject({
          address: mockContractAddress,
          txHash: expect.any(String),
          blockNumber: 12345,
          gasUsed: '100000',
          businessId: mockBusinessId,
          votingSettings: {
            votingDelay: 1,
            votingPeriod: 259200,
            quorumPercentage: 4
          }
        });

        expect(MockedBrandSettings.findOneAndUpdate).toHaveBeenCalledWith(
          { business: mockBusinessId },
          {
            $set: {
              'web3Settings.votingContract': mockContractAddress,
              'web3Settings.networkName': 'base',
              'web3Settings.chainId': 8453
            }
          },
          { upsert: true }
        );
      });

      it('should use default settings when not provided', async () => {
        const result = await VotingService.deployVotingContract(mockBusinessId);

        expect(result.votingSettings).toMatchObject({
          votingDelay: 1,
          votingPeriod: 259200,
          quorumPercentage: 4
        });
      });

      it('should validate required parameters', async () => {
        await expect(VotingService.deployVotingContract(''))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Business ID is required'
          });
      });

      it('should validate business ID format', async () => {
        await expect(VotingService.deployVotingContract('invalid-id'))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid business ID format'
          });
      });

      it('should handle deployment errors', async () => {
        MockedBlockchainProviderService.getContract.mockReturnValue({
          deployVotingForSelf: jest.fn().mockRejectedValue(new Error('Network error'))
        } as any);

        await expect(VotingService.deployVotingContract(mockBusinessId))
          .rejects.toMatchObject({
            statusCode: 500,
            message: expect.stringContaining('Failed to deploy voting contract')
          });
      });

      it('should handle insufficient funds', async () => {
        MockedBlockchainProviderService.getContract.mockReturnValue({
          deployVotingForSelf: jest.fn().mockRejectedValue({ code: 'INSUFFICIENT_FUNDS' })
        } as any);

        await expect(VotingService.deployVotingContract(mockBusinessId))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Insufficient funds for voting contract deployment'
          });
      });
    });
  });

  describe('Proposal Management', () => {
    describe('createProposal', () => {
      it('should create proposal successfully', async () => {
        const metadataUri = 'https://metadata.example.com/proposal/1';

        const result = await VotingService.createProposal(
          mockContractAddress,
          metadataUri,
          mockBusinessId
        );

        expect(result).toMatchObject({
          proposalId: mockProposalId,
          txHash: expect.any(String),
          businessId: mockBusinessId
        });
      });

      it('should validate input parameters', async () => {
        await expect(VotingService.createProposal('', 'metadata-uri', mockBusinessId))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Contract address is required'
          });

        await expect(VotingService.createProposal(mockContractAddress, '', mockBusinessId))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Metadata URI is required'
          });

        await expect(VotingService.createProposal(mockContractAddress, 'metadata-uri', ''))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Business ID is required'
          });
      });

      it('should validate address format', async () => {
        await expect(VotingService.createProposal('invalid-address', 'metadata-uri', mockBusinessId))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid contract address format'
          });
      });

      it('should validate business contract association', async () => {
        MockedBrandSettings.findOne.mockResolvedValue(null);

        await expect(VotingService.createProposal(
          mockContractAddress,
          'metadata-uri',
          mockBusinessId
        )).rejects.toMatchObject({
          statusCode: 403,
          message: expect.stringContaining('Business')
        });
      });

      it('should handle creation errors', async () => {
        // Mock the contract to fail on createProposal but pass validation
        const mockFailingContract = {
          createProposal: jest.fn().mockRejectedValue(new Error('Creation failed'))
        };
        
        // Ensure the validation passes by mocking BrandSettings.findOne to return the correct business
        MockedBrandSettings.findOne.mockResolvedValue({
          business: mockBusinessId,
          web3Settings: {
            votingContract: mockContractAddress
          }
        });
        
        MockedBlockchainProviderService.getContract.mockReturnValue(mockFailingContract as any);

        await expect(VotingService.createProposal(
          mockContractAddress,
          'metadata-uri',
          mockBusinessId
        )).rejects.toMatchObject({
          statusCode: 500,
          message: expect.stringContaining('Failed to create proposal')
        });
      });
    });

    describe('createProductProposal', () => {
      it('should create product proposal successfully', async () => {
        const proposalData = {
          productId: 'product-123',
          title: 'Test Product',
          description: 'A test product',
          images: ['https://example.com/image1.jpg'],
          brandId: mockBusinessId,
          category: 'Electronics',
          price: 99.99,
          features: ['Feature 1', 'Feature 2']
        };

        const result = await VotingService.createProductProposal(
          mockContractAddress,
          proposalData,
          mockBusinessId
        );

        expect(result).toMatchObject({
          proposalId: mockProposalId,
          txHash: expect.any(String),
          businessId: mockBusinessId
        });
      });

      it('should validate proposal data', async () => {
        const proposalData = {
          productId: '',
          title: 'Test Product',
          description: 'A test product',
          images: ['https://example.com/image1.jpg'],
          brandId: mockBusinessId
        };

        await expect(VotingService.createProductProposal(
          mockContractAddress,
          proposalData,
          mockBusinessId
        )).rejects.toMatchObject({
          statusCode: 400,
          message: 'Product ID is required'
        });
      });

      it('should validate brand ID match', async () => {
        const proposalData = {
          productId: 'product-123',
          title: 'Test Product',
          description: 'A test product',
          images: ['https://example.com/image1.jpg'],
          brandId: 'different-business-id'
        };

        await expect(VotingService.createProductProposal(
          mockContractAddress,
          proposalData,
          mockBusinessId
        )).rejects.toMatchObject({
          statusCode: 403,
          message: expect.stringContaining('Proposal brand ID')
        });
      });
    });
  });

  describe('Vote Management', () => {
    describe('submitVote', () => {
      it('should submit vote successfully', async () => {
        const selectedProposals = ['1', '2'];

        const result = await VotingService.submitVote(
          mockContractAddress,
          selectedProposals,
          mockVoterEmail,
          mockVoteId,
          mockSignature
        );

        expect(result).toMatchObject({
          txHash: expect.any(String),
          voteId: mockVoteId
        });
      });

      it('should validate input parameters', async () => {
        await expect(VotingService.submitVote('', ['1'], mockVoterEmail, mockVoteId, mockSignature))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Contract address is required'
          });

        await expect(VotingService.submitVote(mockContractAddress, [], mockVoterEmail, mockVoteId, mockSignature))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Selected proposals array is required and cannot be empty'
          });

        await expect(VotingService.submitVote(mockContractAddress, ['1'], '', mockVoteId, mockSignature))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Voter email is required'
          });
      });

      it('should validate proposal IDs', async () => {
        await expect(VotingService.submitVote(
          mockContractAddress,
          ['invalid-id'],
          mockVoterEmail,
          mockVoteId,
          mockSignature
        )).rejects.toMatchObject({
          statusCode: 400,
          message: 'Invalid proposal ID format: invalid-id'
        });
      });

      it('should handle submission errors', async () => {
        MockedBlockchainProviderService.getContract.mockReturnValue({
          submitVote: jest.fn().mockRejectedValue(new Error('Submission failed'))
        } as any);

        await expect(VotingService.submitVote(
          mockContractAddress,
          ['1'],
          mockVoterEmail,
          mockVoteId,
          mockSignature
        )).rejects.toMatchObject({
          statusCode: 500,
          message: expect.stringContaining('Failed to submit vote')
        });
      });
    });

    describe('batchSubmitVotes', () => {
      it('should submit batch votes successfully', async () => {
        const selectedProposalsArray = [['1', '2'], ['3', '4']];
        const voteIds = ['12345', '67890'];
        const voterEmails = ['voter1@example.com', 'voter2@example.com'];
        const signatures = [mockSignature, mockSignature];

        const result = await VotingService.batchSubmitVotes(
          mockContractAddress,
          selectedProposalsArray,
          voteIds,
          voterEmails,
          signatures
        );

        expect(result).toMatchObject({
          txHash: expect.any(String),
          voteCount: 2
        });
      });

      it('should validate array lengths match', async () => {
        const selectedProposalsArray = [['1', '2']];
        const voteIds = ['12345', '67890']; // Different length
        const voterEmails = ['voter1@example.com'];
        const signatures = [mockSignature];

        await expect(VotingService.batchSubmitVotes(
          mockContractAddress,
          selectedProposalsArray,
          voteIds,
          voterEmails,
          signatures
        )).rejects.toMatchObject({
          statusCode: 400,
          message: 'All arrays must have the same length'
        });
      });

      it('should handle batch submission errors', async () => {
        MockedBlockchainProviderService.getContract.mockReturnValue({
          batchSubmitVote: jest.fn().mockRejectedValue(new Error('Batch submission failed'))
        } as any);

        const selectedProposalsArray = [['1', '2']];
        const voteIds = ['12345'];
        const voterEmails = ['voter1@example.com'];
        const signatures = [mockSignature];

        await expect(VotingService.batchSubmitVotes(
          mockContractAddress,
          selectedProposalsArray,
          voteIds,
          voterEmails,
          signatures
        )).rejects.toMatchObject({
          statusCode: 500,
          message: expect.stringContaining('Failed to batch submit votes')
        });
      });
    });
  });

  describe('Query Functions', () => {
    describe('getProposalEvents', () => {
      it('should get proposal events', async () => {
        const result = await VotingService.getProposalEvents(mockContractAddress);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          proposalId: '1',
          description: 'https://metadata.example.com/proposal/1',
          txHash: expect.any(String)
        });
      });

      it('should handle query errors', async () => {
        MockedBlockchainProviderService.getReadOnlyContract.mockReturnValue({
          queryFilter: jest.fn().mockRejectedValue(new Error('Query failed'))
        } as any);

        await expect(VotingService.getProposalEvents(mockContractAddress))
          .rejects.toMatchObject({
            statusCode: 500,
            message: expect.stringContaining('Failed to get proposal events')
          });
      });
    });

    describe('getVoteEvents', () => {
      it('should get vote events', async () => {
        const result = await VotingService.getVoteEvents(mockContractAddress);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          proposalId: '1',
          voter: '0x1111111111111111111111111111111111111111',
          support: true,
          blockNumber: 12345,
          txHash: expect.any(String),
          timestamp: expect.any(Number)
        });
      });
    });

    describe('getVoteCountsByProposal', () => {
      it('should get vote counts by proposal', async () => {
        const result = await VotingService.getVoteCountsByProposal(mockContractAddress);

        expect(result).toMatchObject({
          '1': 1
        });
      });
    });

    describe('getContractInfo', () => {
      it('should get contract information', async () => {
        const result = await VotingService.getContractInfo(mockContractAddress);

        expect(result).toMatchObject({
          contractAddress: mockContractAddress,
          totalProposals: 5,
          totalVotes: 1,
          activeProposals: 0,
          businessId: ''
        });
      });
    });

    describe('getProposal', () => {
      it('should get proposal details', async () => {
        const result = await VotingService.getProposal(mockContractAddress, mockProposalId);

        expect(result).toMatchObject({
          id: mockProposalId,
          title: 'https://metadata.example.com/proposal/1',
          description: 'https://metadata.example.com/proposal/1',
          startBlock: expect.any(Number),
          endBlock: expect.any(Number),
          forVotes: 10,
          againstVotes: 0,
          abstainVotes: 0,
          status: expect.any(String),
          creator: '0x1111111111111111111111111111111111111111'
        });
      });

      it('should validate proposal ID format', async () => {
        await expect(VotingService.getProposal(mockContractAddress, 'invalid-id'))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid proposal ID format - must be a number'
          });
      });
    });

    describe('hasVoted', () => {
      it('should check if email has voted', async () => {
        const result = await VotingService.hasVoted(mockContractAddress, mockVoterEmail);

        expect(result).toBe(false);
      });
    });

    describe('getVoterSelections', () => {
      it('should get voter selections', async () => {
        const result = await VotingService.getVoterSelections(mockContractAddress, mockVoterEmail);

        expect(result).toEqual(['1', '2']);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('generateVoteId', () => {
      it('should generate unique vote ID', () => {
        const voteId1 = VotingService.generateVoteId(mockVoterEmail, mockProposalId);
        const voteId2 = VotingService.generateVoteId(mockVoterEmail, mockProposalId);

        expect(voteId1).toBeDefined();
        expect(voteId2).toBeDefined();
        expect(typeof voteId1).toBe('string');
        expect(typeof voteId2).toBe('string');
      });
    });

    describe('isValidVotingContract', () => {
      it('should validate voting contract', async () => {
        const result = await VotingService.isValidVotingContract(mockContractAddress);

        expect(result).toBe(true);
      });

      it('should return false for invalid address', async () => {
        const result = await VotingService.isValidVotingContract('invalid-address');

        expect(result).toBe(false);
      });

      it('should return false for non-voting contract', async () => {
        MockedBlockchainProviderService.getReadOnlyContract.mockReturnValue({
          proposalCount: jest.fn().mockRejectedValue(new Error('Not a voting contract'))
        } as any);

        const result = await VotingService.isValidVotingContract(mockContractAddress);

        expect(result).toBe(false);
      });
    });

    describe('getOptimizedGasPrice', () => {
      it('should get optimized gas price', async () => {
        MockedBlockchainProviderService.getGasPrice.mockResolvedValue({
          gasPrice: BigInt(20000000000),
          maxFeePerGas: BigInt(20000000000),
          maxPriorityFeePerGas: BigInt(1000000000)
        } as any);

        const result = await VotingService.getOptimizedGasPrice();

        expect(result).toBe('22000000000'); // 10% increase
      });

      it('should handle gas price errors', async () => {
        MockedBlockchainProviderService.getGasPrice.mockRejectedValue({ code: 'NETWORK_ERROR' });

        await expect(VotingService.getOptimizedGasPrice())
          .rejects.toMatchObject({
            statusCode: 503,
            message: 'Blockchain network error while fetching gas price'
          });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing factory settings', async () => {
      MockedFactorySettings.findOne.mockResolvedValue(null);

      await expect(VotingService.deployVotingContract(mockBusinessId))
        .rejects.toMatchObject({
          statusCode: 500,
          message: 'Voting factory not deployed. Please deploy factory first.'
        });
    });

    it('should handle network errors', async () => {
      MockedBlockchainProviderService.getContract.mockReturnValue({
        deployVotingForSelf: jest.fn().mockRejectedValue({ code: 'NETWORK_ERROR' })
      } as any);

      await expect(VotingService.deployVotingContract(mockBusinessId))
        .rejects.toMatchObject({
          statusCode: 503,
          message: 'Blockchain network error during voting contract deployment'
        });
      });
    });

    it('should handle call exceptions', async () => {
      // Mock the contract to fail with CALL_EXCEPTION
      const mockFailingContract = {
        createProposal: jest.fn().mockRejectedValue({ code: 'CALL_EXCEPTION' })
      };
      
      // Ensure the validation passes by mocking BrandSettings.findOne to return the correct business
      MockedBrandSettings.findOne.mockResolvedValue({
        business: mockBusinessId,
        web3Settings: {
          votingContract: mockContractAddress
        }
      });
      
      MockedBlockchainProviderService.getContract.mockReturnValue(mockFailingContract as any);

      await expect(VotingService.createProposal(
        mockContractAddress,
        'metadata-uri',
        mockBusinessId
      )).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining('Failed to create proposal')
      });
    });

    it('should handle unpredictable gas limit', async () => {
      MockedBlockchainProviderService.getContract.mockReturnValue({
        deployVotingForSelf: jest.fn().mockRejectedValue({ code: 'UNPREDICTABLE_GAS_LIMIT' })
      } as any);

      await expect(VotingService.deployVotingContract(mockBusinessId))
        .rejects.toMatchObject({
          statusCode: 400,
          message: 'Unable to estimate gas for voting contract deployment'
        });
    });
});