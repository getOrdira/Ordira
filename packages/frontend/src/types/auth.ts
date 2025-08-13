// src/types/auth.ts
export interface User {
    id: string;
    email: string;
    fullName: string;
    businessName: string;
    country: string;
    occupation: 'Brand' | 'Creator' | 'Manufacturer';
    businessWebsite?: string;
    businessAddress?: string;
    businessNumber?: string;
    isEmailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface LoginCredentials {
    email: string;
    password: string;
    rememberMe?: boolean;
  }
  
  export interface SignupData {
    fullName: string;
    email: string;
    password: string;
    businessName: string;
    businessAddress: string;
    businessWebsite: string;
    businessNumber?: string;
    country: string;
    occupation: 'Brand' | 'Creator' | 'Manufacturer';
  }
  
  export interface AuthResponse {
    user: User;
    token: string;
    refreshToken: string;
  }
  
 