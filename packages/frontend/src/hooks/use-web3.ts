// src/hooks/use-web3.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { config } from '@/lib/config/config';
import { useNotifications } from './use-utilities';

interface Web3State {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  balance: string | null;
  isLoading: boolean;
  error: string | null;
}

interface ContractInteraction {
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
}

/**
 * Main Web3 connection hook
 * Handles wallet connection and Base chain integration
 */
export function useWeb3() {
  const { addNotification } = useNotifications();
  const [web3State, setWeb3State] = useState<Web3State>({
    isConnected: false,
    address: null,
    chainId: null,
    isCorrectNetwork: false,
    balance: null,
    isLoading: false,
    error: null
  });

  // Check if Web3 is available
  const isWeb3Available = useMemo(() => {
    return typeof window !== 'undefined' && 
           typeof (window as any).ethereum !== 'undefined';
  }, []);

  // Check if we're on the correct network (Base)
  const isCorrectNetwork = useMemo(() => {
    return web3State.chainId === config.web3.chainId;
  }, [web3State.chainId]);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (!isWeb3Available) {
      setWeb3State(prev => ({ 
        ...prev, 
        error: 'MetaMask or compatible wallet not found' 
      }));
      return;
    }

    setWeb3State(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const ethereum = (window as any).ethereum;
      
      // Request account access
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0];
      
      // Get chain ID
      const chainId = await ethereum.request({
        method: 'eth_chainId'
      });
      
      const numericChainId = parseInt(chainId, 16);

      // Get balance
      const balanceHex = await ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
      
      const balance = (parseInt(balanceHex, 16) / 1e18).toFixed(4);

      setWeb3State({
        isConnected: true,
        address,
        chainId: numericChainId,
        isCorrectNetwork: numericChainId === config.web3.chainId,
        balance,
        isLoading: false,
        error: null
      });

      // Switch to Base network if not already there
      if (numericChainId !== config.web3.chainId) {
        await switchToBaseNetwork();
      }

      addNotification({
        type: 'success',
        title: 'Wallet Connected',
        message: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
        category: 'system'
      });

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to connect wallet';
      setWeb3State(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));

      addNotification({
        type: 'error',
        title: 'Connection Failed',
        message: errorMessage,
        category: 'system'
      });
    }
  }, [isWeb3Available, addNotification]);

  // Switch to Base network
  const switchToBaseNetwork = useCallback(async () => {
    if (!isWeb3Available) return;

    try {
      const ethereum = (window as any).ethereum;
      const baseNetwork = config.web3.networks[config.web3.chainId];
      
      // Try to switch to Base network
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${config.web3.chainId.toString(16)}` }]
      });
      
    } catch (switchError: any) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          const ethereum = (window as any).ethereum;
          const baseNetwork = config.web3.networks[config.web3.chainId];
          
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${config.web3.chainId.toString(16)}`,
              chainName: baseNetwork.displayName,
              nativeCurrency: baseNetwork.nativeCurrency,
              rpcUrls: [baseNetwork.rpcUrl],
              blockExplorerUrls: [baseNetwork.blockExplorer]
            }]
          });
        } catch (addError: any) {
          addNotification({
            type: 'error',
            title: 'Network Setup Failed',
            message: 'Unable to add Base network to your wallet',
            category: 'system'
          });
        }
      } else {
        addNotification({
          type: 'error',
          title: 'Network Switch Failed',
          message: 'Unable to switch to Base network',
          category: 'system'
        });
      }
    }
  }, [isWeb3Available, addNotification]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setWeb3State({
      isConnected: false,
      address: null,
      chainId: null,
      isCorrectNetwork: false,
      balance: null,
      isLoading: false,
      error: null
    });

    addNotification({
      type: 'info',
      title: 'Wallet Disconnected',
      message: 'Your wallet has been disconnected',
      category: 'system'
    });
  }, [addNotification]);

  // Listen for account/network changes
  useEffect(() => {
    if (!isWeb3Available) return;

    const ethereum = (window as any).ethereum;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        // Reconnect with new account
        connectWallet();
      }
    };

    const handleChainChanged = (chainId: string) => {
      const numericChainId = parseInt(chainId, 16);
      setWeb3State(prev => ({
        ...prev,
        chainId: numericChainId,
        isCorrectNetwork: numericChainId === config.web3.chainId
      }));
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    // Cleanup listeners
    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [isWeb3Available, connectWallet, disconnectWallet]);

  return {
    ...web3State,
    isWeb3Available,
    connectWallet,
    disconnectWallet,
    switchToBaseNetwork,
    isCorrectNetwork
  };
}

/**
 * Hook for wallet connection status
 */
export function useWallet() {
  const web3 = useWeb3();
  
  return {
    isConnected: web3.isConnected,
    address: web3.address,
    balance: web3.balance,
    connect: web3.connectWallet,
    disconnect: web3.disconnectWallet,
    isLoading: web3.isLoading,
    error: web3.error
  };
}

/**
 * Hook for contract interactions on Base chain
 */
export function useContract(contractAddress?: string, abi?: any[]) {
  const { address, isConnected, isCorrectNetwork } = useWeb3();
  const { addNotification } = useNotifications();
  
  const [interactionState, setInteractionState] = useState<ContractInteraction>({
    isLoading: false,
    error: null,
    txHash: null
  });

  // Execute contract method
  const executeMethod = useCallback(async (
    methodName: string, 
    params: any[] = [],
    options: { value?: string; gasLimit?: number } = {}
  ) => {
    if (!isConnected || !isCorrectNetwork || !contractAddress || !abi) {
      throw new Error('Contract interaction requirements not met');
    }

    setInteractionState({
      isLoading: true,
      error: null,
      txHash: null
    });

    try {
      const ethereum = (window as any).ethereum;
      
      // Create contract instance (simplified - you'd use ethers.js or web3.js)
      const transactionParams = {
        to: contractAddress,
        from: address,
        data: `0x${methodName}`, // This would be properly encoded with ethers/web3
        ...(options.value && { value: `0x${parseInt(options.value).toString(16)}` }),
        ...(options.gasLimit && { gas: `0x${options.gasLimit.toString(16)}` })
      };

      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParams]
      });

      setInteractionState({
        isLoading: false,
        error: null,
        txHash
      });

      addNotification({
        type: 'success',
        title: 'Transaction Submitted',
        message: `Transaction submitted with hash: ${txHash.slice(0, 10)}...`,
        category: 'system'
      });

      return txHash;

    } catch (error: any) {
      const errorMessage = error.message || 'Transaction failed';
      
      setInteractionState({
        isLoading: false,
        error: errorMessage,
        txHash: null
      });

      addNotification({
        type: 'error',
        title: 'Transaction Failed',
        message: errorMessage,
        category: 'system'
      });

      throw error;
    }
  }, [isConnected, isCorrectNetwork, contractAddress, abi, address, addNotification]);

  // Read contract method (no transaction)
  const readMethod = useCallback(async (methodName: string, params: any[] = []) => {
    if (!contractAddress || !abi) {
      throw new Error('Contract not configured');
    }

    try {
      const ethereum = (window as any).ethereum;
      
      // This would use ethers.js or web3.js to call read methods
      const result = await ethereum.request({
        method: 'eth_call',
        params: [{
          to: contractAddress,
          data: `0x${methodName}` // Properly encode with ethers/web3
        }, 'latest']
      });

      return result;
    } catch (error: any) {
      console.error('Contract read error:', error);
      throw error;
    }
  }, [contractAddress, abi]);

  return {
    executeMethod,
    readMethod,
    ...interactionState
  };
}

/**
 * Hook for NFT certificate minting
 */
export function useNFTMinting() {
  const contract = useContract(
    config.web3.contracts.nftFactory,
    [] // Would include actual ABI
  );
  
  return useMutation({
    mutationFn: async (data: {
      recipient: string;
      tokenURI: string;
      metadata: any;
    }) => {
      return contract.executeMethod('mintCertificate', [
        data.recipient,
        data.tokenURI,
        JSON.stringify(data.metadata)
      ]);
    }
  });
}

/**
 * Hook for voting contract interactions
 */
export function useVotingContract() {
  const contract = useContract(
    config.web3.contracts.votingFactory,
    [] // Would include actual voting ABI
  );

  const submitVoteOnChain = useMutation({
    mutationFn: async (data: {
      proposalId: string;
      selectedProductIds: string[];
      voterAddress: string;
    }) => {
      return contract.executeMethod('submitProductSelection', [
        data.proposalId,
        data.selectedProductIds,
        data.voterAddress
      ]);
    }
  });

  const createProposalOnChain = useMutation({
    mutationFn: async (data: {
      proposalId: string;
      productIds: string[];
      endTime: number;
    }) => {
      return contract.executeMethod('createProposal', [
        data.proposalId,
        data.productIds,
        data.endTime
      ]);
    }
  });

  return {
    submitVoteOnChain: submitVoteOnChain.mutateAsync,
    createProposalOnChain: createProposalOnChain.mutateAsync,
    isSubmittingVote: submitVoteOnChain.isPending,
    isCreatingProposal: createProposalOnChain.isPending
  };
}

/**
 * Hook for checking transaction status
 */
export function useTransactionStatus(txHash?: string) {
  return useQuery({
    queryKey: ['transaction', txHash],
    queryFn: async () => {
      if (!txHash) return null;
      
      const ethereum = (window as any).ethereum;
      
      const receipt = await ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      });

      return {
        txHash,
        status: receipt ? (receipt.status === '0x1' ? 'success' : 'failed') : 'pending',
        blockNumber: receipt?.blockNumber ? parseInt(receipt.blockNumber, 16) : null,
        gasUsed: receipt?.gasUsed ? parseInt(receipt.gasUsed, 16) : null
      };
    },
    enabled: !!txHash,
    refetchInterval: (query) => {
      // Stop refetching once we have a final status
      return query.state.data?.status === 'pending' ? 2000 : false;
    }
  });
}