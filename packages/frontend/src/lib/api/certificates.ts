// src/lib/api/certificates.ts

import { api } from './client';
import { ApiError } from '@/lib/errors';

// Enhanced interfaces matching backend controller responses
export interface Certificate {
  _id: string;
  business: string;
  product: string;
  recipient: string;
  tokenId: string;
  txHash: string;
  contractAddress?: string;
  status: 'minted' | 'pending_transfer' | 'transferred_to_brand' | 'transfer_failed' | 'revoked';
  mintedToRelayer: boolean;
  transferredToBrand?: boolean;
  brandWallet?: string;
  transferTxHash?: string;
  transferredAt?: Date;
  transferFailed?: boolean;
  transferError?: string;
  transferAttempts: number;
  maxTransferAttempts: number;
  nextTransferAttempt?: Date;
  autoTransferEnabled: boolean;
  transferDelayMinutes: number;
  transferTimeout: number;
  transferScheduled?: boolean;
  transferDelay?: number;
  gasUsed?: string;
  metadata?: {
    customMessage?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
      display_type?: string;
    }>;
    expirationDate?: Date;
    certificateLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
  };
  deliveryOptions?: {
    scheduleDate?: Date;
    priority?: 'standard' | 'priority' | 'urgent';
    notifyRecipient?: boolean;
  };
  web3Options?: {
    autoTransfer?: boolean;
    transferDelay?: number;
    brandWallet?: string;
    requireCustomerConfirmation?: boolean;
    gasOptimization?: boolean;
  };
  batchId?: string;
  batchRequest?: boolean;
  templateId?: string;
  delivered?: boolean;
  deliveredAt?: Date;
  deliveryMethod?: string;
  deliveryId?: string;
  deliveryScheduled?: boolean;
  scheduledDeliveryDate?: Date;
  scheduledDeliveryId?: string;
  viewCount: number;
  lastViewedAt?: Date;
  verificationUrl?: string;
  revoked?: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CertificateCreateResponse {
  success: boolean;
  certificate: {
    id: string;
    tokenId: string;
    status: string;
    createdAt: Date;
    contractAddress: string;
    txHash: string;
  };
  web3: {
    hasWeb3Features: boolean;
    autoTransferEnabled: boolean;
    transferScheduled: boolean;
    brandWallet?: string;
    transferDelay?: number;
    blockchain: {
      network: string;
      explorerUrl: string;
    };
  };
  usage: {
    certificates: {
      current: number;
      remaining: number;
      limit: number;
    };
    transfers?: {
      current: number;
      limit: number;
    };
  };
  delivery: {
    method: string;
    scheduled: boolean;
    estimatedDelivery?: string;
  };
  nextSteps: string[];
}

export interface BatchCertificateResponse {
  success: boolean;
  batchJob: {
    id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    recipientCount: number;
    estimatedCompletion: string;
    progressUrl: string;
  };
  web3: {
    enabled: boolean;
    autoTransferEnabled: boolean;
    batchTransferEnabled: boolean;
    estimatedGasCost?: string;
  };
  processing: {
    queuePosition: number;
    estimatedStartTime: string;
    notificationsEnabled: boolean;
  };
  tracking: {
    webhookUrl?: string;
    statusUpdates: boolean;
    completionNotification: boolean;
  };
}

export interface VerificationResult {
  valid: boolean;
  certificate?: {
    id: string;
    tokenId: string;
    status: string;
    mintedAt: string;
    recipient: string;
    product: {
      name: string;
      brand: string;
    };
  };
  blockchain?: {
    verified: boolean;
    txHash: string;
    contractAddress: string;
    network: string;
    confirmations: number;
  };
  metadata?: {
    authentic: boolean;
    tampered: boolean;
    lastVerified: string;
  };
}

export interface BlockchainStatusResponse {
  status: 'pending' | 'confirmed' | 'failed';
  txHash: string;
  confirmations: number;
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
  network: string;
  explorerUrl: string;
  estimatedCompletion?: string;
  transferStatus?: {
    scheduled: boolean;
    completed: boolean;
    failed: boolean;
    nextAttempt?: string;
  };
}

export interface BatchProgressResponse {
  batchId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused';
  progress: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    percentage: number;
  };
  timing: {
    startedAt?: string;
    estimatedCompletion: string;
    averageTimePerCert: number;
  };
  results?: {
    successful: Certificate[];
    failed: Array<{
      recipient: string;
      error: string;
      timestamp: string;
    }>;
  };
}

export const certificatesApi = {
  
  // ===== CERTIFICATE MANAGEMENT =====
  
  /**
   * Get list of certificates with filtering
   * GET /api/certificates
   */
  getCertificates: async (params?: {
    business?: string;
    status?: string;
    product?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    certificates: Certificate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    filters: {
      statuses: string[];
      products: Array<{ id: string; name: string }>;
    };
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.business) queryParams.set('business', params.business);
      if (params?.status) queryParams.set('status', params.status);
      if (params?.product) queryParams.set('product', params.product);
      if (params?.page) queryParams.set('page', String(params.page));
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder);

      const response = await api.get<{
        certificates: Certificate[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
        filters: {
          statuses: string[];
          products: Array<{ id: string; name: string }>;
        };
      }>(`/api/certificates?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Get certificates error:', error);
      throw error;
    }
  },

  /**
   * Get single certificate by ID
   * GET /api/certificates/:id
   */
  getCertificate: async (id: string): Promise<Certificate> => {
    try {
      const response = await api.get<Certificate>(`/api/certificates/${id}`);
      return response;
    } catch (error) {
      console.error('Get certificate error:', error);
      throw error;
    }
  },

  /**
   * Create new certificate with blockchain minting
   * POST /api/certificates
   */
  createCertificate: async (data: {
    product: string;
    recipient: string;
    contactMethod: 'email' | 'phone' | 'wallet';
    metadata?: Certificate['metadata'];
    deliveryOptions?: Certificate['deliveryOptions'];
    web3Options?: Certificate['web3Options'];
    templateId?: string;
  }): Promise<CertificateCreateResponse> => {
    try {
      const response = await api.post<CertificateCreateResponse>('/api/certificates', data);
      return response;
    } catch (error) {
      console.error('Create certificate error:', error);
      throw error;
    }
  },

  /**
   * Update existing certificate
   * PATCH /api/certificates/:id
   */
  updateCertificate: async (id: string, data: Partial<Certificate>): Promise<Certificate> => {
    try {
      const response = await api.patch<Certificate>(`/api/certificates/${id}`, data);
      return response;
    } catch (error) {
      console.error('Update certificate error:', error);
      throw error;
    }
  },

  /**
   * Delete certificate
   * DELETE /api/certificates/:id
   */
  deleteCertificate: async (id: string): Promise<void> => {
    try {
      await api.delete<void>(`/api/certificates/${id}`);
    } catch (error) {
      console.error('Delete certificate error:', error);
      throw error;
    }
  },

  // ===== BATCH OPERATIONS =====
  
  /**
   * Create batch certificates
   * POST /api/certificates/batch
   */
  createBatchCertificates: async (data: {
    productId: string;
    recipients: Array<{
      recipient: string;
      contactMethod: 'email' | 'phone' | 'wallet';
      customMessage?: string;
      metadata?: any;
    }>;
    batchOptions?: {
      delayBetweenCerts?: number;
      maxConcurrent?: number;
      batchTransfer?: boolean;
      webhookUrl?: string;
    };
    deliveryOptions?: Certificate['deliveryOptions'];
    web3Options?: Certificate['web3Options'];
  }): Promise<BatchCertificateResponse> => {
    try {
      const response = await api.post<BatchCertificateResponse>('/api/certificates/batch', data);
      return response;
    } catch (error) {
      console.error('Create batch certificates error:', error);
      throw error;
    }
  },

  /**
   * Get batch job progress
   * GET /api/certificates/batch/:batchId/progress
   */
  getBatchProgress: async (batchId: string): Promise<BatchProgressResponse> => {
    try {
      const response = await api.get<BatchProgressResponse>(`/api/certificates/batch/${batchId}/progress`);
      return response;
    } catch (error) {
      console.error('Get batch progress error:', error);
      throw error;
    }
  },

  /**
   * Cancel batch job
   * POST /api/certificates/batch/:batchId/cancel
   */
  cancelBatchJob: async (batchId: string): Promise<{
    success: boolean;
    canceled: number;
    remaining: number;
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        canceled: number;
        remaining: number;
      }>(`/api/certificates/batch/${batchId}/cancel`, {});
      return response;
    } catch (error) {
      console.error('Cancel batch job error:', error);
      throw error;
    }
  },

  /**
   * Retry failed certificates in batch
   * POST /api/certificates/batch/:batchId/retry
   */
  retryBatchFailures: async (batchId: string): Promise<{
    success: boolean;
    retriedCount: number;
    newBatchId?: string;
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        retriedCount: number;
        newBatchId?: string;
      }>(`/api/certificates/batch/${batchId}/retry`, {});
      return response;
    } catch (error) {
      console.error('Retry batch failures error:', error);
      throw error;
    }
  },

  // ===== BLOCKCHAIN OPERATIONS =====
  
  /**
   * Schedule transfer to brand wallet
   * POST /api/certificates/:id/schedule-transfer
   */
  scheduleTransfer: async (id: string): Promise<Certificate> => {
    try {
      const response = await api.post<Certificate>(`/api/certificates/${id}/schedule-transfer`, {});
      return response;
    } catch (error) {
      console.error('Schedule transfer error:', error);
      throw error;
    }
  },

  /**
   * Execute manual transfer
   * POST /api/certificates/:id/transfer
   */
  executeTransfer: async (id: string): Promise<Certificate> => {
    try {
      const response = await api.post<Certificate>(`/api/certificates/${id}/transfer`, {});
      return response;
    } catch (error) {
      console.error('Execute transfer error:', error);
      throw error;
    }
  },

  /**
   * Retry failed transfer
   * POST /api/certificates/:id/retry-transfer
   */
  retryTransfer: async (id: string): Promise<Certificate> => {
    try {
      const response = await api.post<Certificate>(`/api/certificates/${id}/retry-transfer`, {});
      return response;
    } catch (error) {
      console.error('Retry transfer error:', error);
      throw error;
    }
  },

  /**
   * Get blockchain status
   * GET /api/certificates/:id/blockchain-status
   */
  getBlockchainStatus: async (id: string): Promise<BlockchainStatusResponse> => {
    try {
      const response = await api.get<BlockchainStatusResponse>(`/api/certificates/${id}/blockchain-status`);
      return response;
    } catch (error) {
      console.error('Get blockchain status error:', error);
      throw error;
    }
  },

  /**
   * Refresh blockchain status from network
   * POST /api/certificates/:id/blockchain-status/refresh
   */
  refreshBlockchainStatus: async (id: string): Promise<BlockchainStatusResponse> => {
    try {
      const response = await api.post<BlockchainStatusResponse>(`/api/certificates/${id}/blockchain-status/refresh`, {});
      return response;
    } catch (error) {
      console.error('Refresh blockchain status error:', error);
      throw error;
    }
  },

  /**
   * Get blockchain events for certificate
   * GET /api/certificates/:id/blockchain-status/events
   */
  getBlockchainEvents: async (id: string, params?: {
    eventType?: string;
    fromBlock?: number;
    toBlock?: number;
  }): Promise<{
    events: Array<{
      event: string;
      blockNumber: number;
      txHash: string;
      timestamp: string;
      data: any;
    }>;
    totalEvents: number;
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.eventType) queryParams.set('eventType', params.eventType);
      if (params?.fromBlock) queryParams.set('fromBlock', String(params.fromBlock));
      if (params?.toBlock) queryParams.set('toBlock', String(params.toBlock));

      const response = await api.get<{
        events: Array<{
          event: string;
          blockNumber: number;
          txHash: string;
          timestamp: string;
          data: any;
        }>;
        totalEvents: number;
      }>(`/api/certificates/${id}/blockchain-status/events?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Get blockchain events error:', error);
      throw error;
    }
  },

  /**
   * Get transfer history from blockchain
   * GET /api/certificates/:id/blockchain-status/transfer-history
   */
  getTransferHistory: async (id: string): Promise<{
    transfers: Array<{
      from: string;
      to: string;
      txHash: string;
      blockNumber: number;
      timestamp: string;
      gasUsed: string;
    }>;
    totalTransfers: number;
  }> => {
    try {
      const response = await api.get<{
        transfers: Array<{
          from: string;
          to: string;
          txHash: string;
          blockNumber: number;
          timestamp: string;
          gasUsed: string;
        }>;
        totalTransfers: number;
      }>(`/api/certificates/${id}/blockchain-status/transfer-history`);
      return response;
    } catch (error) {
      console.error('Get transfer history error:', error);
      throw error;
    }
  },

  /**
   * Get blockchain explorer links
   * GET /api/certificates/:id/blockchain-status/explorer-links
   */
  getExplorerLinks: async (id: string): Promise<{
    transaction: string;
    token: string;
    contract: string;
    wallet: string;
    network: string;
  }> => {
    try {
      const response = await api.get<{
        transaction: string;
        token: string;
        contract: string;
        wallet: string;
        network: string;
      }>(`/api/certificates/${id}/blockchain-status/explorer-links`);
      return response;
    } catch (error) {
      console.error('Get explorer links error:', error);
      throw error;
    }
  },

  // ===== VERIFICATION SYSTEM =====
  
  /**
   * Public certificate verification (no auth required)
   * GET /api/certificates/:id/verify
   */
  verifyPublicCertificate: async (id: string, params?: {
    includeMetadata?: boolean;
    checkBlockchain?: boolean;
  }): Promise<VerificationResult> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.includeMetadata) queryParams.set('includeMetadata', String(params.includeMetadata));
      if (params?.checkBlockchain) queryParams.set('checkBlockchain', String(params.checkBlockchain));

      const response = await api.get<VerificationResult>(
        `/api/certificates/${id}/verify?${queryParams.toString()}`
      );
      return response;
    } catch (error) {
      console.error('Verify public certificate error:', error);
      throw error;
    }
  },

  /**
   * Quick verification check
   * POST /api/certificates/:id/verify/quick
   */
  quickVerification: async (id: string, data?: {
    expectedRecipient?: string;
    expectedProduct?: string;
  }): Promise<{
    valid: boolean;
    status: string;
    basicInfo?: {
      recipient: string;
      product: string;
      mintedAt: string;
    };
  }> => {
    try {
      const response = await api.post<{
        valid: boolean;
        status: string;
        basicInfo?: {
          recipient: string;
          product: string;
          mintedAt: string;
        };
      }>(`/api/certificates/${id}/verify/quick`, data || {});
      return response;
    } catch (error) {
      console.error('Quick verification error:', error);
      throw error;
    }
  },

  /**
   * Detailed verification with full blockchain check
   * GET /api/certificates/:id/verify/details
   */
  getDetailedVerification: async (id: string): Promise<{
    certificate: Certificate;
    blockchain: {
      verified: boolean;
      onChain: boolean;
      metadata: any;
      contractVerified: boolean;
    };
    authenticity: {
      score: number;
      factors: Array<{
        factor: string;
        status: 'pass' | 'fail' | 'warning';
        description: string;
      }>;
    };
  }> => {
    try {
      const response = await api.get<{
        certificate: Certificate;
        blockchain: {
          verified: boolean;
          onChain: boolean;
          metadata: any;
          contractVerified: boolean;
        };
        authenticity: {
          score: number;
          factors: Array<{
            factor: string;
            status: 'pass' | 'fail' | 'warning';
            description: string;
          }>;
        };
      }>(`/api/certificates/${id}/verify/details`);
      return response;
    } catch (error) {
      console.error('Get detailed verification error:', error);
      throw error;
    }
  },

  /**
   * Blockchain-specific verification
   * GET /api/certificates/:id/verify/blockchain
   */
  verifyBlockchain: async (id: string): Promise<{
    onChain: boolean;
    txHash: string;
    confirmations: number;
    contractVerified: boolean;
    metadataHash: string;
    networkStatus: string;
  }> => {
    try {
      const response = await api.get<{
        onChain: boolean;
        txHash: string;
        confirmations: number;
        contractVerified: boolean;
        metadataHash: string;
        networkStatus: string;
      }>(`/api/certificates/${id}/verify/blockchain`);
      return response;
    } catch (error) {
      console.error('Verify blockchain error:', error);
      throw error;
    }
  },

  /**
   * Verify certificate data integrity
   * POST /api/certificates/:id/blockchain-status/verify-integrity
   */
  verifyDataIntegrity: async (id: string): Promise<{
    valid: boolean;
    metadataMatch: boolean;
    chainDataHash: string;
    localDataHash: string;
    lastChecked: string;
  }> => {
    try {
      const response = await api.post<{
        valid: boolean;
        metadataMatch: boolean;
        chainDataHash: string;
        localDataHash: string;
        lastChecked: string;
      }>(`/api/certificates/${id}/blockchain-status/verify-integrity`, {});
      return response;
    } catch (error) {
      console.error('Verify data integrity error:', error);
      throw error;
    }
  },

  // ===== CERTIFICATE LIFECYCLE =====
  
  /**
   * Revoke certificate with blockchain recording
   * POST /api/certificates/:id/revoke
   */
  revokeCertificate: async (id: string, data: {
    reason?: string;
    notifyRecipient?: boolean;
    burnNft?: boolean;
  }): Promise<{
    success: boolean;
    certificate: Certificate;
    blockchain?: {
      revoked: boolean;
      txHash?: string;
      burnTxHash?: string;
    };
    notifications: {
      recipientNotified: boolean;
      brandNotified: boolean;
    };
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        certificate: Certificate;
        blockchain?: {
          revoked: boolean;
          txHash?: string;
          burnTxHash?: string;
        };
        notifications: {
          recipientNotified: boolean;
          brandNotified: boolean;
        };
      }>(`/api/certificates/${id}/revoke`, data);
      return response;
    } catch (error) {
      console.error('Revoke certificate error:', error);
      throw error;
    }
  },

  /**
   * Track certificate view
   * POST /api/certificates/:id/view
   */
  incrementViewCount: async (id: string): Promise<{
    viewCount: number;
    lastViewedAt: string;
  }> => {
    try {
      const response = await api.post<{
        viewCount: number;
        lastViewedAt: string;
      }>(`/api/certificates/${id}/view`, {});
      return response;
    } catch (error) {
      console.error('Increment view count error:', error);
      throw error;
    }
  },

  // ===== DELIVERY MANAGEMENT =====
  
  /**
   * Schedule certificate delivery
   * POST /api/certificates/:id/schedule-delivery
   */
  scheduleDelivery: async (id: string, data: {
    scheduleDate: string;
    deliveryMethod: string;
    notifyRecipient?: boolean;
  }): Promise<{
    success: boolean;
    scheduledId: string;
    estimatedDelivery: string;
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        scheduledId: string;
        estimatedDelivery: string;
      }>(`/api/certificates/${id}/schedule-delivery`, data);
      return response;
    } catch (error) {
      console.error('Schedule delivery error:', error);
      throw error;
    }
  },

  /**
   * Cancel scheduled delivery
   * DELETE /api/certificates/:id/scheduled-delivery/:deliveryId
   */
  cancelScheduledDelivery: async (id: string, deliveryId: string): Promise<void> => {
    try {
      await api.delete<void>(`/api/certificates/${id}/scheduled-delivery/${deliveryId}`);
    } catch (error) {
      console.error('Cancel scheduled delivery error:', error);
      throw error;
    }
  },

  // ===== TEMPLATES =====
  
  /**
   * Get certificate templates
   * GET /api/certificates/templates
   */
  getTemplates: async (): Promise<{
    templates: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      previewUrl: string;
      isPremium: boolean;
    }>;
    categories: string[];
  }> => {
    try {
      const response = await api.get<{
        templates: Array<{
          id: string;
          name: string;
          description: string;
          category: string;
          previewUrl: string;
          isPremium: boolean;
        }>;
        categories: string[];
      }>('/api/certificates/templates');
      return response;
    } catch (error) {
      console.error('Get templates error:', error);
      throw error;
    }
  },

  /**
   * Create custom template
   * POST /api/certificates/templates
   */
  createTemplate: async (data: {
    name: string;
    description?: string;
    category: string;
    designData: any;
  }): Promise<{
    id: string;
    name: string;
    previewUrl: string;
  }> => {
    try {
      const response = await api.post<{
        id: string;
        name: string;
        previewUrl: string;
      }>('/api/certificates/templates', data);
      return response;
    } catch (error) {
      console.error('Create template error:', error);
      throw error;
    }
  },

  // ===== PERFORMANCE MONITORING =====
  
  /**
   * Get performance metrics for certificate
   * GET /api/certificates/:id/blockchain-status/performance-metrics
   */
  getPerformanceMetrics: async (id: string): Promise<{
    minting: {
      duration: number;
      gasUsed: string;
      gasPrice: string;
      efficiency: 'excellent' | 'good' | 'average' | 'poor';
    };
    transfer?: {
      attempts: number;
      totalDuration: number;
      averageDuration: number;
      successRate: number;
    };
    network: {
      congestion: 'low' | 'medium' | 'high';
      avgBlockTime: number;
      recommendedGasPrice: string;
    };
  }> => {
    try {
      const response = await api.get<{
        minting: {
          duration: number;
          gasUsed: string;
          gasPrice: string;
          efficiency: 'excellent' | 'good' | 'average' | 'poor';
        };
        transfer?: {
          attempts: number;
          totalDuration: number;
          averageDuration: number;
          successRate: number;
        };
        network: {
          congestion: 'low' | 'medium' | 'high';
          avgBlockTime: number;
          recommendedGasPrice: string;
        };
      }>(`/api/certificates/${id}/blockchain-status/performance-metrics`);
      return response;
    } catch (error) {
      console.error('Get performance metrics error:', error);
      throw error;
    }
  },

  /**
   * Get real-time blockchain status updates (enterprise only)
   * GET /api/certificates/:id/blockchain-status/real-time
   */
  getRealTimeStatus: async (id: string): Promise<{
    status: string;
    lastUpdate: string;
    nextCheck: string;
    autoRefresh: boolean;
  }> => {
    try {
      const response = await api.get<{
        status: string;
        lastUpdate: string;
        nextCheck: string;
        autoRefresh: boolean;
      }>(`/api/certificates/${id}/blockchain-status/real-time`);
      return response;
    } catch (error) {
      console.error('Get real-time status error:', error);
      throw error;
    }
  },

  // ===== HEALTH AND MONITORING =====
  
  /**
   * Perform health check on certificate
   * GET /api/certificates/:id/blockchain-status/health-check
   */
  performHealthCheck: async (id: string): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    score: number;
    issues: Array<{
      category: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      resolution: string;
    }>;
    lastChecked: string;
  }> => {
    try {
      const response = await api.get<{
        overall: 'healthy' | 'warning' | 'critical';
        score: number;
        issues: Array<{
          category: string;
          severity: 'low' | 'medium' | 'high' | 'critical';
          description: string;
          resolution: string;
        }>;
        lastChecked: string;
      }>(`/api/certificates/${id}/blockchain-status/health-check`);
      return response;
    } catch (error) {
      console.error('Perform health check error:', error);
      throw error;
    }
  },
};

// ===== BULK VERIFICATION SYSTEM =====

export const bulkVerificationApi = {
  
  /**
   * Bulk verify multiple certificates
   * POST /api/certificates/verify/bulk
   */
  bulkVerify: async (certificateIds: string[]): Promise<{
    results: Array<{
      certificateId: string;
      valid: boolean;
      status: string;
      error?: string;
    }>;
    summary: {
      total: number;
      valid: number;
      invalid: number;
      errors: number;
    };
  }> => {
    try {
      const response = await api.post<{
        results: Array<{
          certificateId: string;
          valid: boolean;
          status: string;
          error?: string;
        }>;
        summary: {
          total: number;
          valid: number;
          invalid: number;
          errors: number;
        };
      }>('/api/certificates/verify/bulk', { certificateIds });
      return response;
    } catch (error) {
      console.error('Bulk verify error:', error);
      throw error;
    }
  },

  /**
   * Generate verification report
   * POST /api/certificates/verify/report
   */
  generateVerificationReport: async (data: {
    certificateIds: string[];
    format: 'pdf' | 'csv' | 'json';
    includeBlockchainData?: boolean;
  }): Promise<{
    reportId: string;
    downloadUrl: string;
    expiresAt: string;
    format: string;
  }> => {
    try {
      const response = await api.post<{
        reportId: string;
        downloadUrl: string;
        expiresAt: string;
        format: string;
      }>('/api/certificates/verify/report', data);
      return response;
    } catch (error) {
      console.error('Generate verification report error:', error);
      throw error;
    }
  },
};

// ===== ANALYTICS AND INSIGHTS =====

export const certificateAnalyticsApi = {
  
  /**
   * Get certificate analytics
   * GET /api/certificates/analytics
   */
  getCertificateAnalytics: async (params?: {
    timeRange?: string;
    groupBy?: 'day' | 'week' | 'month';
    productId?: string;
  }): Promise<{
    totalCertificates: number;
    mintingTrends: Array<{
      period: string;
      count: number;
      gasUsed: string;
    }>;
    statusDistribution: Record<string, number>;
    transferAnalytics: {
      totalTransfers: number;
      successRate: number;
      averageTime: number;
    };
    topProducts: Array<{
      productId: string;
      productName: string;
      certificateCount: number;
    }>;
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.timeRange) queryParams.set('timeRange', params.timeRange);
      if (params?.groupBy) queryParams.set('groupBy', params.groupBy);
      if (params?.productId) queryParams.set('productId', params.productId);

      const response = await api.get<{
        totalCertificates: number;
        mintingTrends: Array<{
          period: string;
          count: number;
          gasUsed: string;
        }>;
        statusDistribution: Record<string, number>;
        transferAnalytics: {
          totalTransfers: number;
          successRate: number;
          averageTime: number;
        };
        topProducts: Array<{
          productId: string;
          productName: string;
          certificateCount: number;
        }>;
      }>(`/api/certificates/analytics?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Get certificate analytics error:', error);
      throw error;
    }
  },
};

// ===== HELPER FUNCTIONS =====

/**
 * Generate certificate public URL
 */
export const generateCertificateUrl = (certificateId: string, brandDomain?: string): string => {
  const baseUrl = brandDomain ? `https://${brandDomain}` : 'https://yourplatform.com';
  return `${baseUrl}/verify/${certificateId}`;
};

/**
 * Format blockchain transaction URL
 */
export const formatBlockchainUrl = (txHash: string, network = 'base'): string => {
  const explorers = {
    base: 'https://basescan.io',
    ethereum: 'https://etherscan.io',
    polygon: 'https://polygonscan.com',
  };
  const explorerUrl = explorers[network as keyof typeof explorers] || explorers.base;
  return `${explorerUrl}/tx/${txHash}`;
};

/**
 * Calculate estimated gas cost
 */
export const calculateEstimatedGas = (operationType: 'mint' | 'transfer', count = 1): string => {
  const baseCosts = {
    mint: 0.001, // ETH
    transfer: 0.0005, // ETH
  };
  const estimated = baseCosts[operationType] * count;
  return `${estimated.toFixed(6)} ETH`;
};

/**
 * Check if certificate supports blockchain features
 */
export const supportsBlockchain = (certificate: Certificate): boolean => {
  return !!(certificate.tokenId && certificate.txHash && certificate.contractAddress);
};

/**
 * Get certificate status color for UI
 */
export const getCertificateStatusColor = (status: Certificate['status']): string => {
  const colors = {
    minted: 'green',
    pending_transfer: 'yellow',
    transferred_to_brand: 'blue',
    transfer_failed: 'red',
    revoked: 'gray',
  };
  return colors[status] || 'gray';
};

/**
 * Format certificate metadata for display
 */
export const formatCertificateMetadata = (metadata?: Certificate['metadata']): string => {
  if (!metadata) return '';
  
  const parts = [];
  if (metadata.certificateLevel) {
    parts.push(`Level: ${metadata.certificateLevel}`);
  }
  if (metadata.customMessage) {
    parts.push(metadata.customMessage);
  }
  if (metadata.attributes?.length) {
    const attrs = metadata.attributes.map(attr => `${attr.trait_type}: ${attr.value}`).join(', ');
    parts.push(attrs);
  }
  
  return parts.join(' | ');
};