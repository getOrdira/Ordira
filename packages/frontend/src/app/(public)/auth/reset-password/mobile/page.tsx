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

export default function MobileResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword } = useAuth();

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
      // For testing purposes, set a dummy token
      setToken('test-token');
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
      <div className="min-h-screen bg-white p-4">
        {/* Mobile Header with Logo */}
        <div className="flex justify-center mb-8 pt-8">
          <Image 
            src="/ordira-logo.svg" 
            alt="Ordira Logo" 
            width={120}
            height={48}
            className="h-10 w-auto"
          />
        </div>

        {/* Main Content */}
        <div className="max-w-md mx-auto">
          {/* Error Message */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="font-serif font-bold text-3xl mb-2" style={{ 
              color: 'black', 
              lineHeight: '1.2'
            }}>Invalid Link</h2>
            <p className="text-sm text-gray-600" style={{ color: 'gray' }}>
              This password reset link is invalid or has expired
            </p>
          </div>

          {/* Back to Login Button */}
          <Link
            href="/auth/login"
            style={{
              backgroundColor: '#FF6900',
              color: 'white',
              height: '48px',
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
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
      {/* Mobile Header with Logo */}
      <div className="flex justify-center mb-8 pt-8">
        <Image 
          src="/ordira-logo.svg" 
          alt="Ordira Logo" 
          width={120}
          height={48}
          className="h-10 w-auto"
        />
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto">
        {/* Welcome Text */}
        <div className="text-center mb-8">
          <h2 className="font-serif font-bold text-3xl mb-2" style={{ 
            color: 'black', 
            lineHeight: '1.2'
          }}>Reset Password</h2>
          <p className="text-sm text-gray-600" style={{ color: 'gray' }}>
            Enter your new password below
          </p>
        </div>

        {/* Reset Password Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  height: '48px',
                  borderRadius: '12px',
                  padding: '14px 50px 14px 18px',
                  fontSize: '16px',
                  border: form.formState.errors.password ? '2px solid #ef4444' : 'none',
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
            {form.formState.errors.password && (
              <p className="text-sm text-red-600">
                {form.formState.errors.password.message}
              </p>
            )}
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
                  height: '48px',
                  borderRadius: '12px',
                  padding: '14px 50px 14px 18px',
                  fontSize: '16px',
                  border: form.formState.errors.confirmPassword ? '2px solid #ef4444' : 'none',
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
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-red-600">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              backgroundColor: '#FF6900',
              color: 'black',
              height: '48px',
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

          {/* Back to Login Link */}
          <div className="text-center pt-4">
            <p className="text-sm text-gray-600">
              Remember your password?{' '}
              <Link 
                href="/auth/login" 
                className="font-medium hover:underline"
                style={{ color: '#FF6900', fontSize: '16px', fontWeight: '500' }}
              >
                Sign In
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
