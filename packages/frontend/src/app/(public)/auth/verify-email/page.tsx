// src/app/(public)/auth/verify-email/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, AlertCircle, Mail, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/primitives/button';

export default function VerifyEmailPage() {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const email = searchParams?.get('email');
  const token = searchParams?.get('token');
  const verified = searchParams?.get('verified') === 'true';

  const handleResendEmail = async () => {
    if (!email) return;
    
    setIsResending(true);
    setError(null);
    
    try {
      // TODO: Implement resend verification email API call
      // await resendVerificationEmail(email);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="text-2xl font-bold text-gray-900">Ordira</span>
            </div>
          </div>

          {/* Status Icon */}
          <div className="mb-6">
            {verified ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
            )}
          </div>

          {/* Content */}
          {verified ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Email Verified!
              </h1>
              <p className="text-gray-600 mb-6">
                Your email has been successfully verified. You can now access your Ordira account.
              </p>
              <Link href="/auth/login">
                <Button className="w-full">
                  Continue to Sign In
                </Button>
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Check Your Email
              </h1>
              <p className="text-gray-600 mb-6">
                We've sent a verification link to{' '}
                <span className="font-medium text-gray-900">{email || 'your email address'}</span>.
                Please check your inbox and click the link to verify your account.
              </p>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {resendSuccess && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <p className="text-green-700 text-sm">Verification email sent!</p>
                </div>
              )}

              {/* Resend Button */}
              <div className="space-y-4">
                <button
                  onClick={handleResendEmail}
                  disabled={isResending || !email}
                  className="w-full py-2 px-4 bg-white text-gray-900 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isResending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  {isResending ? 'Sending...' : 'Resend Verification Email'}
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Didn't receive the email? Check your spam folder or{' '}
                    <button
                      onClick={handleResendEmail}
                      disabled={isResending || !email}
                      className="text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
                    >
                      try again
                    </button>
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Back to Login */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link 
              href="/auth/login" 
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
