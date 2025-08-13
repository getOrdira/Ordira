// src/app/auth/register/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth/auth-service';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';
import { COUNTRIES, OCCUPATIONS } from '@/lib/utils/constants';
import { SignupData } from '@/types/auth';

// Component imports for dropdowns
import { CountrySelect } from '@/components/ui/country-select';
import { OccupationSelect } from '@/components/ui/occupation-select';

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  businessName?: string;
  businessAddress?: string;
  businessWebsite?: string;
  businessNumber?: string;
  country?: string;
  occupation?: string;
  general?: string;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<Partial<SignupData>>({
    fullName: '',
    email: '',
    password: '',
    businessName: '',
    businessAddress: '',
    businessWebsite: '',
    businessNumber: '',
    country: '',
    occupation: undefined,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const router = useRouter();

  // Validation function that matches backend validation
  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};
    
    // Required field validation
    if (!formData.fullName?.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }
    
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password?.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }
    
    if (!formData.businessName?.trim()) {
      newErrors.businessName = 'Business name is required';
    } else if (formData.businessName.trim().length < 2) {
      newErrors.businessName = 'Business name must be at least 2 characters';
    }
    
    if (!formData.businessAddress?.trim()) {
      newErrors.businessAddress = 'Business address is required';
    }
    
    if (!formData.businessWebsite?.trim()) {
      newErrors.businessWebsite = 'Business website is required';
    } else if (!/^https?:\/\/.+\..+/.test(formData.businessWebsite)) {
      newErrors.businessWebsite = 'Please enter a valid website URL (including http:// or https://)';
    }
    
    if (!formData.country) {
      newErrors.country = 'Please select your country';
    }
    
    if (!formData.occupation) {
      newErrors.occupation = 'Please select your occupation';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsLoading(false);
      return;
    }

    try {
      await authService.signup(formData as SignupData);
      setShowConfirmation(true);
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle backend validation errors
      if (error.response?.data?.errors) {
        const backendErrors: FormErrors = {};
        error.response.data.errors.forEach((err: any) => {
          if (err.field && err.message) {
            backendErrors[err.field as keyof FormErrors] = err.message;
          }
        });
        setErrors(backendErrors);
      } else {
        const errorMessage = error.response?.data?.message || 
                            error.message || 
                            'Registration failed. Please try again.';
        setErrors({ general: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof SignupData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Confirmation modal
  if (showConfirmation) {
    return (
      <div className="relative h-screen flex items-center justify-center px-4 bg-gradient-to-br from-black via-accent/30 to-black">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-dark mb-4">Thank You for Registering!</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Our evaluation team will review your information and get back to you within 24–48 hours.
          </p>
          <div className="space-y-3">
            <Link 
              href="/auth/login"
              className="block w-full px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-dark transition-colors"
            >
              Go to Login
            </Link>
            <button
              onClick={() => {
                setShowConfirmation(false);
                setFormData({
                  fullName: '',
                  email: '',
                  password: '',
                  businessName: '',
                  businessAddress: '',
                  businessWebsite: '',
                  businessNumber: '',
                  country: '',
                  occupation: undefined,
                });
              }}
              className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Register Another Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-black via-accent/30 to-black bg-[url('/noise.png')] bg-repeat">
      {/* Logo */}
      <div className="absolute top-4 left-4 text-white text-lg font-bold">
        LOGO
      </div>
      
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-dark mb-2">Create Account</h1>
          <p className="text-sm text-gray-600">
            Please complete the form below to get started
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* General Error */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Personal Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-dark border-b border-gray-200 pb-2">
              Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={formData.fullName || ''}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  placeholder="John Doe"
                  className={`w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${
                    errors.fullName ? 'border-red-400' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                  autoComplete="name"
                  required
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="john@company.com"
                  className={`w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${
                    errors.email ? 'border-red-400' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                  autoComplete="email"
                  required
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password || ''}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Create a strong password"
                  className={`w-full h-12 px-4 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${
                    errors.password ? 'border-red-400' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Must contain at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>
          </div>

          {/* Business Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-dark border-b border-gray-200 pb-2">
              Business Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Business Name */}
              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  id="businessName"
                  type="text"
                  value={formData.businessName || ''}
                  onChange={(e) => updateField('businessName', e.target.value)}
                  placeholder="Acme Corporation"
                  className={`w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${
                    errors.businessName ? 'border-red-400' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                  autoComplete="organization"
                  required
                />
                {errors.businessName && (
                  <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
                )}
              </div>

              {/* Business Number */}
              <div>
                <label htmlFor="businessNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Business Number
                </label>
                <input
                  id="businessNumber"
                  type="text"
                  value={formData.businessNumber || ''}
                  onChange={(e) => updateField('businessNumber', e.target.value)}
                  placeholder="123456789"
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                  disabled={isLoading}
                />
                {errors.businessNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.businessNumber}</p>
                )}
              </div>
            </div>

            {/* Business Address */}
            <div>
              <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700 mb-1">
                Business Address *
              </label>
              <input
                id="businessAddress"
                type="text"
                value={formData.businessAddress || ''}
                onChange={(e) => updateField('businessAddress', e.target.value)}
                placeholder="123 Business St, City, State, ZIP"
                className={`w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${
                  errors.businessAddress ? 'border-red-400' : 'border-gray-300'
                }`}
                disabled={isLoading}
                autoComplete="street-address"
                required
              />
              {errors.businessAddress && (
                <p className="mt-1 text-sm text-red-600">{errors.businessAddress}</p>
              )}
            </div>

            {/* Business Website */}
            <div>
              <label htmlFor="businessWebsite" className="block text-sm font-medium text-gray-700 mb-1">
                Business Website *
              </label>
              <input
                id="businessWebsite"
                type="url"
                value={formData.businessWebsite || ''}
                onChange={(e) => updateField('businessWebsite', e.target.value)}
                placeholder="https://www.yourcompany.com"
                className={`w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${
                  errors.businessWebsite ? 'border-red-400' : 'border-gray-300'
                }`}
                disabled={isLoading}
                autoComplete="url"
                required
              />
              {errors.businessWebsite && (
                <p className="mt-1 text-sm text-red-600">{errors.businessWebsite}</p>
              )}
            </div>
          </div>

          {/* Location & Role Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-dark border-b border-gray-200 pb-2">
              Location & Role
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CountrySelect
                selected={formData.country || ''}
                onChange={(c) => updateField('country', c)}
                error={errors.country}
                disabled={isLoading}
              />
              <OccupationSelect
                selected={formData.occupation || ''}
                onChange={(o) => updateField('occupation', o as any)}
                error={errors.occupation}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-dark text-accent rounded-lg font-medium hover:bg-accent hover:text-dark transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin mr-2" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link 
              href="/auth/login"
              className="text-accent hover:text-accent-dark font-medium transition-colors"
            >
              Sign in here
            </Link>
          </p>
          
          {/* Copyright */}
          <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
            'name' is a subsidiary of Despoke LLC Copyright 2025
          </div>
        </div>
      </div>
    </div>
  );
}