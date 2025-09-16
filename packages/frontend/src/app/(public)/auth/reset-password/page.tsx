'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LoadingSpinner } from '@/components/ui/feedback/loading-spinner';

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword } = useAuth();

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
      const tokenParam = searchParams.get('token');
      const mobileUrl = tokenParam 
        ? `/auth/reset-password/mobile?token=${tokenParam}`
        : '/auth/reset-password/mobile';
      window.location.href = mobileUrl;
    }
  }, [isMobile, searchParams]);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      return;
    }
    setToken(tokenParam);
  }, [searchParams, router]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;

    setIsLoading(true);
    try {
      await resetPassword({
        token,
        newPassword: data.password,
        confirmPassword: data.confirmPassword,
      });
      // Success redirect is handled by the auth hook
    } catch (error) {
      // Error is handled by the auth hook
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
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

        {/* Right Side - Error Message */}
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

                {/* Error Message */}
                <div className="text-center mb-20 sm:mb-24">
                  <h2 className="font-serif font-bold mt-4" style={{ 
                    color: 'black', 
                    fontSize: '48px',
                    lineHeight: '1.2',
                    marginBottom: '6px'
                  }}>Invalid Link</h2>
                  <p className="text-base sm:text-md text-gray-600" style={{ color: 'gray' }}>
                    This password reset link is invalid or has expired
                  </p>
                </div>

                {/* Back to Login Button */}
                <div className="pt-16">
                  <Link
                    href="/auth/login"
                    style={{
                      backgroundColor: '#FF6900',
                      color: 'black',
                      height: '42px',
                      borderRadius: '12px',
                      fontSize: '18px',
                      fontWeight: '500',
                      width: '100%',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      marginTop: '18px'
                    }}
                  >
                    Back to Sign In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
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

      {/* Right Side - Reset Password Form */}
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
                }}>Reset Password</h2>
                <p className="text-base sm:text-md text-gray-600" style={{ color: 'gray' }}>
                  Enter your new password below
                </p>
              </div>

              {/* Reset Password Form */}
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-16 w-full" suppressHydrationWarning>
                {/* Password Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-black">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                      {...form.register('password')}
                      style={{
                        backgroundColor: '#f5f5f5',
                        height: '40px',
                        borderRadius: '12px',
                        padding: '14px 40px 14px 18px',
                        fontSize: '16px',
                        border: form.formState.errors.password ? '2px solid #ef4444' : 'none',
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
                    {form.formState.errors.password && (
                      <p className="text-sm" style={{ color: '#ef4444', margin: 0, marginTop: '4px' }}>
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-black">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your new password"
                      {...form.register('confirmPassword')}
                      style={{
                        backgroundColor: '#f5f5f5',
                        height: '40px',
                        borderRadius: '12px',
                        padding: '14px 40px 14px 18px',
                        fontSize: '16px',
                        border: form.formState.errors.confirmPassword ? '2px solid #ef4444' : 'none',
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
                    {form.formState.errors.confirmPassword && (
                      <p className="text-sm" style={{ color: '#ef4444', margin: 0, marginTop: '4px' }}>
                        {form.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-16">
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      backgroundColor: '#FF6900',
                      color: 'black',
                      height: '42px',
                      borderRadius: '12px',
                      fontSize: '18px',
                      fontWeight: '500',
                      width: '100%',
                      border: 'none',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading ? 0.7 : 1,
                      transition: 'all 0.2s ease',
                      marginTop: '18px'
                    }}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <LoadingSpinner size="sm" variant="white" className="mr-2" />
                        Resetting Password...
                      </div>
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Back to Login Link - Fixed at bottom */}
        <div className="text-center pb-8">
          <p className="text-base text-gray-600" style={{ color: 'black' }}>
            Remember your password?{' '}
            <Link 
              href="/auth/login" 
              className="text-base text-[#FF6900] hover:text-[#CC5500] font-medium transition-colors"
              style={{ fontSize: '16px', fontWeight: '500' }}
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
