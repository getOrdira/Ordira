// src/services/blockchain/__tests__/contracts.service.test.ts

import { BlockchainContractsService } from '../contracts.service';
import { BlockchainProviderService } from '../provider.service';
import { UtilsService } from '../../utils/utils.service';
import { createAppError } from '../../../middleware/error.middleware';

// Mock dependencies
jest.mock('../provider.service');
jest.mock('../../utils/utils.service');
jest.mock('../../../middleware/error.middleware');

const MockedBlockchainProviderService = BlockchainProviderService as jest.Mocked<typeof BlockchainProviderService>;
const MockedUtilsService = UtilsService as jest.Mocked<typeof UtilsService>;
const mockCreateAppError = createAppError as jest.MockedFunction<typeof createAppError>;

describe('BlockchainContractsService', () => {
  let mockAddress: string;
  let mockContractAddress: string;
  let mockTxHash: string;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock data
    mockAddress = '0x1234567890123456789012345678901234567890';
    mockContractAddress = '0x9876543210987654321098765432109876543210';
    mockTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    
    // Mock environment variables
    process.env.TOKEN_CONTRACT_ADDRESS = mockContractAddress;
    
    // Mock contract instances
    const mockTokenContract = {
      balanceOf: jest.fn().mockResolvedValue(BigInt('1000000000000000000')), // 1 token
      name: jest.fn().mockResolvedValue('Test Token'),
      symbol: jest.fn().mockResolvedValue('TT'),
      decimals: jest.fn().mockResolvedValue(18)
    };
    
    const mockContract = {
      balanceOf: jest.fn().mockResolvedValue(BigInt('1000000000000000000')),
      name: jest.fn().mockResolvedValue('Test Contract'),
      symbol: jest.fn().mockResolvedValue('TC'),
      estimateGas: jest.fn().mockResolvedValue(BigInt(100000))
    };
    
    MockedBlockchainProviderService.getReadOnlyContract.mockReturnValue(mockTokenContract as any);
    MockedBlockchainProviderService.getContract.mockReturnValue(mockContract as any);
    MockedBlockchainProviderService.getProvider.mockReturnValue({
      getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')),
      getTransactionReceipt: jest.fn().mockResolvedValue({
        hash: mockTxHash,
        blockNumber: 12345,
        gasUsed: BigInt(100000),
        status: 1
      }),
      getTransaction: jest.fn().mockResolvedValue({
        hash: mockTxHash,
        blockNumber: 12345
      }),
      getCode: jest.fn().mockResolvedValue('0x608060405234801561001057600080fd5b50'),
      getBlockNumber: jest.fn().mockResolvedValue(12345),
      getNetwork: jest.fn().mockResolvedValue({
        chainId: BigInt(8453),
        name: 'base'
      }),
      getFeeData: jest.fn().mockResolvedValue({
        gasPrice: BigInt(20000000000)
      })
    } as any);
    
    MockedBlockchainProviderService.getBalance.mockResolvedValue(BigInt('1000000000000000000'));
    MockedBlockchainProviderService.getTransactionReceipt.mockResolvedValue({
      hash: mockTxHash,
      blockNumber: 12345,
      gasUsed: BigInt(100000),
      status: 1
    } as any);
    MockedBlockchainProviderService.waitForTransaction.mockResolvedValue({
      hash: mockTxHash,
      blockNumber: 12345,
      gasUsed: BigInt(100000),
      status: 1
    } as any);
    MockedBlockchainProviderService.getNetwork.mockResolvedValue({
      chainId: BigInt(8453),
      name: 'base'
    } as any);
    MockedBlockchainProviderService.getCurrentBlockNumber.mockResolvedValue(12345);
    MockedBlockchainProviderService.getGasPrice.mockResolvedValue({
      gasPrice: BigInt(20000000000)
    } as any);
    
    // Mock UtilsService
    MockedUtilsService.formatDate.mockReturnValue('2023-12-01 10:00:00');
    MockedUtilsService.retry.mockImplementation(async (fn) => fn());
    
    // Mock createAppError
    mockCreateAppError.mockImplementation((message, statusCode, code) => {
      const error = new Error(message) as any;
      error.statusCode = statusCode;
      error.code = code;
      return error;
    });
  });

  describe('Token Balance Methods', () => {
    describe('getTokenBalance', () => {
      it('should get token balance successfully', async () => {
        const result = await BlockchainContractsService.getTokenBalance(mockAddress);

        expect(result).toMatchObject({
          address: mockAddress,
          balance: '1000000000000000000',
          balanceFormatted: '1.0'
        });

        expect(MockedBlockchainProviderService.getReadOnlyContract).toHaveBeenCalledWith(
          mockContractAddress,
          expect.any(Array)
        );
      });

      it('should validate address format', async () => {
        await expect(BlockchainContractsService.getTokenBalance('invalid-address'))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid walletAddress format: invalid-address'
          });
      });

      it('should handle missing token contract address', async () => {
        delete process.env.TOKEN_CONTRACT_ADDRESS;

        await expect(BlockchainContractsService.getTokenBalance(mockAddress))
          .rejects.toMatchObject({
            statusCode: 500,
            message: 'TOKEN_CONTRACT_ADDRESS environment variable not configured'
          });
      });

      it('should handle contract errors', async () => {
        MockedBlockchainProviderService.getReadOnlyContract.mockReturnValue({
          balanceOf: jest.fn().mockRejectedValue(new Error('Contract error'))
        } as any);

        await expect(BlockchainContractsService.getTokenBalance(mockAddress))
          .rejects.toMatchObject({
            statusCode: 500,
            message: expect.stringContaining('Failed to get token balance')
          });
      });
    });

    describe('getMultipleTokenBalances', () => {
      it('should get multiple token balances successfully', async () => {
        const addresses = [mockAddress, '0x1111111111111111111111111111111111111111'];

        const result = await BlockchainContractsService.getMultipleTokenBalances(addresses);

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          address: mockAddress,
          balance: '1000000000000000000',
          balanceFormatted: '1.0'
        });
      });

      it('should validate addresses array', async () => {
        await expect(BlockchainContractsService.getMultipleTokenBalances([]))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Addresses array is required and cannot be empty'
          });

        await expect(BlockchainContractsService.getMultipleTokenBalances(Array(101).fill(mockAddress)))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Maximum 100 addresses allowed per batch request'
          });
      });

      it('should handle partial failures', async () => {
        const addresses = [mockAddress, 'invalid-address'];

        const result = await BlockchainContractsService.getMultipleTokenBalances(addresses);

        expect(result).toHaveLength(1);
        expect(result[0].address).toBe(mockAddress);
      });

      it('should throw error when all requests fail', async () => {
        MockedBlockchainProviderService.getReadOnlyContract.mockReturnValue({
          balanceOf: jest.fn().mockRejectedValue(new Error('Contract error'))
        } as any);

        const addresses = [mockAddress];

        await expect(BlockchainContractsService.getMultipleTokenBalances(addresses))
          .rejects.toMatchObject({
            statusCode: 500,
            message: expect.stringContaining('Failed to get any token balances')
          });
      });
    });

    describe('getETHBalance', () => {
      it('should get ETH balance successfully', async () => {
        const result = await BlockchainContractsService.getETHBalance(mockAddress);

        expect(result).toMatchObject({
          balance: '1000000000000000000',
          balanceFormatted: '1.0'
        });

        expect(MockedBlockchainProviderService.getBalance).toHaveBeenCalledWith(mockAddress);
      });

      it('should validate address format', async () => {
        await expect(BlockchainContractsService.getETHBalance('invalid-address'))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid address format: invalid-address'
          });
      });

      it('should handle balance errors', async () => {
        MockedBlockchainProviderService.getBalance.mockRejectedValue(new Error('Balance error'));

        await expect(BlockchainContractsService.getETHBalance(mockAddress))
          .rejects.toMatchObject({
            statusCode: 500,
            message: expect.stringContaining('Failed to get ETH balance')
          });
      });
    });
  });

  describe('Transaction Methods', () => {
    describe('getTransactionReceipt', () => {
      it('should get transaction receipt successfully', async () => {
        const result = await BlockchainContractsService.getTransactionReceipt(mockTxHash);

        expect(result).toMatchObject({
          txHash: mockTxHash,
          blockNumber: 12345,
          gasUsed: '100000',
          status: 1
        });

        expect(MockedBlockchainProviderService.getTransactionReceipt).toHaveBeenCalledWith(mockTxHash);
      });

      it('should validate transaction hash format', async () => {
        await expect(BlockchainContractsService.getTransactionReceipt('invalid-hash'))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid transaction hash format: invalid-hash'
          });
      });

      it('should validate maxRetries parameter', async () => {
        await expect(BlockchainContractsService.getTransactionReceipt(mockTxHash, 0))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'maxRetries must be a number between 1 and 10'
          });

        await expect(BlockchainContractsService.getTransactionReceipt(mockTxHash, 11))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'maxRetries must be a number between 1 and 10'
          });
      });

      it('should handle receipt errors', async () => {
        MockedBlockchainProviderService.getTransactionReceipt.mockRejectedValue(new Error('Receipt error'));

        await expect(BlockchainContractsService.getTransactionReceipt(mockTxHash))
          .rejects.toMatchObject({
            statusCode: 500,
            message: expect.stringContaining('Failed to get transaction receipt')
          });
      });
    });

    describe('waitForTransaction', () => {
      it('should wait for transaction successfully', async () => {
        const result = await BlockchainContractsService.waitForTransaction(mockTxHash);

        expect(result).toMatchObject({
          txHash: mockTxHash,
          blockNumber: 12345,
          gasUsed: '100000',
          status: 1
        });

        expect(MockedBlockchainProviderService.waitForTransaction).toHaveBeenCalledWith(mockTxHash, 1);
      });

      it('should validate parameters', async () => {
        await expect(BlockchainContractsService.waitForTransaction(mockTxHash, 0))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'confirmations must be a number between 1 and 50'
          });

        await expect(BlockchainContractsService.waitForTransaction(mockTxHash, 1, 500))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'timeout must be a number between 1000ms and 1800000ms (30 minutes)'
          });
      });

      it('should handle transaction not found', async () => {
        MockedBlockchainProviderService.waitForTransaction.mockResolvedValue(null);

        await expect(BlockchainContractsService.waitForTransaction(mockTxHash))
          .rejects.toMatchObject({
            statusCode: 404,
            message: `Transaction receipt not found for ${mockTxHash}`
          });
      });
    });

    describe('getTransactionStatus', () => {
      it('should get transaction status successfully', async () => {
        const result = await BlockchainContractsService.getTransactionStatus(mockTxHash);

        expect(result).toBe('success');
      });

      it('should handle pending transactions', async () => {
        MockedBlockchainProviderService.getProvider.mockReturnValue({
          getTransactionReceipt: jest.fn().mockResolvedValue(null),
          getTransaction: jest.fn().mockResolvedValue({
            hash: mockTxHash,
            blockNumber: null
          })
        } as any);

        const result = await BlockchainContractsService.getTransactionStatus(mockTxHash);

        expect(result).toBe('pending');
      });

      it('should handle not found transactions', async () => {
        MockedBlockchainProviderService.getProvider.mockReturnValue({
          getTransactionReceipt: jest.fn().mockResolvedValue(null),
          getTransaction: jest.fn().mockResolvedValue(null)
        } as any);

        const result = await BlockchainContractsService.getTransactionStatus(mockTxHash);

        expect(result).toBe('not_found');
      });

      it('should handle failed transactions', async () => {
        MockedBlockchainProviderService.getProvider.mockReturnValue({
          getTransactionReceipt: jest.fn().mockResolvedValue({
            hash: mockTxHash,
            blockNumber: 12345,
            gasUsed: BigInt(100000),
            status: 0
          })
        } as any);

        const result = await BlockchainContractsService.getTransactionStatus(mockTxHash);

        expect(result).toBe('failed');
      });
    });
  });

  describe('Network and Gas Methods', () => {
    describe('getNetworkInfo', () => {
      it('should get network information successfully', async () => {
        const result = await BlockchainContractsService.getNetworkInfo();

        expect(result).toMatchObject({
          chainId: 8453,
          blockNumber: 12345,
          gasPrice: '20000000000',
          network: 'base'
        });
      });

      it('should handle network errors', async () => {
        MockedBlockchainProviderService.getNetwork.mockRejectedValue(new Error('Network error'));

        await expect(BlockchainContractsService.getNetworkInfo())
          .rejects.toMatchObject({
            statusCode: 500,
            message: expect.stringContaining('Failed to get network info')
          });
      });
    });

    describe('getOptimalGasPrice', () => {
      it('should get optimal gas price for standard priority', async () => {
        const result = await BlockchainContractsService.getOptimalGasPrice('standard');

        expect(result).toBe('22000000000'); // 10% increase
      });

      it('should get optimal gas price for slow priority', async () => {
        const result = await BlockchainContractsService.getOptimalGasPrice('slow');

        expect(result).toBe('20000000000'); // No increase
      });

      it('should get optimal gas price for fast priority', async () => {
        const result = await BlockchainContractsService.getOptimalGasPrice('fast');

        expect(result).toBe('25000000000'); // 25% increase
      });

      it('should validate priority parameter', async () => {
        await expect(BlockchainContractsService.getOptimalGasPrice('invalid' as any))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'priority must be one of: slow, standard, fast'
          });
      });

      it('should handle gas price unavailable', async () => {
        MockedBlockchainProviderService.getGasPrice.mockResolvedValue({
          gasPrice: null
        } as any);

        await expect(BlockchainContractsService.getOptimalGasPrice('standard'))
          .rejects.toMatchObject({
            statusCode: 500,
            message: 'Unable to fetch current gas price from network'
          });
      });
    });

    describe('estimateGas', () => {
      it('should estimate gas successfully', async () => {
        const abi = [
          {
            name: 'transfer',
            type: 'function',
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ]
          }
        ];

        const result = await BlockchainContractsService.estimateGas(
          mockContractAddress,
          abi,
          'transfer',
          [mockAddress, BigInt(1000)]
        );

        expect(result).toBe('120000'); // 100000 * 1.2 (20% buffer)
      });

      it('should validate parameters', async () => {
        await expect(BlockchainContractsService.estimateGas('', [], 'transfer', []))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid contractAddress format: '
          });

        await expect(BlockchainContractsService.estimateGas(mockContractAddress, [], 'transfer', []))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'ABI is required and must be a non-empty array'
          });

        await expect(BlockchainContractsService.estimateGas(mockContractAddress, [{}], '', []))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'methodName is required and must be a string'
          });
      });

      it('should handle method not found', async () => {
        const abi = [{ name: 'otherMethod', type: 'function' }];

        await expect(BlockchainContractsService.estimateGas(
          mockContractAddress,
          abi,
          'transfer',
          []
        )).rejects.toMatchObject({
          statusCode: 400,
          message: "Method 'transfer' not found in contract ABI"
        });
      });

      it('should handle estimation errors', async () => {
        MockedBlockchainProviderService.getContract.mockReturnValue({
          transfer: {
            estimateGas: jest.fn().mockRejectedValue(new Error('Estimation failed'))
          }
        } as any);

        const abi = [{ name: 'transfer', type: 'function' }];

        await expect(BlockchainContractsService.estimateGas(
          mockContractAddress,
          abi,
          'transfer',
          []
        )).rejects.toMatchObject({
          statusCode: 500,
          message: expect.stringContaining('Failed to estimate gas')
        });
      });
    });
  });

  describe('Utility Methods', () => {
    describe('isValidAddress', () => {
      it('should validate valid addresses', () => {
        expect(BlockchainContractsService.isValidAddress(mockAddress)).toBe(true);
        expect(BlockchainContractsService.isValidAddress('0x0000000000000000000000000000000000000000')).toBe(true);
      });

      it('should reject invalid addresses', () => {
        expect(BlockchainContractsService.isValidAddress('invalid-address')).toBe(false);
        expect(BlockchainContractsService.isValidAddress('0x123')).toBe(false);
        expect(BlockchainContractsService.isValidAddress('')).toBe(false);
        expect(BlockchainContractsService.isValidAddress(null as any)).toBe(false);
        expect(BlockchainContractsService.isValidAddress(undefined as any)).toBe(false);
      });
    });

    describe('isContract', () => {
      it('should detect contract addresses', async () => {
        const result = await BlockchainContractsService.isContract(mockAddress);

        expect(result).toBe(true);
        expect(MockedBlockchainProviderService.getProvider).toHaveBeenCalled();
      });

      it('should detect non-contract addresses', async () => {
        MockedBlockchainProviderService.getProvider.mockReturnValue({
          getCode: jest.fn().mockResolvedValue('0x')
        } as any);

        const result = await BlockchainContractsService.isContract(mockAddress);

        expect(result).toBe(false);
      });

      it('should handle errors gracefully', async () => {
        MockedBlockchainProviderService.getProvider.mockReturnValue({
          getCode: jest.fn().mockRejectedValue(new Error('Provider error'))
        } as any);

        const result = await BlockchainContractsService.isContract(mockAddress);

        expect(result).toBe(false);
      });
    });
  });

  describe('Batch Operations', () => {
    describe('batchCall', () => {
      it('should execute batch calls successfully', async () => {
        const calls = [
          {
            contractAddress: mockContractAddress,
            abi: [{ name: 'balanceOf', type: 'function' }],
            methodName: 'balanceOf',
            params: [mockAddress]
          },
          {
            contractAddress: mockContractAddress,
            abi: [{ name: 'name', type: 'function' }],
            methodName: 'name',
            params: []
          }
        ];

        const result = await BlockchainContractsService.batchCall(calls);

        expect(result).toHaveLength(2);
        expect(MockedBlockchainProviderService.getReadOnlyContract).toHaveBeenCalledTimes(2);
      });

      it('should validate calls array', async () => {
        await expect(BlockchainContractsService.batchCall([]))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'calls array is required and cannot be empty'
          });

        await expect(BlockchainContractsService.batchCall(Array(51).fill({})))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Maximum 50 calls allowed per batch request'
          });
      });

      it('should validate individual calls', async () => {
        const calls = [
          {
            contractAddress: '',
            abi: [],
            methodName: 'balanceOf',
            params: []
          }
        ];

        await expect(BlockchainContractsService.batchCall(calls))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid calls[0].contractAddress format: '
          });
      });

      it('should handle batch call errors', async () => {
        MockedBlockchainProviderService.getReadOnlyContract.mockReturnValue({
          balanceOf: jest.fn().mockRejectedValue(new Error('Call failed'))
        } as any);

        const calls = [
          {
            contractAddress: mockContractAddress,
            abi: [{ name: 'balanceOf', type: 'function' }],
            methodName: 'balanceOf',
            params: [mockAddress]
          }
        ];

        await expect(BlockchainContractsService.batchCall(calls))
          .rejects.toMatchObject({
            statusCode: 500,
            message: expect.stringContaining('Failed to execute batch calls')
          });
      });
    });

    describe('executeWithRetry', () => {
      it('should execute operation with retry', async () => {
        const operation = jest.fn().mockResolvedValue('success');

        const result = await BlockchainContractsService.executeWithRetry(operation);

        expect(result).toBe('success');
        expect(MockedUtilsService.retry).toHaveBeenCalledWith(operation, 3, 1000);
      });

      it('should validate retry parameters', async () => {
        const operation = jest.fn().mockResolvedValue('success');

        await expect(BlockchainContractsService.executeWithRetry(operation, 0))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'maxRetries must be a number between 1 and 10'
          });

        await expect(BlockchainContractsService.executeWithRetry(operation, 3, 50))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'baseDelay must be a number between 100 and 10000 milliseconds'
          });
      });

      it('should handle retry exhaustion', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
        MockedUtilsService.retry.mockRejectedValue(new Error('Retry exhausted'));

        await expect(BlockchainContractsService.executeWithRetry(operation))
          .rejects.toMatchObject({
            statusCode: 500,
            message: 'Operation failed after 3 attempts: Retry exhausted'
          });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing environment variables', async () => {
      delete process.env.TOKEN_CONTRACT_ADDRESS;

      await expect(BlockchainContractsService.getTokenBalance(mockAddress))
        .rejects.toMatchObject({
          statusCode: 500,
          message: 'TOKEN_CONTRACT_ADDRESS environment variable not configured'
        });
    });

    it('should handle network errors', async () => {
      MockedBlockchainProviderService.getBalance.mockRejectedValue({ code: 'NETWORK_ERROR' });

      await expect(BlockchainContractsService.getETHBalance(mockAddress))
        .rejects.toMatchObject({
          statusCode: 500,
          message: expect.stringContaining('Failed to get ETH balance')
        });
    });

    it('should handle contract errors', async () => {
      MockedBlockchainProviderService.getReadOnlyContract.mockReturnValue({
        balanceOf: jest.fn().mockRejectedValue({ code: 'CALL_EXCEPTION' })
      } as any);

      await expect(BlockchainContractsService.getTokenBalance(mockAddress))
        .rejects.toMatchObject({
          statusCode: 500,
          message: expect.stringContaining('Failed to get token balance')
        });
    });
  });
});
