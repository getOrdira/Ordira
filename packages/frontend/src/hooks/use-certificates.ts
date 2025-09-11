import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import axios from 'axios';

// ===== TYPES =====

type CertificateStatus = 'draft' | 'issued' | 'revoked' | 'expired' | 'pending';
type VerificationStatus = 'verified' | 'failed' | 'pending' | 'unknown';
type BlockchainStatus = 'pending' | 'confirmed' | 'failed' | 'not_synced';

interface Certificate {
  id: string;
  certificateNumber: string;
  status: CertificateStatus;
  recipientName: string;
  recipientEmail: string;
  productName: string;
  productId?: string;
  issueDate: string;
  expiryDate?: string;
  template?: string;
  metadata: {
    orderId?: string;
    integrationSource?: 'shopify' | 'woocommerce' | 'wix' | 'manual';
    customFields?: Record<string, any>;
  };
  blockchain: {
    transactionHash?: string;
    blockNumber?: number;
    status: BlockchainStatus;
    lastSync?: string;
  };
  verification: {
    isVerifiable: boolean;
    lastVerified?: string;
    verificationCode: string;
  };
  downloads: {
    pdfUrl?: string;
    jsonUrl?: string;
    xmlUrl?: string;
    lastDownloaded?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CertificateListQuery {
  page?: number;
  limit?: number;
  status?: CertificateStatus;
  search?: string;
  recipientEmail?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'issueDate' | 'recipientName' | 'status';
  sortOrder?: 'asc' | 'desc';
  integrationSource?: string;
}

interface CertificateListResponse {
  certificates: Certificate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  summary: {
    total: number;
    issued: number;
    pending: number;
    revoked: number;
    expiringSoon: number;
  };
}

interface CreateCertificateRequest {
  recipientName: string;
  recipientEmail: string;
  productName: string;
  productId?: string;
  template?: string;
  expiryDate?: string;
  customFields?: Record<string, any>;
  metadata?: {
    orderId?: string;
    integrationSource?: string;
    [key: string]: any;
  };
}

interface UpdateCertificateRequest {
  recipientName?: string;
  recipientEmail?: string;
  productName?: string;
  template?: string;
  expiryDate?: string;
  customFields?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface RevokeCertificateRequest {
  reason: string;
  notifyRecipient?: boolean;
  internalNotes?: string;
}

interface CertificateVerification {
  certificate: Certificate;
  isValid: boolean;
  verificationDetails: {
    certificateExists: boolean;
    notRevoked: boolean;
    notExpired: boolean;
    recipientMatch: boolean;
    blockchainVerified: boolean;
    signatureValid: boolean;
  };
  blockchainData?: {
    transactionHash: string;
    blockNumber: number;
    timestamp: string;
    gasUsed: number;
  };
  verificationTimestamp: string;
  verificationId: string;
}

interface BulkCertificateOperation {
  operation: 'create' | 'revoke' | 'update' | 'download';
  certificates: string[] | CreateCertificateRequest[];
  options?: {
    template?: string;
    notifyRecipients?: boolean;
    reason?: string; // for revocation
  };
}

interface CertificateTemplate {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'date' | 'image' | 'signature';
    required: boolean;
    defaultValue?: string;
  }>;
  branding: {
    logo?: string;
    colors: {
      primary: string;
      secondary: string;
      text: string;
    };
    fonts: {
      heading: string;
      body: string;
    };
  };
}

interface DownloadOptions {
  format: 'pdf' | 'json' | 'xml';
  includeMetadata?: boolean;
  includeBlockchainProof?: boolean;
  watermark?: {
    text?: string;
    opacity?: number;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  };
  customization?: {
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'A4' | 'Letter' | 'Legal';
    quality?: 'standard' | 'high';
  };
}

// ===== API FUNCTIONS =====

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const certificatesApi = {
  // Certificate CRUD
  getCertificates: (params?: CertificateListQuery): Promise<CertificateListResponse> =>
    api.get('/certificates', { params }).then(res => res.data),

  getCertificateById: (certificateId: string): Promise<Certificate> =>
    api.get(`/certificates/${certificateId}`).then(res => res.data),

  createCertificate: (data: CreateCertificateRequest): Promise<Certificate> =>
    api.post('/certificates', data).then(res => res.data),

  updateCertificate: (certificateId: string, data: UpdateCertificateRequest): Promise<Certificate> =>
    api.put(`/certificates/${certificateId}`, data).then(res => res.data),

  revokeCertificate: (certificateId: string, data: RevokeCertificateRequest): Promise<{ success: boolean; message: string }> =>
    api.delete(`/certificates/${certificateId}`, { data }).then(res => res.data),

  // Verification
  verifyCertificate: (certificateId: string, options?: { includeBlockchain?: boolean }): Promise<CertificateVerification> =>
    api.get(`/certificates/${certificateId}/verify`, { params: options }).then(res => res.data),

  quickVerifyCertificate: (verificationCode: string): Promise<CertificateVerification> =>
    api.post(`/certificates/verify/quick`, { verificationCode }).then(res => res.data),

  verifyBlockchain: (certificateId: string): Promise<{ verified: boolean; details: any }> =>
    api.get(`/certificates/${certificateId}/verify/blockchain`).then(res => res.data),

  verifyCryptographic: (certificateId: string, signature: string): Promise<{ valid: boolean; details: any }> =>
    api.post(`/certificates/${certificateId}/verify/cryptographic`, { signature }).then(res => res.data),

  // Downloads
  downloadCertificate: (certificateId: string, options?: DownloadOptions): Promise<Blob> =>
    api.get(`/certificates/${certificateId}/download/${options?.format || 'pdf'}`, {
      params: options,
      responseType: 'blob'
    }).then(res => res.data),

  previewCertificate: (certificateId: string): Promise<{ previewUrl: string; expiresAt: string }> =>
    api.get(`/certificates/${certificateId}/download/preview`).then(res => res.data),

  downloadCustomCertificate: (certificateId: string, options: DownloadOptions): Promise<Blob> =>
    api.post(`/certificates/${certificateId}/download/custom`, options, {
      responseType: 'blob'
    }).then(res => res.data),

  // Blockchain operations
  getBlockchainStatus: (certificateId: string): Promise<{ status: BlockchainStatus; details: any }> =>
    api.get(`/certificates/${certificateId}/blockchain-status`).then(res => res.data),

  syncToBlockchain: (certificateId: string): Promise<{ success: boolean; transactionHash?: string }> =>
    api.post(`/certificates/${certificateId}/blockchain-status/sync`).then(res => res.data),

  refreshBlockchainData: (certificateId: string): Promise<{ success: boolean; data: any }> =>
    api.post(`/certificates/${certificateId}/blockchain-status/refresh`).then(res => res.data),

  // Bulk operations
  bulkCreateCertificates: (data: BulkCertificateOperation): Promise<{ success: boolean; results: any[] }> =>
    api.post('/certificates/bulk/create', data).then(res => res.data),

  bulkRevokeCertificates: (certificateIds: string[], reason: string, notifyRecipients: boolean = false): Promise<{ success: boolean; results: any[] }> =>
    api.post('/certificates/bulk/revoke', { certificates: certificateIds, reason, notifyRecipients }).then(res => res.data),

  bulkDownloadCertificates: (certificateIds: string[], format: 'pdf' | 'zip' = 'zip'): Promise<Blob> =>
    api.post('/certificates/bulk/download', { certificates: certificateIds, format }, {
      responseType: 'blob'
    }).then(res => res.data),

  // Templates
  getTemplates: (): Promise<CertificateTemplate[]> =>
    api.get('/certificates/templates').then(res => res.data),

  getTemplateById: (templateId: string): Promise<CertificateTemplate> =>
    api.get(`/certificates/templates/${templateId}`).then(res => res.data),

  // Statistics and analytics
  getCertificateStats: (params?: { dateFrom?: string; dateTo?: string }): Promise<{
    totalIssued: number;
    totalRevoked: number;
    totalPending: number;
    expiringSoon: number;
    recentActivity: any[];
    topProducts: any[];
  }> =>
    api.get('/certificates/stats', { params }).then(res => res.data),
};

// ===== HOOKS =====

/**
 * Get paginated list of certificates
 */
export function useCertificates(params?: CertificateListQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['certificates', 'list', params],
    queryFn: () => certificatesApi.getCertificates(params),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Get infinite scroll certificates list
 */
export function useInfiniteCertificates(
  baseParams?: Omit<CertificateListQuery, 'page'>,
  options?: { enabled?: boolean }
) {
  return useInfiniteQuery({
    queryKey: ['certificates', 'infinite', baseParams],
    queryFn: ({ pageParam = 1 }) => certificatesApi.getCertificates({ ...baseParams, page: pageParam }),
    enabled: options?.enabled ?? true,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => 
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get specific certificate by ID
 */
export function useCertificateById(certificateId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['certificates', certificateId],
    queryFn: () => certificatesApi.getCertificateById(certificateId!),
    enabled: (options?.enabled ?? true) && !!certificateId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create new certificate
 */
export function useCreateCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: certificatesApi.createCertificate,
    onSuccess: (newCertificate) => {
      // Invalidate certificates list
      queryClient.invalidateQueries({ queryKey: ['certificates', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['certificates', 'infinite'] });
      queryClient.invalidateQueries({ queryKey: ['certificates', 'stats'] });
      
      // Add to cache
      queryClient.setQueryData(['certificates', newCertificate.id], newCertificate);
    },
    onError: (error) => {
      console.error('Certificate creation failed:', error);
    },
  });
}

/**
 * Update certificate
 */
export function useUpdateCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ certificateId, data }: { certificateId: string; data: UpdateCertificateRequest }) =>
      certificatesApi.updateCertificate(certificateId, data),
    onSuccess: (updatedCertificate) => {
      // Update specific certificate cache
      queryClient.setQueryData(['certificates', updatedCertificate.id], updatedCertificate);
      
      // Invalidate lists to show updated data
      queryClient.invalidateQueries({ queryKey: ['certificates', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['certificates', 'infinite'] });
    },
    onError: (error) => {
      console.error('Certificate update failed:', error);
    },
  });
}

/**
 * Revoke certificate
 */
export function useRevokeCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ certificateId, data }: { certificateId: string; data: RevokeCertificateRequest }) =>
      certificatesApi.revokeCertificate(certificateId, data),
    onSuccess: (_, variables) => {
      // Invalidate certificate data
      queryClient.invalidateQueries({ queryKey: ['certificates', variables.certificateId] });
      queryClient.invalidateQueries({ queryKey: ['certificates', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['certificates', 'infinite'] });
      queryClient.invalidateQueries({ queryKey: ['certificates', 'stats'] });
    },
    onError: (error) => {
      console.error('Certificate revocation failed:', error);
    },
  });
}

/**
 * Verify certificate
 */
export function useVerifyCertificate() {
  return useMutation({
    mutationFn: ({ certificateId, options }: { 
      certificateId: string; 
      options?: { includeBlockchain?: boolean } 
    }) => certificatesApi.verifyCertificate(certificateId, options),
    onError: (error) => {
      console.error('Certificate verification failed:', error);
    },
  });
}

/**
 * Quick verify certificate by code
 */
export function useQuickVerifyCertificate() {
  return useMutation({
    mutationFn: certificatesApi.quickVerifyCertificate,
    onError: (error) => {
      console.error('Quick verification failed:', error);
    },
  });
}

/**
 * Download certificate
 */
export function useDownloadCertificate() {
  return useMutation({
    mutationFn: ({ certificateId, options }: { 
      certificateId: string; 
      options?: DownloadOptions 
    }) => certificatesApi.downloadCertificate(certificateId, options),
    onSuccess: (data, variables) => {
      // Create download link
      const format = variables.options?.format || 'pdf';
      const mimeType = {
        pdf: 'application/pdf',
        json: 'application/json',
        xml: 'application/xml',
      }[format];

      const blob = new Blob([data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${variables.certificateId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      console.error('Certificate download failed:', error);
    },
  });
}

/**
 * Preview certificate
 */
export function usePreviewCertificate() {
  return useMutation({
    mutationFn: certificatesApi.previewCertificate,
    onError: (error) => {
      console.error('Certificate preview failed:', error);
    },
  });
}

/**
 * Get blockchain status
 */
export function useBlockchainStatus(certificateId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['certificates', certificateId, 'blockchain'],
    queryFn: () => certificatesApi.getBlockchainStatus(certificateId!),
    enabled: (options?.enabled ?? true) && !!certificateId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Sync certificate to blockchain
 */
export function useSyncToBlockchain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: certificatesApi.syncToBlockchain,
    onSuccess: (_, certificateId) => {
      // Refresh blockchain status
      queryClient.invalidateQueries({ queryKey: ['certificates', certificateId, 'blockchain'] });
      queryClient.invalidateQueries({ queryKey: ['certificates', certificateId] });
    },
    onError: (error) => {
      console.error('Blockchain sync failed:', error);
    },
  });
}

/**
 * Bulk create certificates
 */
export function useBulkCreateCertificates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: certificatesApi.bulkCreateCertificates,
    onSuccess: () => {
      // Invalidate all certificate queries
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (error) => {
      console.error('Bulk certificate creation failed:', error);
    },
  });
}

/**
 * Bulk revoke certificates
 */
export function useBulkRevokeCertificates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ certificateIds, reason, notifyRecipients }: {
      certificateIds: string[];
      reason: string;
      notifyRecipients?: boolean;
    }) => certificatesApi.bulkRevokeCertificates(certificateIds, reason, notifyRecipients),
    onSuccess: () => {
      // Invalidate all certificate queries
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (error) => {
      console.error('Bulk certificate revocation failed:', error);
    },
  });
}

/**
 * Bulk download certificates
 */
export function useBulkDownloadCertificates() {
  return useMutation({
    mutationFn: ({ certificateIds, format }: {
      certificateIds: string[];
      format?: 'pdf' | 'zip';
    }) => certificatesApi.bulkDownloadCertificates(certificateIds, format),
    onSuccess: (data, variables) => {
      // Create download link
      const format = variables.format || 'zip';
      const blob = new Blob([data], { 
        type: format === 'zip' ? 'application/zip' : 'application/pdf' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificates-bulk.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      console.error('Bulk download failed:', error);
    },
  });
}

/**
 * Get certificate templates
 */
export function useCertificateTemplates(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['certificates', 'templates'],
    queryFn: certificatesApi.getTemplates,
    enabled: options?.enabled ?? true,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Get specific template
 */
export function useCertificateTemplate(templateId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['certificates', 'templates', templateId],
    queryFn: () => certificatesApi.getTemplateById(templateId!),
    enabled: (options?.enabled ?? true) && !!templateId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Get certificate statistics
 */
export function useCertificateStats(
  params?: { dateFrom?: string; dateTo?: string }, 
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['certificates', 'stats', params],
    queryFn: () => certificatesApi.getCertificateStats(params),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Real-time certificate status tracking
 */
export function useRealtimeCertificateStatus(certificateIds: string[], enabled: boolean = false) {
  return useQuery({
    queryKey: ['certificates', 'realtime', certificateIds],
    queryFn: async () => {
      const statuses = await Promise.all(
        certificateIds.map(async (id) => {
          const cert = await certificatesApi.getCertificateById(id);
          return { id, status: cert.status, blockchain: cert.blockchain };
        })
      );
      return statuses;
    },
    enabled: enabled && certificateIds.length > 0,
    refetchInterval: enabled ? 10 * 1000 : false, // 10 seconds
    refetchIntervalInBackground: true,
  });
}