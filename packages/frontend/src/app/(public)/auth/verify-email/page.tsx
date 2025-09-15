// src/app/(public)/auth/verify-email/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, AlertCircle, Mail } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { LoadingSpinner } from '@/components/ui/feedback/loading-spinner';

export default function VerifyEmailPage() {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const searchParams = useSearchParams();
  const email = searchParams?.get('email');
  const token = searchParams?.get('token');
  const verified = searchParams?.get('verified') === 'true';

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
      const params = new URLSearchParams();
      if (email) params.set('email', email);
      if (token) params.set('token', token);
      if (verified) params.set('verified', 'true');
      
      const mobileUrl = `/auth/verify-email/mobile?${params.toString()}`;
      window.location.href = mobileUrl;
    }
  }, [isMobile, email, token, verified]);

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

      {/* Right Side - Verify Email Content */}
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

              {/* Content */}
              <div className="text-center mb-20 sm:mb-24">
                {verified ? (
                  <>
                    <h2 className="font-serif font-bold mt-4" style={{ 
                      color: 'black', 
                      fontSize: '48px',
                      lineHeight: '1.2',
                      marginBottom: '6px'
                    }}>Email Verified!</h2>
                    <p className="text-base sm:text-md text-gray-600" style={{ color: 'gray' }}>
                      Your email has been verified. Your account is under review. We will notify you when your account is approved.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="font-serif font-bold mt-4" style={{ 
                      color: 'black', 
                      fontSize: '48px',
                      lineHeight: '1.2',
                      marginBottom: '6px'
                    }}>Check Your Email</h2>
                    <p className="text-base sm:text-md text-gray-600" style={{ color: 'gray' }}>
                      We've sent a verification link to{' '}
                      <span className="font-medium text-gray-900">{email || 'your email address'}</span>.
                      Please check your inbox and click the link to verify your account.
                    </p>
                  </>
                )}
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

              {/* Action Button */}
              <div className="pt-16">
                {verified ? (
                  <Link href="/auth/login">
                    <button
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
                        transition: 'all 0.2s ease',
                        marginTop: '18px',
                        marginBottom: '18px'
                      }}
                    >
                      Continue to Sign In
                    </button>
                  </Link>
                ) : (
                  <button
                    onClick={handleResendEmail}
                    disabled={isResending || !email || countdown > 0}
                    style={{
                      backgroundColor: (isResending || countdown > 0) ? '#CC5500' : '#FF6900',
                      color: 'black',
                      height: '42px',
                      borderRadius: '12px',
                      fontSize: '18px',
                      fontWeight: '500',
                      width: '100%',
                      border: 'none',
                      cursor: (isResending || countdown > 0) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      marginTop: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginBottom: '8px'
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
                )}
              </div>

              {/* Additional Help Text */}
              {!verified && (
                <div className="text-center pt-4 mt-4">
                  <p className="text-sm text-gray-600">
                    Didn't receive the email? Check your spam folder or try again.
                  </p>
                </div>
              )}
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
