/ src/lib/hooks/use-api.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { 
  Proposal, 
  VotingStats, 
  CreateProposalData,
  VotingQueryParams,
  Certificate,
  CertificateStats,
  Product,
  DashboardStats
} from '@/types';

// Voting hooks
export function useProposals(params?: VotingQueryParams) {
  return useQuery({
    queryKey: ['proposals', params],
    queryFn: async () => {
      const queryString = new URLSearchParams(params as any).toString();
      return apiClient.get<Proposal[]>(`/voting/proposals?${queryString}`);
    },
  });
}

export function useVotingStats() {
  return useQuery({
    queryKey: ['voting-stats'],
    queryFn: () => apiClient.get<VotingStats>('/voting/stats'),
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateProposalData) => {
      if (data.imageFile) {
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('description', data.description);
        formData.append('imageFile', data.imageFile);
        if (data.productId) formData.append('productId', data.productId);
        
        return apiClient.postFormData<Proposal>('/voting/proposals', formData);
      } else {
        return apiClient.post<Proposal>('/voting/proposals', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['voting-stats'] });
    },
  });
}

// Certificate hooks
export function useCertificates() {
  return useQuery({
    queryKey: ['certificates'],
    queryFn: () => apiClient.get<Certificate[]>('/certificates'),
  });
}

export function useCertificateStats() {
  return useQuery({
    queryKey: ['certificate-stats'],
    queryFn: () => apiClient.get<CertificateStats>('/certificates/stats'),
  });
}

// Product hooks
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => apiClient.get<Product[]>('/products'),
  });
}

// Dashboard hooks
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.get<DashboardStats>('/dashboard/stats'),
  });
}