'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import * as z from 'zod';
import { CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { authApi, authHelpers } from '@/lib/apis/auth';
import { RegisterUserData, RegisterBusinessData, RegisterManufacturerData } from '@/lib/typessss/auth';
import { PasswordStrengthIndicator } from '@/components/ui/feedback/password-strength-indicator';

// Registration form validation schema
const registerSchema = z.object({
  userType: z.enum(['brand', 'manufacturer', 'creator'], {
    message: 'Please select your account type'
  }),
  // Personal Information
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  confirmPassword: z.string(),
  // Business Information (required for all users)
  businessName: z.string().min(1, 'Business name is required'),
  businessWebsite: z.string().url('Please enter a valid website URL').optional().or(z.literal('')),
  businessNumber: z.string().optional(),
  // Terms
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
  marketingConsent: z.boolean().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showUserTypeDropdown, setShowUserTypeDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

  const userTypeOptions = [
    { value: 'brand', label: 'Brand', description: 'Create and manage brand campaigns' },
    { value: 'manufacturer', label: 'Manufacturer', description: 'Provide manufacturing services' },
    { value: 'creator', label: 'Creator', description: 'Create and sell digital content' }
  ];
  
  const searchParams = useSearchParams();
  const errorParam = searchParams?.get('error');

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Redirect to mobile version if on mobile
  useEffect(() => {
    if (isMobile && typeof window !== 'undefined') {
      window.location.href = '/auth/register/mobile';
    }
  }, [isMobile]);

  // Handle URL parameters
  useEffect(() => {
    if (errorParam === 'unauthorized') {
      setError('You need to log in to access that page');
    }
  }, [errorParam]);

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      userType: undefined,
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      businessName: '',
      businessWebsite: '',
      businessNumber: '',
      acceptTerms: false,
      marketingConsent: false,
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let response;

      if (data.userType === 'manufacturer') {
        const registerData: RegisterManufacturerData = {
          name: data.businessName,
          email: data.email,
          password: data.password,
          website: data.businessWebsite || undefined,
          acceptTerms: data.acceptTerms,
          marketingConsent: data.marketingConsent,
        };
        response = await authApi.registerManufacturer(registerData);
      } else if (data.userType === 'brand' || data.userType === 'creator') {
        const registerData: RegisterBusinessData = {
          businessName: data.businessName,
          businessEmail: data.email,
          password: data.password,
          businessWebsite: data.businessWebsite || undefined,
          businessNumber: data.businessNumber || undefined,
          contactName: `${data.firstName} ${data.lastName}`,
          acceptTerms: data.acceptTerms,
          marketingConsent: data.marketingConsent,
        };
        response = await authApi.registerBusiness(registerData);
      } else {
        throw new Error('Invalid user type selected');
      }
      
      if (response.success) {
        // Redirect to verify-email page with the email address
        const emailParam = encodeURIComponent(data.email);
        window.location.href = `/auth/verify-email?email=${emailParam}`;
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      {/* Left Side - Black Background */}
      <div className="w-1/2 bg-black relative" style={{ 
        backgroundColor: 'black',
        borderTopRightRadius: '24px',
        borderBottomRightRadius: '24px',
      }}>
        {/* Logo */}
        <div className="absolute z-10" style={{ top: '18px', left: '18px' }}>
          <Image 
            src="/ordira-logo.svg" 
            alt="Ordira Logo" 
            width={120}
            height={48}
            className="h-12 w-auto"
          />
        </div>
      </div>

      {/* Right Side - Register Form */}
        <div className="w-1/2 bg-white h-screen overflow-y-auto" style={{ backgroundColor: 'white' }}>
         <div className="w-full max-w-2xl mx-auto px-8" style={{ maxWidth: '560px', width: '100%', paddingTop: '50px', paddingBottom: '50px' }}>
              <div className="w-full max-w-lg mx-auto">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8 sm:mb-12">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>  
            </div>
          </div>

          {/* Welcome Text */}
          <div className="text-center mb-20 sm:mb-24">
            <h2 className="font-serif font-bold mt-4 text-4xl md:text-6xl" style={{ 
              color: 'black', 
              lineHeight: '1.2',
              marginBottom: '6px'
            }}>Create Account</h2>
            <p className="text-base sm:text-md text-gray-600" style={{ color: 'gray' }}>
              Complete the following form and submit to create your account.
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-xs sm:text-sm">{error}</p>
              </div>
            )}
            
          {success && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
              <p className="text-green-700 text-xs sm:text-sm">{success}</p>
              </div>
            )}

          {/* Register Form */}
          <form onSubmit={registerForm.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            {/* User Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">
                Account Type *
              </label>
              <div className="relative">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowUserTypeDropdown(!showUserTypeDropdown)}
                    style={{
                      backgroundColor: '#f5f5f5',
                      height: '40px',
                      borderRadius: '12px',
                      padding: '14px 40px 14px 18px',
                      fontSize: '16px',
                      border: registerForm.formState.errors.userType ? '2px solid #ef4444' : 'none',
                      marginBottom: '24px',
                      color: registerForm.watch('userType') ? '#000000' : '#6B7280',
                      width: '100%',
                      outline: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <span style={{ flex: 1, paddingRight: '20px' }}>
                      {registerForm.watch('userType') 
                        ? userTypeOptions.find(opt => opt.value === registerForm.watch('userType'))?.label
                        : 'Select your Account Type'
                      }
                    </span>
                    <svg 
                      className={`w-4 h-4 transition-transform ${showUserTypeDropdown ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      style={{ 
                        color: '#6B7280',
                        flexShrink: 0,
                        width: '16px',
                        height: '16px'
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showUserTypeDropdown && (
                    <div 
                      className="absolute z-20 w-full border border-gray-200 shadow-lg"
                      style={{
                        backgroundColor: '#f5f5f5',
                        borderRadius: '12px',
                        top: '100%',
                        left: '0',
                        marginTop: '4px'
                      }}
                    >
                      {userTypeOptions.map((option, index) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            registerForm.setValue('userType', option.value as 'brand' | 'manufacturer' | 'creator');
                            setShowUserTypeDropdown(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            textAlign: 'left',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: '16px',
                            color: '#000000',
                            borderRadius: index === 0 ? '12px 12px 0 0' : index === userTypeOptions.length - 1 ? '0 0 12px 12px' : '0',
                            transition: 'background-color 0.2s ease'
                          }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FF6900';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#000000';
                        }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ minHeight: '20px', marginTop: '-20px' }}>
                {registerForm.formState.errors.userType && (
                  <p className="text-sm" style={{ color: '#ef4444', margin: 0, marginTop: '4px' }}>{registerForm.formState.errors.userType.message}</p>
                )}
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Name Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">
                  First Name*
                </label>
                <input
                  type="text"
                  placeholder="Enter your first name"
                  {...registerForm.register('firstName')}
                  style={{
                    backgroundColor: '#f5f5f5',
                    height: '40px',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    fontSize: '16px',
                    border: registerForm.formState.errors.firstName ? '2px solid #ef4444' : 'none',
                    marginBottom: '24px',
                    color: '#000000',
                    width: '100%',
                    outline: 'none'
                  }}
                />
                <div style={{ minHeight: '20px', marginTop: '-20px' }}>
                  {registerForm.formState.errors.firstName && (
                    <p className="text-sm" style={{ color: '#ef4444', margin: 0, marginTop: '4px' }}>{registerForm.formState.errors.firstName.message}</p>
                  )}
                </div>
              </div>

              {/* Last Name Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">
                  Last Name*
                </label>
                <input
                  type="text"
                  placeholder="Enter your last name"
                  {...registerForm.register('lastName')}
                  style={{
                    backgroundColor: '#f5f5f5',
                    height: '40px',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    fontSize: '16px',
                    border: registerForm.formState.errors.lastName ? '2px solid #ef4444' : 'none',
                    marginBottom: '24px',
                    color: '#000000',
                    width: '100%',
                    outline: 'none'
                  }}
                />
                <div style={{ minHeight: '20px', marginTop: '-20px' }}>
                  {registerForm.formState.errors.lastName && (
                    <p className="text-sm" style={{ color: '#ef4444', margin: 0, marginTop: '4px' }}>{registerForm.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">
                Email*
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                {...registerForm.register('email')}
                style={{
                  backgroundColor: '#f5f5f5',
                  height: '40px',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  fontSize: '16px',
                  border: registerForm.formState.errors.email ? '2px solid #ef4444' : 'none',
                  marginBottom: '24px',
                  color: '#000000',
                  width: '100%',
                  outline: 'none'
                }}
              />
              <div style={{ minHeight: '20px', marginTop: '-20px' }}>
                {registerForm.formState.errors.email && (
                  <p className="text-sm" style={{ color: '#ef4444', margin: 0, marginTop: '4px' }}>{registerForm.formState.errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Business Information */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">
                Business Name *
              </label>
              <input
                type="text"
                placeholder="Enter your business name"
                {...registerForm.register('businessName')}
                style={{
                  backgroundColor: '#f5f5f5',
                  height: '40px',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  fontSize: '16px',
                  border: registerForm.formState.errors.businessName ? '2px solid #ef4444' : 'none',
                  marginBottom: '24px',
                  color: '#000000',
                  width: '100%',
                  outline: 'none'
                }}
              />
              <div style={{ minHeight: '20px', marginTop: '-20px' }}>
                {registerForm.formState.errors.businessName && (
                  <p className="text-sm" style={{ color: '#ef4444', margin: 0, marginTop: '4px' }}>{registerForm.formState.errors.businessName.message}</p>
                )}
              </div>
            </div>

            {/* Business Website */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">
                Business Website*
              </label>
              <input
                type="url"
                placeholder="https://your-website.com"
                {...registerForm.register('businessWebsite')}
                style={{
                  backgroundColor: '#f5f5f5',
                  height: '40px',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  fontSize: '16px',
                  border: registerForm.formState.errors.businessWebsite ? '2px solid #ef4444' : 'none',
                  marginBottom: '24px',
                  color: '#000000',
                  width: '100%',
                  outline: 'none'
                }}
              />
              <div style={{ minHeight: '20px', marginTop: '-20px' }}>
                {registerForm.formState.errors.businessWebsite && (
                  <p className="text-sm" style={{ color: '#ef4444', margin: 0, marginTop: '4px' }}>{registerForm.formState.errors.businessWebsite.message}</p>
                )}
              </div>
            </div>

            {/* Business Number */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">
                Business Registration Number (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter your business registration number"
                {...registerForm.register('businessNumber')}
                style={{
                  backgroundColor: '#f5f5f5',
                  height: '40px',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  fontSize: '16px',
                  border: registerForm.formState.errors.businessNumber ? '2px solid #ef4444' : 'none',
                  marginBottom: '24px',
                  color: '#000000',
                  width: '100%',
                  outline: 'none'
                }}
              />
              <div style={{ minHeight: '20px', marginTop: '-20px' }}>
                {registerForm.formState.errors.businessNumber && (
                  <p className="text-sm" style={{ color: '#ef4444', margin: 0, marginTop: '4px' }}>{registerForm.formState.errors.businessNumber.message}</p>
                )}
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">
                Password*
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...registerForm.register('password')}
                  onChange={(e) => {
                    registerForm.setValue('password', e.target.value);
                    setPasswordValue(e.target.value);
                  }}
                  style={{
                    backgroundColor: '#f5f5f5',
                    height: '40px',
                    borderRadius: '12px',
                    padding: '14px 40px 14px 18px',
                    fontSize: '16px',
                    border: registerForm.formState.errors.password ? '2px solid #ef4444' : 'none',
                    marginBottom: '12px',
                    color: '#000000',
                    width: '100%',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '8px',
                    width: '24px',
                    height: '24px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                  }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6900" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              <PasswordStrengthIndicator password={passwordValue} />
              
              <div style={{ minHeight: '20px', marginTop: '-20px' }}>
                {registerForm.formState.errors.password && (
                  <p className="text-sm" style={{ color: '#ef4444', margin: 0, marginTop: '4px' }}>{registerForm.formState.errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">
                Confirm Password*
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  {...registerForm.register('confirmPassword')}
                  style={{
                    backgroundColor: '#f5f5f5',
                    height: '40px',
                    borderRadius: '12px',
                    padding: '14px 40px 14px 18px',
                    fontSize: '16px',
                    border: registerForm.formState.errors.confirmPassword ? '2px solid #ef4444' : 'none',
                    marginBottom: '24px',
                    color: '#000000',
                    width: '100%',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '8px',
                    width: '24px',
                    height: '24px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                  }}
                >
                  {showConfirmPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6900" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
              <div style={{ minHeight: '20px', marginTop: '-20px' }}>
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-sm" style={{ color: '#ef4444', margin: 0, marginTop: '4px' }}>{registerForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Terms and Marketing Consent */}
            <div className="space-y-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...registerForm.register('acceptTerms')}
                  style={{
                    width: '14px',
                    height: '14px',
                    accentColor: '#FF6900',
                    marginRight: '8px',
                    flexShrink: 0
                  }}
                />
                <span className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="/terms" className="text-orange-500 hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-orange-500 hover:underline">
                    Privacy Policy
                  </a>
                </span>
              </label>
              {registerForm.formState.errors.acceptTerms && (
                <div style={{ marginTop: '1px', marginLeft: '22px' }}>
                  <p className="text-sm" style={{ color: '#ef4444', margin: 0 }}>{registerForm.formState.errors.acceptTerms.message}</p>
                </div>
              )}

              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...registerForm.register('marketingConsent')}
                  style={{
                    width: '14px',
                    height: '14px',
                    accentColor: '#FF6900',
                    marginRight: '8px',
                    flexShrink: 0
                  }}
                />
                <span className="text-sm text-gray-600">
                  I would like to receive marketing communications from Ordira
                </span>
              </label>
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: isLoading ? '#CC5500' : '#FF6900',
                color: 'white',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s ease',
                marginTop: '24px',
                marginBottom: '10px'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#CC5500';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#FF6900';
                }
              }}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>

            {/* Sign In Link */}
            <div className="text-center pt-4 pb-8">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link 
                  href="/auth/login" 
                  className="font-medium hover:underline"
                  style={{ color: '#FF6900', marginTop: '10px' }}
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
    </div>
  );
}