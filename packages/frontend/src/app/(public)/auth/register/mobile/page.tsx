'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';
import { RegisterUserData, RegisterBusinessData, RegisterManufacturerData } from '@/lib/types/auth';

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

export default function MobileRegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showUserTypeDropdown, setShowUserTypeDropdown] = useState(false);

  const userTypeOptions = [
    { value: 'brand', label: 'Brand', description: 'Create and manage brand campaigns' },
    { value: 'manufacturer', label: 'Manufacturer', description: 'Provide manufacturing services' },
    { value: 'creator', label: 'Creator', description: 'Create and sell digital content' }
  ];

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
        // Redirect to mobile verify-email page with the email address
        const emailParam = encodeURIComponent(data.email);
        window.location.href = `/auth/verify-email/mobile?email=${emailParam}`;
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">
      {/* Mobile Header with Logo */}
      <div className="flex justify-center pt-6 pb-4 bg-white flex-shrink-0">
        <Image 
          src="/ordira-logo.svg" 
          alt="Ordira Logo" 
          width={120}
          height={48}
          className="h-10 w-auto"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <div className="max-w-md mx-auto pt-16">
        {/* Welcome Text */}
        <div className="text-center mb-6">
          <h2 className="font-serif font-bold text-3xl mb-2" style={{ 
            color: 'black', 
            lineHeight: '1.2'
          }}>Create Account</h2>
          <p className="text-sm text-gray-600" style={{ color: 'gray' }}>
            Join Ordira and start your decentralized manufacturing journey
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={registerForm.handleSubmit(onSubmit)} className="space-y-4">
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
                    height: '48px',
                    borderRadius: '12px',
                    padding: '14px 40px 14px 18px',
                    fontSize: '16px',
                    border: 'none',
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
                    className="absolute z-20 w-full bg-white border border-gray-200 shadow-lg"
                    style={{
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
            {registerForm.formState.errors.userType && (
              <p className="text-sm text-red-600">{registerForm.formState.errors.userType.message}</p>
            )}
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-3">
            {/* First Name Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">
                First Name
              </label>
              <input
                type="text"
                placeholder="First name"
                {...registerForm.register('firstName')}
                style={{
                  backgroundColor: '#f5f5f5',
                  height: '48px',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  fontSize: '16px',
                  border: 'none',
                  color: '#000000',
                  width: '100%',
                  outline: 'none'
                }}
              />
              {registerForm.formState.errors.firstName && (
                <p className="text-sm text-red-600">{registerForm.formState.errors.firstName.message}</p>
              )}
            </div>

            {/* Last Name Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">
                Last Name
              </label>
              <input
                type="text"
                placeholder="Last name"
                {...registerForm.register('lastName')}
                style={{
                  backgroundColor: '#f5f5f5',
                  height: '48px',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  fontSize: '16px',
                  border: 'none',
                  color: '#000000',
                  width: '100%',
                  outline: 'none'
                }}
              />
              {registerForm.formState.errors.lastName && (
                <p className="text-sm text-red-600">{registerForm.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-black">
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              {...registerForm.register('email')}
              style={{
                backgroundColor: '#f5f5f5',
                height: '48px',
                borderRadius: '12px',
                padding: '14px 18px',
                fontSize: '16px',
                border: 'none',
                color: '#000000',
                width: '100%',
                outline: 'none'
              }}
            />
            {registerForm.formState.errors.email && (
              <p className="text-sm text-red-600">{registerForm.formState.errors.email.message}</p>
            )}
          </div>

          {/* Business Name */}
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
                height: '48px',
                borderRadius: '12px',
                padding: '14px 18px',
                fontSize: '16px',
                border: 'none',
                color: '#000000',
                width: '100%',
                outline: 'none'
              }}
            />
            {registerForm.formState.errors.businessName && (
              <p className="text-sm text-red-600">{registerForm.formState.errors.businessName.message}</p>
            )}
          </div>

          {/* Business Website */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-black">
              Business Website (Optional)
            </label>
            <input
              type="url"
              placeholder="https://your-website.com"
              {...registerForm.register('businessWebsite')}
              style={{
                backgroundColor: '#f5f5f5',
                height: '48px',
                borderRadius: '12px',
                padding: '14px 18px',
                fontSize: '16px',
                border: 'none',
                color: '#000000',
                width: '100%',
                outline: 'none'
              }}
            />
            {registerForm.formState.errors.businessWebsite && (
              <p className="text-sm text-red-600">{registerForm.formState.errors.businessWebsite.message}</p>
            )}
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
                height: '48px',
                borderRadius: '12px',
                padding: '14px 18px',
                fontSize: '16px',
                border: 'none',
                color: '#000000',
                width: '100%',
                outline: 'none'
              }}
            />
            {registerForm.formState.errors.businessNumber && (
              <p className="text-sm text-red-600">{registerForm.formState.errors.businessNumber.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-black">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                {...registerForm.register('password')}
                style={{
                  backgroundColor: '#f5f5f5',
                  height: '48px',
                  borderRadius: '12px',
                  padding: '14px 50px 14px 18px',
                  fontSize: '16px',
                  border: 'none',
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
                  top: '12px',
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
                  <Eye className="w-5 h-5 text-orange-500" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
            {registerForm.formState.errors.password && (
              <p className="text-sm text-red-600">{registerForm.formState.errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-black">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                {...registerForm.register('confirmPassword')}
                style={{
                  backgroundColor: '#f5f5f5',
                  height: '48px',
                  borderRadius: '12px',
                  padding: '14px 50px 14px 18px',
                  fontSize: '16px',
                  border: 'none',
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
                  top: '12px',
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
                  <Eye className="w-5 h-5 text-orange-500" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
            {registerForm.formState.errors.confirmPassword && (
              <p className="text-sm text-red-600">{registerForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Terms and Marketing Consent */}
          <div className="space-y-3">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                {...registerForm.register('acceptTerms')}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: '#FF6900',
                  marginTop: '2px'
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
              <p className="text-sm text-red-600">{registerForm.formState.errors.acceptTerms.message}</p>
            )}

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                {...registerForm.register('marketingConsent')}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: '#FF6900',
                  marginTop: '2px'
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
              marginTop: '16px'
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
          <div className="text-center pt-4">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link 
                href="/auth/login/mobile" 
                className="font-medium hover:underline"
                style={{ color: '#FF6900' }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
