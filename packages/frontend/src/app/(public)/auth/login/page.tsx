// src/app/(public)/auth/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import * as z from 'zod';
import { useAuth } from '@/providers/auth-provider';
import { authHelpers } from '@/lib/api/auth';
import { CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/primitives/button';
import { LoadingSpinner } from '@/components/ui/feedback/loading-spinner';
import { ForgotPasswordModal } from '../forgot-password-modal';

// Validation schemas aligned with backend validation
const loginSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  password: z.string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect');
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
      window.location.href = '/auth/login/mobile';
    }
  }, [isMobile]);

  // Handle URL parameters
  useEffect(() => {
    if (errorParam === 'unauthorized') {
      setError('You need to log in to access that page');
    } else if (errorParam === 'authentication_required') {
      setError('Please log in to continue');
    }
  }, [errorParam]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const onLogin = async (data: LoginFormValues) => {
    setError(null);
    setIsLoading(true);
    
    try {
      // Add device fingerprint for security
      const credentials = {
        ...data,
        deviceFingerprint: authHelpers.generateDeviceFingerprint(),
      };
      
      await login(credentials);
      // AuthProvider will handle redirect based on user role
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <div className="min-h-screen flex bg-white">
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

      {/* Right Side - Login Form */}
        <div className="w-1/2 flex flex-col p-4 sm:p-8 bg-white min-h-screen" style={{ backgroundColor: 'white' }}>
         <div className="flex-1 flex flex-col justify-center">
           <div className="w-full max-w-2xl mx-auto p-8" style={{ maxWidth: '560px', width: '100%' }}>
              <div className="w-full max-w-lg mx-auto">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8 sm:mb-12">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
            </div>

            </div>
          </div>

          {/* Welcome Text */}
          <div className="text-center mb-20 sm:mb-24">
            <h2 className="font-serif font-bold mt-4" style={{ 
              color: 'black', 
              fontSize: '48px',
              lineHeight: '1.2',
              marginBottom: '6px'
            }}>Welcome</h2>
            <p className="text-base sm:text-md text-gray-600" style={{ color: 'gray' }}>
              Enter your email and password to access your account
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

          {/* Login Form */}
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-16 w-full" suppressHydrationWarning>
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                {...loginForm.register('email')}
                style={{
                  backgroundColor: '#f5f5f5',
                  height: '40px',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  fontSize: '16px',
                  border: loginForm.formState.errors.email ? '2px solid #ef4444' : 'none',
                  marginBottom: '24px',
                  color: '#000000',
                  width: '100%',
                  outline: 'none'
                }}
              />
              <div style={{ minHeight: '20px', marginTop: '-20px' }}>
                {loginForm.formState.errors.email && (
                  <p className="text-sm" style={{ color: '#ef4444', margin: 0, marginTop: '4px' }}>{loginForm.formState.errors.email.message}</p>
                )}
              </div>
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
                  {...loginForm.register('password')}
                  style={{
                    backgroundColor: '#f5f5f5',
                    height: '40px',
                    borderRadius: '12px',
                    padding: '14px 40px 14px 18px',
                    fontSize: '16px',
                    border: loginForm.formState.errors.password ? '2px solid #ef4444' : 'none',
                    marginBottom: '24px',
                    color: '#000000',
                    width: '100%',
                    outline: 'none',
                    boxShadow: 'none',
                    appearance: 'none'
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
              <div style={{ minHeight: '20px', marginTop: '-20px' }}>
                {loginForm.formState.errors.password && (
                  <p className="text-sm" style={{ color: '#ef4444', margin: 0, marginTop: '4px' }}>{loginForm.formState.errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-12">
               <div className="flex items-center space-x-12">
                <label 
                  htmlFor="remember-me" 
                  className="text-md font-medium text-gray-700 cursor-pointer"
                  style={{ color: 'black' }}
                >
                  Remember me
                </label>
                    <input
                      type="checkbox"
                  id="remember-me"
                      {...loginForm.register('rememberMe')}
                  style={{
                    width: '14px',
                    height: '14px',
                    cursor: 'pointer',
                    accentColor: '#FF6900',
                    marginLeft: '6px'
                  }}
                  className="rounded border-2 border-gray-300"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsForgotPasswordModalOpen(true)}
                className="text-base text-[#FF6900] hover:text-[#CC5500] font-medium transition-colors"
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Forgot Password?
              </button>
                </div>

            {/* Sign In Button */}
            <div className="pt-16">
            <Button 
                  type="submit"
              variant="primary" 
              size="lg" 
                  disabled={isLoading}
              className="w-full"
              style={{
                height: '42px',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '1200',
                backgroundColor: '#FF6900',
                border: 'none',
                marginTop: '18px'
              }}
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" variant="white" />
                  ) : (
                    'Sign In'
                  )}
            </Button>
            </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sign Up Link - Fixed at bottom */}
        <div className="text-center pb-8">
          <p className="text-base text-gray-600" style={{ color: 'black' }}>
            Don't have an account?{' '}
            <Link 
              href="/auth/register" 
              className="text-base text-[#FF6900] hover:text-[#CC5500] font-medium transition-colors"
              style={{ fontSize: '16px', fontWeight: '500' }}
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>

    </div>

    {/* Forgot Password Modal - Outside main container */}
    <ForgotPasswordModal
      isOpen={isForgotPasswordModalOpen}
      onClose={() => setIsForgotPasswordModalOpen(false)}
    />
    </>
  );
}
