'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function LogoutSuccessPage() {
  const [isMobile, setIsMobile] = useState(false);

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
      window.location.href = '/auth/logout-success/mobile';
    }
  }, [isMobile]);
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

      {/* Right Side - Logout Success Content */}
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

              {/* Success Message */}
              <div className="text-center mb-20 sm:mb-24">
                <h2 className="font-serif font-bold mt-4" style={{ 
                  color: 'black', 
                  fontSize: '48px',
                  lineHeight: '1.2',
                  marginBottom: '6px'
                }}>Logged Out Successfully</h2>
                <p className="text-base sm:text-md text-gray-600" style={{ color: 'gray' }}>
                  You have been successfully logged out of your account. Thank you for using Ordira.
                </p>
              </div>

              {/* Sign In Button */}
              <div className="pt-16">
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
                      marginTop: '18px'
                    }}
                  >
                    Back to Sign In
                  </button>
                </Link>
              </div>
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
  );
}
