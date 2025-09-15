'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, AlertCircle, Mail, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { LoadingSpinner } from '@/components/ui/feedback/loading-spinner';

export default function MobileVerifyEmailPage() {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  
  const searchParams = useSearchParams();
  const email = searchParams?.get('email');
  const token = searchParams?.get('token');
  const verified = searchParams?.get('verified') === 'true';

  const handleResendEmail = async () => {
    if (!email || countdown > 0) return;
    
    setIsResending(true);
    setError(null);
    
    try {
      // TODO: Implement resend verification email API call
      // await resendVerificationEmail(email);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
      
      // Start countdown timer
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
        {/* Content */}
        {verified ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4" style={{ color: 'black' }}>
                Email Verified!
              </h1>
              <p className="text-gray-600 mb-6">
                Your email has been validated. Your account is under review.
              </p>
            </div>

            <Link href="/auth/login">
              <button
                style={{
                  backgroundColor: '#FF6900',
                  color: 'black',
                  height: '48px',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: '500',
                  width: '100%',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Continue to Sign In
              </button>
            </Link>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4" style={{ color: 'black' }}>
                Check Your Email
              </h1>
              <p className="text-gray-600 mb-6">
                We've sent a verification link to{' '}
                <span className="font-medium text-gray-900">{email || 'your email address'}</span>.
                Please check your inbox and click the link to verify your account.
              </p>
            </div>

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
                disabled={isResending || !email || countdown > 0}
                style={{
                  backgroundColor: (isResending || countdown > 0) ? '#CC5500' : '#FF6900',
                  color: 'black',
                  height: '48px',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: '500',
                  width: '100%',
                  border: 'none',
                  cursor: (isResending || countdown > 0) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseDown={(e) => {
                  if (!isResending && email && countdown === 0) {
                    e.currentTarget.style.backgroundColor = '#CC5500';
                  }
                }}
                onMouseUp={(e) => {
                  if (!isResending && email && countdown === 0) {
                    e.currentTarget.style.backgroundColor = '#FF6900';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isResending && email && countdown === 0) {
                    e.currentTarget.style.backgroundColor = '#FF6900';
                  }
                }}
              >
                {isResending ? (
                  <>
                    <LoadingSpinner size="sm" variant="white" />
                    Sending...
                  </>
                ) : countdown > 0 ? (
                  `Resend in ${countdown}s`
                ) : (
                  'Resend Verification Email'
                )}
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    onClick={handleResendEmail}
                    disabled={isResending || !email}
                    style={{
                      color: '#FF6900',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '500',
                      opacity: (isResending || !email) ? 0.5 : 1
                    }}
                  >
                    try again
                  </button>
                </p>
              </div>
            </div>
          </>
        )}

        {/* Back to Login */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <Link 
            href="/auth/login" 
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            style={{ fontSize: '16px', fontWeight: '500' }}
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
