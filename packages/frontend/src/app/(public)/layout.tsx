// src/app/(public)/layout.tsx
import React from 'react';
import type { Metadata } from 'next';
import { generateMetadata } from '@/lib/utils/metadata';

/**
 * Public pages layout for marketing and authentication
 * 
 * This layout provides:
 * - Clean, conversion-focused design
 * - SEO optimization for public pages
 * - Consistent branding across auth and marketing
 * - Performance optimizations for public content
 */

export const metadata: Metadata = generateMetadata({
  title: 'Ordira - Decentralized Manufacturing Platform',
  description: 'Transform manufacturing with decentralized collaboration, transparent voting, and blockchain certificates.',
});

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Skip to main content for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--primary)] focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Main content */}
      <main id="main-content" className="relative">
        {children}
      </main>

      {/* Global loading portal for public pages */}
      <div id="public-loading-portal" />
      
      {/* Toast notifications portal */}
      <div id="toast-portal" />
    </div>
  );
}

/**
 * Public Layout Features:
 * 
 * 1. SEO Optimized: Proper metadata and structure
 * 2. Accessibility: Skip links and semantic HTML
 * 3. Performance: Minimal overhead for public pages
 * 4. Conversion Focused: Clean design for marketing
 * 5. Consistent Branding: Ordira theme throughout
 * 6. Portal Support: Ready for modals and notifications
 * 7. Responsive: Works on all device sizes
 * 8. Fast Loading: Optimized for public content
 */
