// src/services/blockchain/__tests__/provider.service.test.ts

import { BlockchainProviderService } from '../provider.service';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';

// Mock ethers
jest.mock('ethers', () => ({
  JsonRpcProvider: jest.fn(),
  Wallet: jest.fn(),
  Contract: jest.fn()
}));

const MockedJsonRpcProvider = JsonRpcProvider as jest.MockedClass<typeof JsonRpcProvider>;
const MockedWallet = Wallet as jest.MockedClass<typeof Wallet>;
const MockedContract = Contract as jest.MockedClass<typeof Contract>;

describe('BlockchainProviderService', () => {
  let mockProvider: jest.Mocked<JsonRpcProvider>;
  let mockSigner: jest.Mocked<Wallet>;
  let mockContract: jest.Mocked<Contract>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.BASE_RPC_URL = 'https://base-mainnet.g.alchemy.com/v2/test-key';
    process.env.PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
    
    // Mock provider instance
    mockProvider = {
      getBlockNumber: jest.fn().mockResolvedValue(12345),
      getNetwork: jest.fn().mockResolvedValue({
        chainId: BigInt(8453),
        name: 'base'
      }),
      getFeeData: jest.fn().mockResolvedValue({
        gasPrice: BigInt(20000000000),
        maxFeePerGas: BigInt(20000000000),
        maxPriorityFeePerGas: BigInt(1000000000)
      }),
      waitForTransaction: jest.fn().mockResolvedValue({
        hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        blockNumber: 12345,
        gasUsed: BigInt(100000),
        status: 1
      }),
      getTransactionReceipt: jest.fn().mockResolvedValue({
        hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        blockNumber: 12345,
        gasUsed: BigInt(100000),
        status: 1
      }),
      getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')),
      getTransaction: jest.fn().mockResolvedValue({
        hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        blockNumber: 12345
      }),
      getCode: jest.fn().mockResolvedValue('0x608060405234801561001057600080fd5b50')
    } as any;
    
    // Mock signer instance
    mockSigner = {
      address: '0x1111111111111111111111111111111111111111',
      provider: mockProvider
    } as any;
    
    // Mock contract instance
    mockContract = {
      address: '0x2222222222222222222222222222222222222222',
      provider: mockProvider,
      signer: mockSigner
    } as any;
    
    // Setup constructor mocks
    MockedJsonRpcProvider.mockImplementation(() => mockProvider);
    MockedWallet.mockImplementation(() => mockSigner);
    MockedContract.mockImplementation(() => mockContract);
  });

  describe('Provider Management', () => {
    describe('getProvider', () => {
      it('should return singleton provider instance', () => {
        const provider1 = BlockchainProviderService.getProvider();
        const provider2 = BlockchainProviderService.getProvider();
        
        expect(provider1).toBe(provider2);
        expect(MockedJsonRpcProvider).toHaveBeenCalledWith('https://base-mainnet.g.alchemy.com/v2/test-key');
      });

      it('should throw error when RPC URL is missing', () => {
        delete process.env.BASE_RPC_URL;
        delete process.env.RPC_URL;
        
        expect(() => BlockchainProviderService.getProvider()).toThrow(
          'Missing BASE_RPC_URL or RPC_URL environment variable'
        );
      });

      it('should use RPC_URL when BASE_RPC_URL is not available', () => {
        delete process.env.BASE_RPC_URL;
        process.env.RPC_URL = 'https://alternative-rpc-url.com';
        
        BlockchainProviderService.getProvider();
        
        expect(MockedJsonRpcProvider).toHaveBeenCalledWith('https://alternative-rpc-url.com');
      });
    });

    describe('getSigner', () => {
      it('should return singleton signer instance', () => {
        const signer1 = BlockchainProviderService.getSigner();
        const signer2 = BlockchainProviderService.getSigner();
        
        expect(signer1).toBe(signer2);
        expect(MockedWallet).toHaveBeenCalledWith(
          '0x1234567890123456789012345678901234567890123456789012345678901234',
          mockProvider
        );
      });

      it('should throw error when private key is missing', () => {
        delete process.env.PRIVATE_KEY;
        
        expect(() => BlockchainProviderService.getSigner()).toThrow(
          'Missing PRIVATE_KEY environment variable'
        );
      });
    });
  });

  describe('Contract Management', () => {
    describe('getContract', () => {
      it('should create contract with signer', () => {
        const address = '0x3333333333333333333333333333333333333333';
        const abi = [{ name: 'transfer', type: 'function' }];
        
        const contract = BlockchainProviderService.getContract(address, abi);
        
        expect(contract).toBe(mockContract);
        expect(MockedContract).toHaveBeenCalledWith(address, abi, mockSigner);
      });

      it('should create multiple contracts with different addresses', () => {
        const address1 = '0x3333333333333333333333333333333333333333';
        const address2 = '0x4444444444444444444444444444444444444444';
        const abi = [{ name: 'transfer', type: 'function' }];
        
        const contract1 = BlockchainProviderService.getContract(address1, abi);
        const contract2 = BlockchainProviderService.getContract(address2, abi);
        
        expect(contract1).toBe(mockContract);
        expect(contract2).toBe(mockContract);
        expect(MockedContract).toHaveBeenCalledTimes(2);
      });
    });

    describe('getReadOnlyContract', () => {
      it('should create read-only contract with provider', () => {
        const address = '0x3333333333333333333333333333333333333333';
        const abi = [{ name: 'balanceOf', type: 'function' }];
        
        const contract = BlockchainProviderService.getReadOnlyContract(address, abi);
        
        expect(contract).toBe(mockContract);
        expect(MockedContract).toHaveBeenCalledWith(address, abi, mockProvider);
      });
    });
  });

  describe('Network Operations', () => {
    describe('getCurrentBlockNumber', () => {
      it('should get current block number', async () => {
        const blockNumber = await BlockchainProviderService.getCurrentBlockNumber();
        
        expect(blockNumber).toBe(12345);
        expect(mockProvider.getBlockNumber).toHaveBeenCalled();
      });

      it('should handle provider errors', async () => {
        mockProvider.getBlockNumber.mockRejectedValue(new Error('Network error'));
        
        await expect(BlockchainProviderService.getCurrentBlockNumber())
          .rejects.toThrow('Network error');
      });
    });

    describe('getNetwork', () => {
      it('should get network information', async () => {
        const network = await BlockchainProviderService.getNetwork();
        
        expect(network).toEqual({
          chainId: BigInt(8453),
          name: 'base'
        });
        expect(mockProvider.getNetwork).toHaveBeenCalled();
      });

      it('should handle network errors', async () => {
        mockProvider.getNetwork.mockRejectedValue(new Error('Network error'));
        
        await expect(BlockchainProviderService.getNetwork())
          .rejects.toThrow('Network error');
      });
    });

    describe('getGasPrice', () => {
      it('should get gas price information', async () => {
        const feeData = await BlockchainProviderService.getGasPrice();
        
        expect(feeData).toEqual({
          gasPrice: BigInt(20000000000),
          maxFeePerGas: BigInt(20000000000),
          maxPriorityFeePerGas: BigInt(1000000000)
        });
        expect(mockProvider.getFeeData).toHaveBeenCalled();
      });

      it('should handle gas price errors', async () => {
        mockProvider.getFeeData.mockRejectedValue(new Error('Gas price error'));
        
        await expect(BlockchainProviderService.getGasPrice())
          .rejects.toThrow('Gas price error');
      });
    });
  });

  describe('Transaction Operations', () => {
    describe('waitForTransaction', () => {
      it('should wait for transaction with default confirmations', async () => {
        const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        
        const receipt = await BlockchainProviderService.waitForTransaction(txHash);
        
        expect(receipt).toEqual({
          hash: txHash,
          blockNumber: 12345,
          gasUsed: BigInt(100000),
          status: 1
        });
        expect(mockProvider.waitForTransaction).toHaveBeenCalledWith(txHash, 1);
      });

      it('should wait for transaction with custom confirmations', async () => {
        const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        
        const receipt = await BlockchainProviderService.waitForTransaction(txHash, 3);
        
        expect(receipt).toEqual({
          hash: txHash,
          blockNumber: 12345,
          gasUsed: BigInt(100000),
          status: 1
        });
        expect(mockProvider.waitForTransaction).toHaveBeenCalledWith(txHash, 3);
      });

      it('should handle transaction wait errors', async () => {
        const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        mockProvider.waitForTransaction.mockRejectedValue(new Error('Transaction timeout'));
        
        await expect(BlockchainProviderService.waitForTransaction(txHash))
          .rejects.toThrow('Transaction timeout');
      });
    });

    describe('getTransactionReceipt', () => {
      it('should get transaction receipt', async () => {
        const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        
        const receipt = await BlockchainProviderService.getTransactionReceipt(txHash);
        
        expect(receipt).toEqual({
          hash: txHash,
          blockNumber: 12345,
          gasUsed: BigInt(100000),
          status: 1
        });
        expect(mockProvider.getTransactionReceipt).toHaveBeenCalledWith(txHash);
      });

      it('should handle receipt errors', async () => {
        const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        mockProvider.getTransactionReceipt.mockRejectedValue(new Error('Receipt error'));
        
        await expect(BlockchainProviderService.getTransactionReceipt(txHash))
          .rejects.toThrow('Receipt error');
      });
    });

    describe('getBalance', () => {
      it('should get balance for address', async () => {
        const address = '0x1234567890123456789012345678901234567890';
        
        const balance = await BlockchainProviderService.getBalance(address);
        
        expect(balance).toBe(BigInt('1000000000000000000'));
        expect(mockProvider.getBalance).toHaveBeenCalledWith(address);
      });

      it('should handle balance errors', async () => {
        const address = '0x1234567890123456789012345678901234567890';
        mockProvider.getBalance.mockRejectedValue(new Error('Balance error'));
        
        await expect(BlockchainProviderService.getBalance(address))
          .rejects.toThrow('Balance error');
      });
    });
  });

  describe('Singleton Pattern', () => {
    it('should maintain singleton instances across calls', () => {
      // Clear any existing instances
      (BlockchainProviderService as any).provider = null;
      (BlockchainProviderService as any).signer = null;
      
      const provider1 = BlockchainProviderService.getProvider();
      const provider2 = BlockchainProviderService.getProvider();
      
      const signer1 = BlockchainProviderService.getSigner();
      const signer2 = BlockchainProviderService.getSigner();
      
      expect(provider1).toBe(provider2);
      expect(signer1).toBe(signer2);
      
      // Should only create one instance of each
      expect(MockedJsonRpcProvider).toHaveBeenCalledTimes(1);
      expect(MockedWallet).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle provider initialization errors', () => {
      MockedJsonRpcProvider.mockImplementation(() => {
        throw new Error('Provider initialization failed');
      });
      
      expect(() => BlockchainProviderService.getProvider()).toThrow(
        'Provider initialization failed'
      );
    });

    it('should handle signer initialization errors', () => {
      MockedWallet.mockImplementation(() => {
        throw new Error('Signer initialization failed');
      });
      
      expect(() => BlockchainProviderService.getSigner()).toThrow(
        'Signer initialization failed'
      );
    });

    it('should handle contract creation errors', () => {
      MockedContract.mockImplementation(() => {
        throw new Error('Contract creation failed');
      });
      
      expect(() => BlockchainProviderService.getContract('0x123', [])).toThrow(
        'Contract creation failed'
      );
    });
  });

  describe('Environment Variable Handling', () => {
    it('should handle missing BASE_RPC_URL gracefully', () => {
      delete process.env.BASE_RPC_URL;
      process.env.RPC_URL = 'https://fallback-rpc-url.com';
      
      BlockchainProviderService.getProvider();
      
      expect(MockedJsonRpcProvider).toHaveBeenCalledWith('https://fallback-rpc-url.com');
    });

    it('should prioritize BASE_RPC_URL over RPC_URL', () => {
      process.env.BASE_RPC_URL = 'https://primary-rpc-url.com';
      process.env.RPC_URL = 'https://secondary-rpc-url.com';
      
      BlockchainProviderService.getProvider();
      
      expect(MockedJsonRpcProvider).toHaveBeenCalledWith('https://primary-rpc-url.com');
    });

    it('should handle empty environment variables', () => {
      process.env.BASE_RPC_URL = '';
      process.env.RPC_URL = '';
      
      expect(() => BlockchainProviderService.getProvider()).toThrow(
        'Missing BASE_RPC_URL or RPC_URL environment variable'
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete workflow', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const contractAddress = '0x2222222222222222222222222222222222222222';
      const abi = [{ name: 'balanceOf', type: 'function' }];
      
      // Get provider and signer
      const provider = BlockchainProviderService.getProvider();
      const signer = BlockchainProviderService.getSigner();
      
      // Create contracts
      const contract = BlockchainProviderService.getContract(contractAddress, abi);
      const readOnlyContract = BlockchainProviderService.getReadOnlyContract(contractAddress, abi);
      
      // Perform operations
      const blockNumber = await BlockchainProviderService.getCurrentBlockNumber();
      const network = await BlockchainProviderService.getNetwork();
      const balance = await BlockchainProviderService.getBalance(address);
      
      expect(provider).toBe(mockProvider);
      expect(signer).toBe(mockSigner);
      expect(contract).toBe(mockContract);
      expect(readOnlyContract).toBe(mockContract);
      expect(blockNumber).toBe(12345);
      expect(network.chainId).toBe(BigInt(8453));
      expect(balance).toBe(BigInt('1000000000000000000'));
    });

    it('should handle concurrent operations', async () => {
      const promises = [
        BlockchainProviderService.getCurrentBlockNumber(),
        BlockchainProviderService.getNetwork(),
        BlockchainProviderService.getGasPrice(),
        BlockchainProviderService.getBalance('0x1234567890123456789012345678901234567890')
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(4);
      expect(results[0]).toBe(12345);
      expect((results[1] as any).chainId).toBe(BigInt(8453));
      expect((results[2] as any).gasPrice).toBe(BigInt(20000000000));
      expect(results[3]).toBe(BigInt('1000000000000000000'));
    });
  });
});
