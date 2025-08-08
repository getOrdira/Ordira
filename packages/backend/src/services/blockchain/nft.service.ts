// services/blockchain/nft.service.ts
import { BlockchainProviderService } from './provider.service';
import { NftMintResult, ContractDeployment, NftContractInfo } from '../types/blockchain.types';
import nftFactoryAbi from '../../abi/nftFactoryAbi.json';
import erc721Abi from '../../abi/erc721Abi.json';

export interface NFTDeployParams {
  name: string;
  symbol: string;
  baseUri: string;
}

export interface NFTMintParams {
  contractAddress: string;
  recipient: string;
  tokenUri: string;
}

/**
 * Pure blockchain service for NFT operations
 * Handles contract deployment and minting without business logic
 */
export class NftService {
  
  /**
   * Get the NFT factory contract instance
   */
  private static getNftFactoryContract() {
    const factoryAddress = process.env.NFT_FACTORY_ADDRESS;
    if (!factoryAddress) {
      throw new Error('NFT_FACTORY_ADDRESS not configured');
    }
    return BlockchainProviderService.getContract(factoryAddress, nftFactoryAbi);
  }

  /**
   * Deploy a new ERC721 NFT contract
   */
  static async deployNFTContract(params: NFTDeployParams): Promise<ContractDeployment> {
    try {
      const { name, symbol, baseUri } = params;
      const nftFactory = this.getNftFactoryContract();
      
      const tx = await nftFactory.deployNFT(name, symbol, baseUri);
      const receipt = await tx.wait();

      const evt = receipt.events?.find((e: any) => e.event === 'NFTDeployed');
      if (!evt) {
        throw new Error('NFTDeployed event not found in transaction receipt');
      }

      const contractAddress = evt.args.contractAddress as string;

      return {
        address: contractAddress,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      throw new Error(`Failed to deploy NFT contract: ${error.message}`);
    }
  }

  /**
   * Mint an NFT to a specific recipient
   */
  static async mintNFT(params: NFTMintParams): Promise<NftMintResult> {
    try {
      const { contractAddress, recipient, tokenUri } = params;
      
      const nftContract = BlockchainProviderService.getContract(contractAddress, erc721Abi);
      
      const tx = await nftContract.safeMint(recipient, tokenUri);
      const receipt = await tx.wait();

      // Find the Transfer event to get the token ID
      const transferEvent = receipt.events?.find((e: any) => e.event === 'Transfer');
      if (!transferEvent) {
        throw new Error('Transfer event not found in transaction receipt');
      }

      const tokenId = transferEvent.args.tokenId.toString();

      return {
        tokenId,
        txHash: receipt.transactionHash,
        recipient,
        blockNumber: receipt.blockNumber,
        contractAddress
      };
    } catch (error) {
      throw new Error(`Failed to mint NFT: ${error.message}`);
    }
  }

  /**
   * Get all NFT contracts deployed by a specific user/factory
   */
  static async getUserContracts(userAddress: string): Promise<string[]> {
    try {
      const nftFactory = this.getNftFactoryContract();
      const count = await nftFactory.getUserContractCount(userAddress);
      const contracts: string[] = [];
      
      for (let i = 0; i < count; i++) {
        const contractAddress = await nftFactory.userContracts(userAddress, i);
        contracts.push(contractAddress);
      }
      
      return contracts;
    } catch (error) {
      throw new Error(`Failed to get user contracts: ${error.message}`);
    }
  }

  /**
   * Get NFT contract metadata
   */
  static async getContractMetadata(contractAddress: string): Promise<NftContractInfo> {
    try {
      const nftContract = BlockchainProviderService.getReadOnlyContract(contractAddress, erc721Abi);
      
      const [name, symbol, totalSupply, owner] = await Promise.all([
        nftContract.name(),
        nftContract.symbol(),
        nftContract.totalSupply?.() || '0',
        nftContract.owner?.() || 'Unknown'
      ]);

      return {
        contractAddress,
        totalSupply: parseInt(totalSupply.toString()),
        name,
        symbol,
        owner,
        businessId: '' // This would be populated by business layer
      };
    } catch (error) {
      throw new Error(`Failed to get contract metadata: ${error.message}`);
    }
  }

  /**
   * Get token URI for a specific NFT
   */
  static async getTokenURI(contractAddress: string, tokenId: string): Promise<string> {
    try {
      const nftContract = BlockchainProviderService.getReadOnlyContract(contractAddress, erc721Abi);
      return await nftContract.tokenURI(tokenId);
    } catch (error) {
      throw new Error(`Failed to get token URI: ${error.message}`);
    }
  }

  /**
   * Get owner of a specific NFT
   */
  static async getTokenOwner(contractAddress: string, tokenId: string): Promise<string> {
    try {
      const nftContract = BlockchainProviderService.getReadOnlyContract(contractAddress, erc721Abi);
      return await nftContract.ownerOf(tokenId);
    } catch (error) {
      throw new Error(`Failed to get token owner: ${error.message}`);
    }
  }

  /**
   * Check if a contract address is a valid ERC721 contract
   */
  static async isValidNFTContract(contractAddress: string): Promise<boolean> {
    try {
      const nftContract = BlockchainProviderService.getReadOnlyContract(contractAddress, erc721Abi);
      
      // Try to call supportsInterface for ERC721
      const ERC721_INTERFACE_ID = '0x80ac58cd';
      const supportsERC721 = await nftContract.supportsInterface(ERC721_INTERFACE_ID);
      
      return supportsERC721;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all Transfer events (mints/transfers) for a contract
   */
  static async getTransferEvents(contractAddress: string): Promise<Array<{
    from: string;
    to: string;
    tokenId: string;
    txHash: string;
  }>> {
    try {
      const nftContract = BlockchainProviderService.getReadOnlyContract(contractAddress, erc721Abi);
      
      const transferEvents = await nftContract.queryFilter(
        nftContract.filters.Transfer()
      );

      return transferEvents.map((event) => {
        const evt = event as unknown as {
          args: { from: string; to: string; tokenId: bigint };
          transactionHash: string;
        };
        
        return {
          from: evt.args.from,
          to: evt.args.to,
          tokenId: evt.args.tokenId.toString(),
          txHash: evt.transactionHash
        };
      });
    } catch (error) {
      throw new Error(`Failed to get transfer events: ${error.message}`);
    }
  }

  /**
   * Get mint events only (where from address is zero address)
   */
  static async getMintEvents(contractAddress: string): Promise<Array<{
    to: string;
    tokenId: string;
    txHash: string;
  }>> {
    try {
      const transferEvents = await this.getTransferEvents(contractAddress);
      
      // Filter for mints (from zero address)
      const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
      
      return transferEvents
        .filter(event => event.from === ZERO_ADDRESS)
        .map(event => ({
          to: event.to,
          tokenId: event.tokenId,
          txHash: event.txHash
        }));
    } catch (error) {
      throw new Error(`Failed to get mint events: ${error.message}`);
    }
  }

  /**
   * Get current gas price with optimization for NFT operations
   */
  static async getOptimizedGasPrice(): Promise<string> {
    try {
      const feeData = await BlockchainProviderService.getGasPrice();
      // NFT operations might need higher gas, add 15%
      const gasPrice = feeData.gasPrice! * BigInt(115) / BigInt(100);
      return gasPrice.toString();
    } catch (error) {
      throw new Error(`Failed to get gas price: ${error.message}`);
    }
  }

  /**
   * Mint NFT with business context (used by business layer)
   */
  async mintNft(businessId: string, params: { productId: string; recipient: string }): Promise<{
    tokenId: string;
    txHash: string;
  }> {
    // This method maintains compatibility with your certificate service
    // You'll need to implement the business logic to get contract address from businessId
    throw new Error('This method should be implemented in the business layer service');
  }
}