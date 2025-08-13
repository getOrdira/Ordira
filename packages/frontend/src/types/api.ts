// src/types/api.ts
export interface ApiResponse<T> {
    data: T;
    success: boolean;
    message?: string;
    errors?: string[];
  }
  
  export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }