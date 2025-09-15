'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function MobileLogoutSuccessPage() {
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
        {/* Success Message */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4" style={{ color: 'black' }}>
            Logged Out Successfully
          </h1>
          <p className="text-gray-600 mb-6">
            You have been successfully logged out of your account. Thank you for using Ordira.
          </p>
        </div>

        {/* Sign In Button */}
        <div className="space-y-4">
          <Link href="/auth/login/mobile">
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
              Back to Sign In
            </button>
          </Link>
        </div>

        {/* Sign Up Link */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link 
              href="/auth/register/mobile" 
              className="font-medium hover:underline"
              style={{ color: '#FF6900' }}
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
