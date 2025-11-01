// src/controllers/integrations/blockchain/blockchainIntegration.controller.ts
// Controller exposing blockchain integration utilities for external systems

import { Response } from 'express';
import { formatEther } from 'ethers';
import { BlockchainProviderService } from '../../../services/blockchain/provider.service';
import { BlockchainIntegrationBaseController, BlockchainIntegrationBaseRequest } from './blockchainIntegrationBase.controller';

interface NetworkStatusRequest extends BlockchainIntegrationBaseRequest {}

interface GasPriceRequest extends BlockchainIntegrationBaseRequest {}

interface TransactionLookupRequest extends BlockchainIntegrationBaseRequest {
  validatedQuery?: {
    txHash?: string;
  };
}

interface BalanceLookupRequest extends BlockchainIntegrationBaseRequest {
  validatedQuery?: {
    address?: string;
  };
}

export class BlockchainIntegrationController extends BlockchainIntegrationBaseController {
  /**
   * Retrieve high-level network status information.
   */
  async getNetworkStatus(req: NetworkStatusRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_BLOCKCHAIN_NETWORK_STATUS');

      const [network, blockNumber, gasData] = await Promise.all([
        BlockchainProviderService.getNetwork(),
        BlockchainProviderService.getCurrentBlockNumber(),
        BlockchainProviderService.getGasPrice()
      ]);

      this.logAction(req, 'INTEGRATIONS_BLOCKCHAIN_NETWORK_STATUS_SUCCESS', {
        chainId: network.chainId?.toString(),
        blockNumber
      });

      return {
        network: {
          chainId: network.chainId?.toString() ?? null,
          name: network.name ?? 'unknown'
        },
        blockNumber,
        gas: {
          gasPriceWei: gasData.gasPrice?.toString() ?? null,
          gasPriceEth: gasData.gasPrice ? formatEther(gasData.gasPrice) : null,
          maxFeePerGasWei: gasData.maxFeePerGas?.toString() ?? null,
          maxPriorityFeePerGasWei: gasData.maxPriorityFeePerGas?.toString() ?? null
        }
      };
    }, res, 'Blockchain network status retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve current gas price information.
   */
  async getGasPrice(req: GasPriceRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_BLOCKCHAIN_GAS_PRICE');

      const feeData = await BlockchainProviderService.getGasPrice();

      this.logAction(req, 'INTEGRATIONS_BLOCKCHAIN_GAS_PRICE_SUCCESS', {
        gasPrice: feeData.gasPrice?.toString()
      });

      return {
        gasPriceWei: feeData.gasPrice?.toString() ?? null,
        gasPriceEth: feeData.gasPrice ? formatEther(feeData.gasPrice) : null,
        maxFeePerGasWei: feeData.maxFeePerGas?.toString() ?? null,
        maxPriorityFeePerGasWei: feeData.maxPriorityFeePerGas?.toString() ?? null
      };
    }, res, 'Gas price retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve transaction receipt/status information.
   */
  async getTransactionReceipt(req: TransactionLookupRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_BLOCKCHAIN_TRANSACTION_RECEIPT');

      const txHash =
        this.requireTransactionHash(
          req.validatedQuery?.txHash ??
            (req.query as any)?.txHash
        );

      const receipt = await BlockchainProviderService.getTransactionReceipt(txHash);

      this.logAction(req, 'INTEGRATIONS_BLOCKCHAIN_TRANSACTION_RECEIPT_SUCCESS', {
        txHash,
        status: receipt?.status
      });

      return {
        txHash,
        receipt
      };
    }, res, 'Transaction receipt retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve balance for a wallet address.
   */
  async getAddressBalance(req: BalanceLookupRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_BLOCKCHAIN_ADDRESS_BALANCE');

      const address =
        this.requireAddress(
          req.validatedQuery?.address ??
            (req.query as any)?.address
        );

      const balance = await BlockchainProviderService.getBalance(address);

      this.logAction(req, 'INTEGRATIONS_BLOCKCHAIN_ADDRESS_BALANCE_SUCCESS', {
        address
      });

      return {
        address,
        balanceWei: balance.toString(),
        balanceEth: formatEther(balance)
      };
    }, res, 'Address balance retrieved successfully', this.getRequestMeta(req));
  }
}

export const blockchainIntegrationController = new BlockchainIntegrationController();

