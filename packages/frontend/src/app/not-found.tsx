// src/app/not-found.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/primitives/button';
import { Container } from '@/components/ui/layout/container';
import { 
  HomeIcon, 
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

/**
 * Custom 404 Not Found page for Ordira platform
 * 
 * This page is shown when:
 * - User visits a non-existent route
 * - A page is deleted or moved
 * - There's a typo in the URL
 * 
 * Features:
 * - Branded design consistent with Ordira theme
 * - Helpful navigation options
 * - Search functionality
 * - Analytics tracking for 404s
 * - Responsive design
 */
export default function NotFound() {
  const router = useRouter();

  // Handle back navigation
  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  // Handle search (you can implement search functionality later)
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('search') as string;
    
    if (query?.trim()) {
      // Redirect to search page or show search results
      // For now, redirect to homepage with search query
      router.push(`/?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <Container size="md" className="text-center">
        {/* Error Icon */}
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-[var(--primary)]/10 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-[var(--primary)]" />
          </div>
        </div>

        {/* Error Code */}
        <div className="mb-6">
          <h1 className="text-8xl font-satoshi-bold text-[var(--primary)] mb-2">
            404
          </h1>
          <h2 className="text-2xl font-satoshi-bold text-[var(--heading-color)] mb-3">
            Page Not Found
          </h2>
          <p className="text-[var(--body-color)] font-satoshi max-w-md mx-auto leading-relaxed">
            Sorry, we couldn't find the page you're looking for. It might have been moved, 
            deleted, or you may have entered the wrong URL.
          </p>
        </div>

        {/* Search Box */}
        <div className="mb-8 max-w-md mx-auto">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
              <input
                type="text"
                name="search"
                placeholder="Search for what you need..."
                className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 font-satoshi"
              />
            </div>
            <Button 
              type="submit" 
              variant="primary" 
              size="md"
              className="px-6"
            >
              Search
            </Button>
          </form>
        </div>

        {/* Navigation Options */}
        <div className="space-y-4">
          {/* Primary Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button
              onClick={handleGoBack}
              variant="outline"
              size="md"
              className="w-full sm:w-auto"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            
            <Link href="/">
              <Button variant="primary" size="md" className="w-full sm:w-auto">
                <HomeIcon className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          {/* Quick Links */}
          <div className="pt-6 border-t border-[var(--border)]">
            <p className="text-sm text-[var(--muted)] font-satoshi mb-4">
              Or try one of these popular pages:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link href="/pricing">
                <Button variant="ghost" size="sm">
                  Pricing
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="ghost" size="sm">
                  Register
                </Button>
              </Link>
              <Link href="/gate">
                <Button variant="ghost" size="sm">
                  Customer Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-12 pt-8 border-t border-[var(--border)]">
          <div className="bg-[var(--background-secondary)] rounded-xl p-6">
            <h3 className="text-lg font-satoshi-semibold text-[var(--heading-color)] mb-3">
              Still need help?
            </h3>
            <p className="text-[var(--body-color)] font-satoshi mb-4">
              If you believe this is an error or need assistance, please contact our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {/* Add contact/support links when available */}
              <Button variant="outline" size="sm" disabled>
                Contact Support
              </Button>
              <Button variant="ghost" size="sm" disabled>
                Report Issue
              </Button>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="mt-8 pt-6 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--muted)] font-satoshi">
            © 2025 Ordira - Decentralized Manufacturing
          </p>
        </div>
      </Container>
    </div>
  );
}
