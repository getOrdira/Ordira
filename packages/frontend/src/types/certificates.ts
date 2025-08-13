// src/types/certificates.ts
export interface Certificate {
    id: string;
    orderId: string;
    tokenId: string;
    txHash: string;
    status: 'pending' | 'minted' | 'failed';
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, any>;
  }
  
  export interface CertificateStats {
    totalCertificates: number;
    mintedThisMonth: number;
    pendingMints: number;
    failedMints: number;
  }