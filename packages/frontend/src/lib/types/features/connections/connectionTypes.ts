/**
 * Connection Types
 * 
 * Re-exports backend connection types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Note: Connection types may be spread across multiple services
// Re-export from connections service if available
export type {
  ManufacturerRecommendation
} from '@backend/services/connections/utils/matchingEngine.service';

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Connection status type
 */
export type ConnectionStatus = 
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'blocked'
  | 'disconnected';

/**
 * Connection display type with enhanced UI fields
 */
export interface ConnectionDisplay {
  id: string;
  brandId: string;
  manufacturerId: string;
  status: ConnectionStatus;
  requestedAt: Date;
  respondedAt?: Date;
  _ui?: {
    formattedStatus?: string;
    statusBadge?: 'success' | 'warning' | 'error' | 'info';
    formattedRequestedAt?: string;
    relativeTime?: string;
    brandName?: string;
    manufacturerName?: string;
    brandLogo?: string;
    manufacturerLogo?: string;
  };
}

/**
 * Connection request form data
 */
export interface ConnectionRequestFormData {
  manufacturerId: string;
  message?: string;
  _ui?: {
    validationErrors?: Record<string, string>;
  };
}

/**
 * Connection list view options
 */
export interface ConnectionListViewOptions {
  status?: ConnectionStatus;
  searchQuery?: string;
  sortBy?: 'date' | 'name' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

