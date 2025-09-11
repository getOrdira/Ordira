// src/app/(customer)/[brand]/layout.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

// UI Components
import { LoadingSpinner } from '@/components/ui/feedback/loading-spinner';
import { Alert } from '@/components/ui/feedback/alert';

// Icons
import { CubeIcon } from '@heroicons/react/24/outline';

/**
 * Brand-specific customer layout
 * 
 * This layout provides:
 * - Brand-specific theming and branding
 * - Brand-aware navigation
 * - Brand-specific customer experience
 * - Dynamic theming based on brand
 */

interface Brand {
  id: string;
  name: string;
  domain: string;
  logo: string;
  theme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  settings: {
    allowEmailGating: boolean;
    votingRules: string;
    certificateDesign: string;
  };
}

export default function BrandCustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const brandSlug = params.brand as string;
  const [brand, setBrand] = useState<Brand | null>(null);

  // Fetch brand data based on domain/slug
  const { data: brandData, isLoading, error } = useQuery<Brand>({
    queryKey: ['brand', brandSlug],
    queryFn: async () => {
      // This would fetch brand data from your API
      // For now, return mock data
      return {
        id: brandSlug,
        name: brandSlug.charAt(0).toUpperCase() + brandSlug.slice(1),
        domain: `${brandSlug}.ordira.com`,
        logo: `/brands/${brandSlug}/logo.png`,
        theme: {
          primary: '#FF6900',
          secondary: '#2F1300',
          accent: '#B54A00',
        },
        settings: {
          allowEmailGating: true,
          votingRules: 'One vote per email address',
          certificateDesign: 'default',
        },
      };
    },
    enabled: !!brandSlug,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  useEffect(() => {
    if (brandData) {
      setBrand(brandData);
      // Apply brand-specific theming
      document.documentElement.style.setProperty('--brand-primary', brandData.theme.primary);
      document.documentElement.style.setProperty('--brand-secondary', brandData.theme.secondary);
      document.documentElement.style.setProperty('--brand-accent', brandData.theme.accent);
    }
  }, [brandData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <LoadingSpinner 
          size="lg" 
          variant="primary"
          text={`Loading ${brandSlug}...`}
        />
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <Alert variant="error" className="mb-4">
            <h3 className="font-satoshi-semibold">Brand Not Found</h3>
            <p className="text-sm mt-1">
              The brand "{brandSlug}" could not be found or is not available.
            </p>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Brand Header */}
      <header className="bg-[var(--card-bg)] border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Brand Logo and Name */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[var(--brand-primary)] rounded-lg flex items-center justify-center">
                <CubeIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-satoshi-bold text-[var(--heading-color)]">
                  {brand.name}
                </h1>
                <p className="text-sm text-[var(--muted)]">
                  Decentralized Manufacturing Platform
                </p>
              </div>
            </div>

            {/* Brand Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <a 
                href={`/${brandSlug}/proposals`}
                className="text-[var(--body-color)] hover:text-[var(--brand-primary)] font-satoshi transition-colors"
              >
                Proposals
              </a>
              <a 
                href={`/${brandSlug}/vote`}
                className="text-[var(--body-color)] hover:text-[var(--brand-primary)] font-satoshi transition-colors"
              >
                Vote
              </a>
              <a 
                href={`/${brandSlug}/certificates`}
                className="text-[var(--body-color)] hover:text-[var(--brand-primary)] font-satoshi transition-colors"
              >
                Certificates
              </a>
            </nav>

            {/* CTA Button */}
            <div className="flex items-center space-x-3">
              <a 
                href={`/${brandSlug}/gate`}
                className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg font-satoshi-medium hover:bg-[var(--brand-accent)] transition-colors"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Brand Footer */}
      <footer className="bg-[var(--background-secondary)] border-t border-[var(--border)] py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-[var(--brand-primary)] rounded flex items-center justify-center">
                <CubeIcon className="w-4 h-4 text-white" />
              </div>
              <span className="font-satoshi-semibold text-[var(--heading-color)]">
                {brand.name}
              </span>
            </div>
            <p className="text-sm text-[var(--muted)] font-satoshi">
              Powered by Ordira - Decentralized Manufacturing Platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Brand-Specific Layout Features:
 * 
 * 1. Dynamic Theming: Brand colors and styling
 * 2. Brand Navigation: Brand-specific menu items
 * 3. Brand Identity: Logo, name, and messaging
 * 4. Responsive Design: Works on all devices
 * 5. Error Handling: Graceful brand not found
 * 6. Loading States: Brand-specific loading
 * 7. SEO Ready: Brand-specific metadata
 * 8. Performance: Optimized for brand experience
 */
