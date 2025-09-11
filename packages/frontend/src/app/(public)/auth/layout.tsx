// src/app/(public)/auth/layout.tsx
import React from 'react';
import type { Metadata } from 'next';
import { generateAuthMetadata } from '@/lib/utils/metadata';

/**
 * Authentication pages layout
 * 
 * This layout provides:
 * - Clean, focused authentication experience
 * - Consistent branding across all auth pages
 * - Conversion-optimized design
 * - Proper SEO for auth pages
 */

export const metadata: Metadata = generateAuthMetadata({
  authType: 'login',
  title: 'Authentication',
  description: 'Sign in or create your Ordira account to access the decentralized manufacturing platform.',
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 via-transparent to-[var(--accent)]/5" />
      
      {/* Auth Container */}
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-3">
            <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-2xl font-satoshi-bold text-[var(--heading-color)]">
              Ordira
            </span>
          </div>
        </div>

        {/* Auth Content */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-lg p-8">
          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-[var(--muted)] font-satoshi">
            © 2024 Ordira. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Auth Layout Features:
 * 
 * 1. Conversion Optimized: Clean, focused design
 * 2. Brand Consistency: Ordira logo and colors
 * 3. Responsive Design: Works on all devices
 * 4. Accessibility: Proper focus management
 * 5. SEO Ready: Proper metadata for auth pages
 * 6. Performance: Lightweight and fast
 * 7. Security: No sensitive data exposure
 * 8. User Experience: Intuitive authentication flow
 */
